package com.woorilog.application.budget.service

import com.woorilog.domain.auth.repository.UserRepository
import com.woorilog.domain.budget.entity.CategoryBudget
import com.woorilog.domain.budget.entity.MemberAllocation
import com.woorilog.domain.budget.repository.CategoryBudgetRepository
import com.woorilog.domain.budget.repository.FixedBudgetTemplateRepository
import com.woorilog.domain.budget.repository.MemberAllocationRepository
import com.woorilog.domain.category.entity.CategoryType
import com.woorilog.domain.category.repository.LedgerCategoryRepository
import com.woorilog.domain.ledger.entity.LedgerMonth
import com.woorilog.domain.ledger.entity.LedgerType
import com.woorilog.domain.ledger.repository.LedgerMemberRepository
import com.woorilog.domain.ledger.repository.LedgerMonthRepository
import com.woorilog.domain.ledger.repository.LedgerRepository
import com.woorilog.domain.notification.entity.NotificationType
import com.woorilog.application.notification.service.NotificationService
import com.woorilog.application.budget.command.UpdateBudgetMonthCommand
import com.woorilog.application.budget.result.BudgetMonthCategoryBudgetResult
import com.woorilog.application.budget.result.BudgetMonthMemberAllocationResult
import com.woorilog.application.budget.result.BudgetMonthSettingsResult
import com.woorilog.common.exception.ForbiddenException
import com.woorilog.common.exception.NotFoundException
import com.woorilog.common.exception.WoorilogException
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
    private val fixedBudgetTemplateRepository: FixedBudgetTemplateRepository,
    private val userRepository: UserRepository,
    private val notificationService: NotificationService,
) {

    @Transactional(readOnly = true)
    fun getBudgetMonthSettings(userId: Long, ledgerId: Long, budgetMonth: String): BudgetMonthSettingsResult {
        val ledger = ledgerRepository.findByIdOrNull(ledgerId) ?: throw NotFoundException("가계부를 찾을 수 없습니다.")
        ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 가계부에 접근 권한이 없습니다.")

        validateBudgetMonth(budgetMonth)

        val ledgerMonth = ledgerMonthRepository.findByLedgerIdAndBudgetMonth(ledgerId, budgetMonth)

        val categories = ledgerCategoryRepository.findByLedgerIdOrderBySortOrderAsc(ledgerId)
        val members = ledgerMemberRepository.findByLedgerId(ledgerId)

        val totalBudgetAmount = ledgerMonth?.totalBudgetAmount ?: 0L
        val closed = ledgerMonth?.closed ?: false
        val supportsCategoryBudgets = ledger.type == LedgerType.PERSONAL

        val savedCategoryBudgets = ledgerMonth?.let {
            categoryBudgetRepository.findByLedgerMonthId(it.id!!).associateBy { cb -> cb.category.id!! }
        } ?: emptyMap()

        val savedMemberAllocations = ledgerMonth?.let {
            memberAllocationRepository.findByLedgerMonthId(it.id!!).associateBy { ma -> ma.user.id!! }
        } ?: emptyMap()

        val fixedBudgets = if (supportsCategoryBudgets) {
            fixedBudgetTemplateRepository.findByLedgerIdAndActiveTrue(ledgerId)
        } else {
            emptyList()
        }
        val fixedBudgetByCategoryId = fixedBudgets.groupBy { it.category.id!! }
            .mapValues { (_, templates) -> templates.sumOf { it.amount } }

        val categoryBudgetDtos = if (supportsCategoryBudgets) {
            categories.map { cat ->
                BudgetMonthCategoryBudgetResult(
                    categoryId = cat.id!!,
                    name = cat.name,
                    type = cat.type,
                    categoryGroupId = cat.categoryGroup.id!!,
                    categoryGroupName = cat.categoryGroup.name,
                    amount = savedCategoryBudgets[cat.id]?.amount
                        ?: if (ledgerMonth == null) fixedBudgetByCategoryId[cat.id] ?: 0L else 0L
                )
            }
        } else {
            emptyList()
        }

        val memberAllocationDtos = members.map { mem ->
            BudgetMonthMemberAllocationResult(
                userId = mem.user.id!!,
                nickname = mem.user.nickname,
                amount = savedMemberAllocations[mem.user.id]?.amount ?: 0L
            )
        }

        return BudgetMonthSettingsResult(
            ledgerId = ledgerId,
            budgetMonth = budgetMonth,
            totalBudgetAmount = totalBudgetAmount,
            fixedBudgetTotalAmount = fixedBudgets.sumOf { it.amount },
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
        request: UpdateBudgetMonthCommand
    ): BudgetMonthSettingsResult {
        val ledger = ledgerRepository.findByIdOrNull(ledgerId) ?: throw NotFoundException("가계부를 찾을 수 없습니다.")
        ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 가계부에 접근 권한이 없습니다.")

        validateBudgetMonth(budgetMonth)

        if (request.totalBudgetAmount < 0) {
            throw WoorilogException("INVALID_REQUEST", "예산 금액은 음수일 수 없습니다.", HttpStatus.BAD_REQUEST)
        }
        if (ledger.type == LedgerType.PERSONAL) {
            request.categoryBudgets.forEach {
                if (it.amount < 0) {
                    throw WoorilogException("INVALID_REQUEST", "카테고리 예산 금액은 음수일 수 없습니다.", HttpStatus.BAD_REQUEST)
                }
            }
        }
        request.memberAllocations.forEach {
            if (it.amount < 0) {
                throw WoorilogException("INVALID_REQUEST", "멤버별 예산 금액은 음수일 수 없습니다.", HttpStatus.BAD_REQUEST)
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
        val categoryBudgetsToSave = if (ledger.type == LedgerType.PERSONAL) {
            request.categoryBudgets.map { cb ->
                val category = ledgerCategoryRepository.findByIdOrNull(cb.categoryId) ?: throw NotFoundException("카테고리를 찾을 수 없습니다.")
                if (category.ledger.id != ledgerId) {
                    throw WoorilogException("INVALID_REQUEST", "해당 가계부의 카테고리가 아닙니다.", HttpStatus.BAD_REQUEST)
                }
                CategoryBudget(
                    ledgerMonth = ledgerMonth,
                    category = category,
                    amount = cb.amount
                )
            }
        } else {
            emptyList()
        }
        categoryBudgetRepository.saveAll(categoryBudgetsToSave)

        // Save member allocations
        memberAllocationRepository.deleteByLedgerMonthId(ledgerMonth.id!!)
        memberAllocationRepository.flush()
        val memberAllocationsToSave = request.memberAllocations.map { ma ->
            val memberUser = userRepository.findByIdOrNull(ma.userId) ?: throw NotFoundException("사용자를 찾을 수 없습니다.")
            val exists = ledgerMemberRepository.existsByLedgerIdAndUserId(ledgerId, ma.userId)
            if (!exists) {
                throw WoorilogException("INVALID_REQUEST", "해당 사용자는 가계부의 멤버가 아닙니다.", HttpStatus.BAD_REQUEST)
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
    fun closeBudgetMonth(userId: Long, ledgerId: Long, budgetMonth: String): BudgetMonthSettingsResult {
        val ledger = ledgerRepository.findByIdOrNull(ledgerId) ?: throw NotFoundException("가계부를 찾을 수 없습니다.")
        ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 가계부에 접근 권한이 없습니다.")

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
        notificationService.notifyLedgerMembers(
            ledgerId,
            NotificationType.MONTH_CLOSED,
            "${budgetMonth} 월이 마감되었습니다.",
            "마감된 월의 예산과 거래는 다시 열기 전까지 변경할 수 없습니다.",
            "/ledgers/$ledgerId/months/$budgetMonth",
            "month-closed-$ledgerId-$budgetMonth",
        )

        return getBudgetMonthSettings(userId, ledgerId, budgetMonth)
    }

    @Transactional
    fun reopenBudgetMonth(userId: Long, ledgerId: Long, budgetMonth: String): BudgetMonthSettingsResult {
        val ledger = ledgerRepository.findByIdOrNull(ledgerId) ?: throw NotFoundException("가계부를 찾을 수 없습니다.")
        ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 가계부에 접근 권한이 없습니다.")

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
