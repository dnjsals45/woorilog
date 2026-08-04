package com.woorilog.application.budget.service

import com.woorilog.domain.budget.entity.FixedBudgetTemplate
import com.woorilog.domain.budget.repository.FixedBudgetTemplateRepository
import com.woorilog.domain.category.entity.CategoryType
import com.woorilog.domain.category.entity.LedgerCategory
import com.woorilog.domain.category.repository.LedgerCategoryRepository
import com.woorilog.domain.ledger.entity.Ledger
import com.woorilog.domain.ledger.repository.LedgerMemberRepository
import com.woorilog.domain.ledger.repository.LedgerRepository
import com.woorilog.application.budget.command.SaveFixedBudgetCommand
import com.woorilog.application.budget.result.FixedBudgetResult
import com.woorilog.application.budget.result.toResult
import com.woorilog.common.exception.BadRequestException
import com.woorilog.common.exception.ForbiddenException
import com.woorilog.common.exception.NotFoundException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class FixedBudgetService(
    private val ledgerRepository: LedgerRepository,
    private val ledgerMemberRepository: LedgerMemberRepository,
    private val ledgerCategoryRepository: LedgerCategoryRepository,
    private val fixedBudgetTemplateRepository: FixedBudgetTemplateRepository,
) {
    @Transactional(readOnly = true)
    fun getFixedBudgets(userId: Long, ledgerId: Long): List<FixedBudgetResult> {
        requireLedgerMember(userId, ledgerId)
        return fixedBudgetTemplateRepository.findByLedgerIdOrderByIdDesc(ledgerId).map { it.toResult() }
    }

    fun createFixedBudget(userId: Long, ledgerId: Long, request: SaveFixedBudgetCommand): FixedBudgetResult {
        val ledger = requireLedgerMember(userId, ledgerId)
        val category = resolveExpenseCategory(ledgerId, request.categoryId)
        validate(request)
        return fixedBudgetTemplateRepository.save(
            FixedBudgetTemplate(ledger, category, request.name, request.amount, request.active)
        ).toResult()
    }

    fun updateFixedBudget(userId: Long, fixedBudgetId: Long, request: SaveFixedBudgetCommand): FixedBudgetResult {
        val fixedBudget = fixedBudgetTemplateRepository.findByIdOrNull(fixedBudgetId) ?: throw NotFoundException("고정비 항목을 찾을 수 없습니다.")
        val ledgerId = fixedBudget.ledger.id!!
        requireLedgerMember(userId, ledgerId)
        val category = resolveExpenseCategory(ledgerId, request.categoryId)
        validate(request)
        fixedBudget.name = request.name
        fixedBudget.category = category
        fixedBudget.amount = request.amount
        fixedBudget.active = request.active
        return fixedBudget.toResult()
    }

    fun deleteFixedBudget(userId: Long, fixedBudgetId: Long) {
        val fixedBudget = fixedBudgetTemplateRepository.findByIdOrNull(fixedBudgetId) ?: throw NotFoundException("고정비 항목을 찾을 수 없습니다.")
        requireLedgerMember(userId, fixedBudget.ledger.id!!)
        fixedBudgetTemplateRepository.delete(fixedBudget)
    }

    private fun resolveExpenseCategory(ledgerId: Long, categoryId: Long): LedgerCategory {
        val category = ledgerCategoryRepository.findByIdOrNull(categoryId) ?: throw NotFoundException("카테고리를 찾을 수 없습니다.")
        if (category.ledger.id != ledgerId || category.type != CategoryType.EXPENSE) {
            throw BadRequestException("고정비는 해당 가계부의 지출 카테고리로만 설정할 수 있습니다.")
        }
        return category
    }

    private fun validate(request: SaveFixedBudgetCommand) {
        if (request.amount <= 0) throw BadRequestException("고정비 금액은 양수여야 합니다.")
    }

    private fun requireLedgerMember(userId: Long, ledgerId: Long): Ledger {
        val ledger = ledgerRepository.findByIdOrNull(ledgerId) ?: throw NotFoundException("가계부를 찾을 수 없습니다.")
        ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 가계부에 접근 권한이 없습니다.")
        return ledger
    }
}
