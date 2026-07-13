package com.woorilog.service

import com.woorilog.domain.*
import com.woorilog.exception.BadRequestException
import com.woorilog.exception.ForbiddenException
import com.woorilog.exception.NotFoundException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.YearMonth

@Service
@Transactional
class SettlementService(
    private val ledgerRepository: LedgerRepository,
    private val ledgerMemberRepository: LedgerMemberRepository,
    private val ledgerMonthRepository: LedgerMonthRepository,
    private val memberAllocationRepository: MemberAllocationRepository,
    private val transactionRepository: TransactionRepository,
    private val settlementPaymentRepository: SettlementPaymentRepository,
    private val userRepository: UserRepository,
    private val clock: Clock,
) {
    @Transactional(readOnly = true)
    fun getSummary(userId: Long, ledgerId: Long, budgetMonth: String): SettlementSummaryResponse {
        requireMember(userId, ledgerId)
        val yearMonth = parseMonth(budgetMonth)
        val members = ledgerMemberRepository.findByLedgerId(ledgerId)
        val expenses = transactionRepository
            .findByLedgerIdAndTransactionDateBetweenOrderByTransactionDateDescIdDesc(
                ledgerId,
                yearMonth.atDay(1),
                yearMonth.atEndOfMonth(),
            )
            .filter { it.type == CategoryType.EXPENSE }
        val totalExpense = expenses.sumOf { it.amount }
        val paidByUser = expenses.groupBy { it.payer.id!! }.mapValues { (_, items) -> items.sumOf { it.amount } }
        val ledgerMonth = ledgerMonthRepository.findByLedgerIdAndBudgetMonth(ledgerId, budgetMonth)
        val allocations = ledgerMonth?.let { memberAllocationRepository.findByLedgerMonthId(it.id!!) }.orEmpty()
            .associate { it.user.id!! to it.amount }
        val owedByUser = calculateOwed(members.map { it.user.id!! }, allocations, totalExpense)
        val balances = members.associate { member ->
            val memberId = member.user.id!!
            memberId to (paidByUser[memberId] ?: 0L) - (owedByUser[memberId] ?: 0L)
        }.toMutableMap()
        val payments = settlementPaymentRepository
            .findByLedgerIdAndBudgetMonthOrderBySettledAtDescIdDesc(ledgerId, budgetMonth)
        payments.forEach { payment ->
            balances[payment.fromUser.id!!] = balances.getValue(payment.fromUser.id!!) + payment.amount
            balances[payment.toUser.id!!] = balances.getValue(payment.toUser.id!!) - payment.amount
        }
        val transfers = calculateTransfers(members.associate { it.user.id!! to it.user.nickname }, balances)

        return SettlementSummaryResponse(
            ledgerId = ledgerId,
            budgetMonth = budgetMonth,
            totalExpenseAmount = totalExpense,
            members = members.map { member ->
                val memberId = member.user.id!!
                SettlementMemberResponse(
                    userId = memberId,
                    nickname = member.user.nickname,
                    paidAmount = paidByUser[memberId] ?: 0L,
                    owedAmount = owedByUser[memberId] ?: 0L,
                    balanceAmount = balances[memberId] ?: 0L,
                )
            },
            transfers = transfers,
            payments = payments.map(SettlementPaymentResponse::from),
        )
    }

    fun recordPayment(
        userId: Long,
        ledgerId: Long,
        budgetMonth: String,
        fromUserId: Long,
        toUserId: Long,
        amount: Long,
    ): SettlementSummaryResponse {
        val ledger = requireMember(userId, ledgerId)
        parseMonth(budgetMonth)
        if (amount <= 0) throw BadRequestException("정산 금액은 양수여야 합니다.")
        if (fromUserId == toUserId) throw BadRequestException("보내는 사람과 받는 사람은 달라야 합니다.")
        val current = getSummary(userId, ledgerId, budgetMonth)
        val suggested = current.transfers.firstOrNull { it.fromUserId == fromUserId && it.toUserId == toUserId }
            ?: throw BadRequestException("현재 필요한 정산 방향과 일치하지 않습니다.")
        if (amount > suggested.amount) throw BadRequestException("남은 정산 금액보다 크게 기록할 수 없습니다.")
        val fromUser = userRepository.findById(fromUserId).orElseThrow { NotFoundException("보내는 사용자를 찾을 수 없습니다.") }
        val toUser = userRepository.findById(toUserId).orElseThrow { NotFoundException("받는 사용자를 찾을 수 없습니다.") }
        val recordedBy = userRepository.findById(userId).orElseThrow { ForbiddenException("사용자를 찾을 수 없습니다.") }
        settlementPaymentRepository.save(
            SettlementPayment(
                ledger = ledger,
                budgetMonth = budgetMonth,
                fromUser = fromUser,
                toUser = toUser,
                recordedBy = recordedBy,
                amount = amount,
                settledAt = clock.instant(),
            )
        )
        return getSummary(userId, ledgerId, budgetMonth)
    }

    fun deletePayment(userId: Long, paymentId: Long) {
        val payment = settlementPaymentRepository.findById(paymentId).orElseThrow { NotFoundException("정산 기록을 찾을 수 없습니다.") }
        val member = ledgerMemberRepository.findByLedgerIdAndUserId(payment.ledger.id!!, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")
        if (payment.recordedBy.id != userId && member.role != LedgerRole.OWNER) {
            throw ForbiddenException("정산 기록을 취소할 권한이 없습니다.")
        }
        settlementPaymentRepository.delete(payment)
    }

    private fun requireMember(userId: Long, ledgerId: Long): Ledger {
        val ledger = ledgerRepository.findById(ledgerId).orElseThrow { NotFoundException("장부를 찾을 수 없습니다.") }
        ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")
        return ledger
    }

    private fun parseMonth(value: String): YearMonth = try {
        YearMonth.parse(value)
    } catch (_: Exception) {
        throw BadRequestException("올바르지 않은 예산 월 형식입니다. (YYYY-MM)")
    }

    private fun calculateOwed(memberIds: List<Long>, allocations: Map<Long, Long>, totalExpense: Long): Map<Long, Long> {
        if (memberIds.isEmpty()) return emptyMap()
        val allocationTotal = memberIds.sumOf { allocations[it] ?: 0L }
        val result = linkedMapOf<Long, Long>()
        var assigned = 0L
        memberIds.forEachIndexed { index, memberId ->
            val owed = if (index == memberIds.lastIndex) {
                totalExpense - assigned
            } else if (allocationTotal > 0) {
                totalExpense * (allocations[memberId] ?: 0L) / allocationTotal
            } else {
                totalExpense / memberIds.size
            }
            result[memberId] = owed
            assigned += owed
        }
        return result
    }

    private fun calculateTransfers(nicknames: Map<Long, String>, balances: Map<Long, Long>): List<SettlementTransferResponse> {
        val debtors = balances.filterValues { it < 0 }.map { MutableBalance(it.key, -it.value) }.toMutableList()
        val creditors = balances.filterValues { it > 0 }.map { MutableBalance(it.key, it.value) }.toMutableList()
        val result = mutableListOf<SettlementTransferResponse>()
        var debtorIndex = 0
        var creditorIndex = 0
        while (debtorIndex < debtors.size && creditorIndex < creditors.size) {
            val debtor = debtors[debtorIndex]
            val creditor = creditors[creditorIndex]
            val amount = minOf(debtor.amount, creditor.amount)
            if (amount > 0) result += SettlementTransferResponse(
                fromUserId = debtor.userId,
                fromNickname = nicknames.getValue(debtor.userId),
                toUserId = creditor.userId,
                toNickname = nicknames.getValue(creditor.userId),
                amount = amount,
            )
            debtor.amount -= amount
            creditor.amount -= amount
            if (debtor.amount == 0L) debtorIndex++
            if (creditor.amount == 0L) creditorIndex++
        }
        return result
    }

    private data class MutableBalance(val userId: Long, var amount: Long)
}

data class SettlementSummaryResponse(
    val ledgerId: Long,
    val budgetMonth: String,
    val totalExpenseAmount: Long,
    val members: List<SettlementMemberResponse>,
    val transfers: List<SettlementTransferResponse>,
    val payments: List<SettlementPaymentResponse>,
)

data class SettlementMemberResponse(val userId: Long, val nickname: String, val paidAmount: Long, val owedAmount: Long, val balanceAmount: Long)
data class SettlementTransferResponse(val fromUserId: Long, val fromNickname: String, val toUserId: Long, val toNickname: String, val amount: Long)
data class SettlementPaymentResponse(val id: Long, val fromUserId: Long, val fromNickname: String, val toUserId: Long, val toNickname: String, val amount: Long, val settledAt: java.time.Instant) {
    companion object {
        fun from(payment: SettlementPayment) = SettlementPaymentResponse(
            id = payment.id!!,
            fromUserId = payment.fromUser.id!!,
            fromNickname = payment.fromUser.nickname,
            toUserId = payment.toUser.id!!,
            toNickname = payment.toUser.nickname,
            amount = payment.amount,
            settledAt = payment.settledAt,
        )
    }
}
