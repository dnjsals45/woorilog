package com.woorilog.service

import com.woorilog.domain.*
import com.woorilog.exception.ForbiddenException
import com.woorilog.exception.NotFoundException
import com.woorilog.exception.WoorilogException
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.YearMonth

@Service
@Transactional(readOnly = true)
class DashboardService(
    private val userRepository: UserRepository,
    private val ledgerRepository: LedgerRepository,
    private val ledgerMemberRepository: LedgerMemberRepository,
    private val ledgerMonthRepository: LedgerMonthRepository,
    private val transactionRepository: TransactionRepository,
    private val authService: AuthService,
    private val clock: Clock
) {

    fun getCurrentDashboardSummary(userId: Long, budgetMonth: String? = null): DashboardSummaryResponse {
        val user = userRepository.findById(userId).orElseThrow {
            NotFoundException("사용자를 찾을 수 없습니다.")
        }
        val currentLedger = authService.resolveCurrentLedger(user)
        val ledgerId = currentLedger.id!!

        val currentYearMonth = budgetMonth?.let(::validateBudgetMonth) ?: YearMonth.now(clock)
        val budgetMonthStr = currentYearMonth.toString()

        val ledgerMonth = ledgerMonthRepository.findByLedgerIdAndBudgetMonth(ledgerId, budgetMonthStr)
        val totalBudgetAmount = ledgerMonth?.totalBudgetAmount ?: 0L

        // Fetch transactions for the current month
        val startDate = currentYearMonth.atDay(1)
        val endDate = currentYearMonth.atEndOfMonth()
        val currentMonthTxs = transactionRepository.findByLedgerIdAndTransactionDateBetweenOrderByTransactionDateDescIdDesc(
            ledgerId, startDate, endDate
        )

        // Sum EXPENSE only
        val totalExpenseAmount = currentMonthTxs.filter { it.type == CategoryType.EXPENSE }
            .sumOf { it.amount }
        val remainingBudgetAmount = totalBudgetAmount - totalExpenseAmount

        // Recent transactions: up to 5
        val recentTransactions = currentMonthTxs.take(5).map { it.toResponse() }

        val categorySpending = categoryGroupSpending(currentMonthTxs)

        // Member spending: sum EXPENSE for all members
        val members = ledgerMemberRepository.findByLedgerId(ledgerId)
        val memberSpending = members.map { mem ->
            val spent = currentMonthTxs.filter { it.payer.id == mem.user.id && it.type == CategoryType.EXPENSE }
                .sumOf { it.amount }
            MemberSpendingDto(
                userId = mem.user.id!!,
                nickname = mem.user.nickname,
                totalSpent = spent
            )
        }

        return DashboardSummaryResponse(
            currentLedger = LedgerDto.from(currentLedger),
            budgetMonth = budgetMonthStr,
            totalBudgetAmount = totalBudgetAmount,
            totalExpenseAmount = totalExpenseAmount,
            remainingBudgetAmount = remainingBudgetAmount,
            recentTransactions = recentTransactions,
            categorySpending = categorySpending,
            memberSpending = memberSpending
        )
    }

    fun getMonthlyStatistics(
        userId: Long,
        ledgerId: Long,
        fromMonth: String,
        toMonth: String
    ): List<MonthlyStatisticsResponse> {
        val ledger = ledgerRepository.findById(ledgerId).orElseThrow {
            NotFoundException("장부를 찾을 수 없습니다.")
        }
        ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")

        val fromYearMonth = validateBudgetMonth(fromMonth)
        val toYearMonth = validateBudgetMonth(toMonth)

        if (fromYearMonth > toYearMonth) {
            throw WoorilogException("INVALID_REQUEST", "시작 월은 종료 월보다 이전이어야 합니다.", HttpStatus.BAD_REQUEST)
        }

        val months = mutableListOf<YearMonth>()
        var current = fromYearMonth
        while (!current.isAfter(toYearMonth)) {
            months.add(current)
            current = current.plusMonths(1)
        }

        return months.map { ym ->
            val startDate = ym.atDay(1)
            val endDate = ym.atEndOfMonth()
            val txs = transactionRepository.findByLedgerIdAndTransactionDateBetweenOrderByTransactionDateDescIdDesc(
                ledgerId, startDate, endDate
            )

            val totalExpense = txs.filter { it.type == CategoryType.EXPENSE }.sumOf { it.amount }
            val totalIncome = txs.filter { it.type == CategoryType.INCOME }.sumOf { it.amount }

            val ledgerMonth = ledgerMonthRepository.findByLedgerIdAndBudgetMonth(ledgerId, ym.toString())
            val totalBudget = ledgerMonth?.totalBudgetAmount ?: 0L

            MonthlyStatisticsResponse(
                month = ym.toString(),
                totalBudgetAmount = totalBudget,
                totalExpenseAmount = totalExpense,
                totalIncomeAmount = totalIncome,
                categorySpending = categoryGroupSpending(txs)
            )
        }
    }

    private fun categoryGroupSpending(transactions: List<Transaction>): List<CategorySpendingDto> = transactions
        .filter { it.type == CategoryType.EXPENSE }
        .groupBy { transaction ->
            val group = transaction.category?.categoryGroup
            (group?.id ?: 0L) to (group?.name ?: "미분류")
        }
        .map { (group, groupedTransactions) ->
            CategorySpendingDto(
                categoryGroupId = group.first,
                name = group.second,
                totalSpent = groupedTransactions.sumOf { it.amount },
            )
        }
        .sortedByDescending { it.totalSpent }

    private fun validateBudgetMonth(budgetMonth: String): YearMonth {
        if (!budgetMonth.matches(Regex("^\\d{4}-\\d{2}$"))) {
            throw WoorilogException("INVALID_REQUEST", "올바르지 않은 예산 월 형식입니다. (YYYY-MM)", HttpStatus.BAD_REQUEST)
        }
        return try {
            YearMonth.parse(budgetMonth)
        } catch (e: Exception) {
            throw WoorilogException("INVALID_REQUEST", "올바르지 않은 예산 월 형식입니다. (YYYY-MM)", HttpStatus.BAD_REQUEST)
        }
    }
}

data class DashboardSummaryResponse(
    val currentLedger: LedgerDto,
    val budgetMonth: String,
    val totalBudgetAmount: Long,
    val totalExpenseAmount: Long,
    val remainingBudgetAmount: Long,
    val recentTransactions: List<TransactionResponse>,
    val categorySpending: List<CategorySpendingDto>,
    val memberSpending: List<MemberSpendingDto>
)

data class CategorySpendingDto(
    val categoryGroupId: Long,
    val name: String,
    val totalSpent: Long
)

data class MemberSpendingDto(
    val userId: Long,
    val nickname: String,
    val totalSpent: Long
)

data class MonthlyStatisticsResponse(
    val month: String,
    val totalBudgetAmount: Long,
    val totalExpenseAmount: Long,
    val totalIncomeAmount: Long,
    val categorySpending: List<CategorySpendingDto>,
)
