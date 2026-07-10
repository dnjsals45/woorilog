package com.woorilog.service

import com.woorilog.domain.*
import com.woorilog.exception.ForbiddenException
import com.woorilog.exception.NotFoundException
import com.woorilog.exception.WoorilogException
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.YearMonth

@Service
@Transactional
class BudgetMonthService(
    private val ledgerRepository: LedgerRepository,
    private val ledgerMemberRepository: LedgerMemberRepository,
    private val ledgerMonthRepository: LedgerMonthRepository,
    private val categoryBudgetRepository: CategoryBudgetRepository,
    private val memberAllocationRepository: MemberAllocationRepository,
    private val ledgerCategoryRepository: LedgerCategoryRepository,
    private val userRepository: UserRepository
) {

    @Transactional(readOnly = true)
    fun getBudgetMonthSettings(userId: Long, ledgerId: Long, budgetMonth: String): BudgetMonthSettingsResponse {
        val ledger = ledgerRepository.findById(ledgerId).orElseThrow { NotFoundException("장부를 찾을 수 없습니다.") }
        ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")

        validateBudgetMonth(budgetMonth)

        val ledgerMonth = ledgerMonthRepository.findByLedgerIdAndBudgetMonth(ledgerId, budgetMonth)

        val categories = ledgerCategoryRepository.findByLedgerIdOrderBySortOrderAsc(ledgerId)
        val members = ledgerMemberRepository.findByLedgerId(ledgerId)

        val totalBudgetAmount = ledgerMonth?.totalBudgetAmount ?: 0L
        val closed = ledgerMonth?.closed ?: false

        val savedCategoryBudgets = ledgerMonth?.let {
            categoryBudgetRepository.findByLedgerMonthId(it.id!!).associateBy { cb -> cb.category.id!! }
        } ?: emptyMap()

        val savedMemberAllocations = ledgerMonth?.let {
            memberAllocationRepository.findByLedgerMonthId(it.id!!).associateBy { ma -> ma.user.id!! }
        } ?: emptyMap()

        val categoryBudgetDtos = categories.map { cat ->
            CategoryBudgetResponseDto(
                categoryId = cat.id!!,
                name = cat.name,
                type = cat.type,
                amount = savedCategoryBudgets[cat.id]?.amount ?: 0L
            )
        }

        val memberAllocationDtos = members.map { mem ->
            MemberAllocationResponseDto(
                userId = mem.user.id!!,
                nickname = mem.user.nickname,
                amount = savedMemberAllocations[mem.user.id]?.amount ?: 0L
            )
        }

        return BudgetMonthSettingsResponse(
            ledgerId = ledgerId,
            budgetMonth = budgetMonth,
            totalBudgetAmount = totalBudgetAmount,
            closed = closed,
            categoryBudgets = categoryBudgetDtos,
            memberAllocations = memberAllocationDtos
        )
    }

    @Transactional
    fun updateBudgetMonthSettings(
        userId: Long,
        ledgerId: Long,
        budgetMonth: String,
        request: UpdateBudgetMonthRequest
    ): BudgetMonthSettingsResponse {
        val ledger = ledgerRepository.findById(ledgerId).orElseThrow { NotFoundException("장부를 찾을 수 없습니다.") }
        ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")

        validateBudgetMonth(budgetMonth)

        if (request.totalBudgetAmount < 0) {
            throw WoorilogException("INVALID_REQUEST", "예산 금액은 음수일 수 없습니다.", HttpStatus.BAD_REQUEST)
        }
        request.categoryBudgets.forEach {
            if (it.amount < 0) {
                throw WoorilogException("INVALID_REQUEST", "카테고리 예산 금액은 음수일 수 없습니다.", HttpStatus.BAD_REQUEST)
            }
        }
        request.memberAllocations.forEach {
            if (it.amount < 0) {
                throw WoorilogException("INVALID_REQUEST", "멤버 할당 금액은 음수일 수 없습니다.", HttpStatus.BAD_REQUEST)
            }
        }

        var ledgerMonth = ledgerMonthRepository.findByLedgerIdAndBudgetMonth(ledgerId, budgetMonth)
        if (ledgerMonth != null) {
            if (ledgerMonth.closed) {
                throw WoorilogException("INVALID_REQUEST", "마감된 월은 수정할 수 없습니다.", HttpStatus.BAD_REQUEST)
            }
            ledgerMonth.totalBudgetAmount = request.totalBudgetAmount
        } else {
            ledgerMonth = LedgerMonth(
                ledger = ledger,
                budgetMonth = budgetMonth,
                totalBudgetAmount = request.totalBudgetAmount,
                closed = false
            )
        }
        ledgerMonth = ledgerMonthRepository.save(ledgerMonth)

        // Save category budgets
        categoryBudgetRepository.deleteByLedgerMonthId(ledgerMonth.id!!)
        categoryBudgetRepository.flush()
        val categoryBudgetsToSave = request.categoryBudgets.map { cb ->
            val category = ledgerCategoryRepository.findById(cb.categoryId).orElseThrow {
                NotFoundException("카테고리를 찾을 수 없습니다.")
            }
            if (category.ledger.id != ledgerId) {
                throw WoorilogException("INVALID_REQUEST", "해당 장부의 카테고리가 아닙니다.", HttpStatus.BAD_REQUEST)
            }
            CategoryBudget(
                ledgerMonth = ledgerMonth,
                category = category,
                amount = cb.amount
            )
        }
        categoryBudgetRepository.saveAll(categoryBudgetsToSave)

        // Save member allocations
        memberAllocationRepository.deleteByLedgerMonthId(ledgerMonth.id!!)
        memberAllocationRepository.flush()
        val memberAllocationsToSave = request.memberAllocations.map { ma ->
            val memberUser = userRepository.findById(ma.userId).orElseThrow {
                NotFoundException("사용자를 찾을 수 없습니다.")
            }
            val exists = ledgerMemberRepository.existsByLedgerIdAndUserId(ledgerId, ma.userId)
            if (!exists) {
                throw WoorilogException("INVALID_REQUEST", "해당 사용자는 장부의 멤버가 아닙니다.", HttpStatus.BAD_REQUEST)
            }
            MemberAllocation(
                ledgerMonth = ledgerMonth,
                user = memberUser,
                amount = ma.amount
            )
        }
        memberAllocationRepository.saveAll(memberAllocationsToSave)

        return getBudgetMonthSettings(userId, ledgerId, budgetMonth)
    }

    @Transactional
    fun closeBudgetMonth(userId: Long, ledgerId: Long, budgetMonth: String): BudgetMonthSettingsResponse {
        val ledger = ledgerRepository.findById(ledgerId).orElseThrow { NotFoundException("장부를 찾을 수 없습니다.") }
        ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")

        validateBudgetMonth(budgetMonth)

        var ledgerMonth = ledgerMonthRepository.findByLedgerIdAndBudgetMonth(ledgerId, budgetMonth)
        if (ledgerMonth == null) {
            ledgerMonth = LedgerMonth(
                ledger = ledger,
                budgetMonth = budgetMonth,
                totalBudgetAmount = 0L,
                closed = true
            )
        } else {
            ledgerMonth.closed = true
        }
        ledgerMonthRepository.save(ledgerMonth)

        return getBudgetMonthSettings(userId, ledgerId, budgetMonth)
    }

    @Transactional
    fun reopenBudgetMonth(userId: Long, ledgerId: Long, budgetMonth: String): BudgetMonthSettingsResponse {
        val ledger = ledgerRepository.findById(ledgerId).orElseThrow { NotFoundException("장부를 찾을 수 없습니다.") }
        ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")

        validateBudgetMonth(budgetMonth)

        var ledgerMonth = ledgerMonthRepository.findByLedgerIdAndBudgetMonth(ledgerId, budgetMonth)
        if (ledgerMonth == null) {
            ledgerMonth = LedgerMonth(
                ledger = ledger,
                budgetMonth = budgetMonth,
                totalBudgetAmount = 0L,
                closed = false
            )
        } else {
            ledgerMonth.closed = false
        }
        ledgerMonthRepository.save(ledgerMonth)

        return getBudgetMonthSettings(userId, ledgerId, budgetMonth)
    }

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

data class UpdateBudgetMonthRequest(
    val totalBudgetAmount: Long,
    val categoryBudgets: List<CategoryBudgetRequest>,
    val memberAllocations: List<MemberAllocationRequest>
)

data class CategoryBudgetRequest(
    val categoryId: Long,
    val amount: Long
)

data class MemberAllocationRequest(
    val userId: Long,
    val amount: Long
)

data class BudgetMonthSettingsResponse(
    val ledgerId: Long,
    val budgetMonth: String,
    val totalBudgetAmount: Long,
    val closed: Boolean,
    val categoryBudgets: List<CategoryBudgetResponseDto>,
    val memberAllocations: List<MemberAllocationResponseDto>
)

data class CategoryBudgetResponseDto(
    val categoryId: Long,
    val name: String,
    val type: CategoryType,
    val amount: Long
)

data class MemberAllocationResponseDto(
    val userId: Long,
    val nickname: String,
    val amount: Long
)
