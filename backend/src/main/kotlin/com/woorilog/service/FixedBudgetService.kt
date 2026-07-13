package com.woorilog.service

import com.woorilog.domain.*
import com.woorilog.exception.BadRequestException
import com.woorilog.exception.ForbiddenException
import com.woorilog.exception.NotFoundException
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
    fun getFixedBudgets(userId: Long, ledgerId: Long): List<FixedBudgetResponse> {
        requireLedgerMember(userId, ledgerId)
        return fixedBudgetTemplateRepository.findByLedgerIdOrderByIdDesc(ledgerId).map { it.toResponse() }
    }

    fun createFixedBudget(userId: Long, ledgerId: Long, request: SaveFixedBudgetRequest): FixedBudgetResponse {
        val ledger = requireLedgerMember(userId, ledgerId)
        val category = resolveExpenseCategory(ledgerId, request.categoryId)
        validate(request)
        return fixedBudgetTemplateRepository.save(
            FixedBudgetTemplate(ledger, category, request.name, request.amount, request.active)
        ).toResponse()
    }

    fun updateFixedBudget(userId: Long, fixedBudgetId: Long, request: SaveFixedBudgetRequest): FixedBudgetResponse {
        val fixedBudget = fixedBudgetTemplateRepository.findById(fixedBudgetId).orElseThrow {
            NotFoundException("고정비 항목을 찾을 수 없습니다.")
        }
        val ledgerId = fixedBudget.ledger.id!!
        requireLedgerMember(userId, ledgerId)
        val category = resolveExpenseCategory(ledgerId, request.categoryId)
        validate(request)
        fixedBudget.name = request.name
        fixedBudget.category = category
        fixedBudget.amount = request.amount
        fixedBudget.active = request.active
        return fixedBudget.toResponse()
    }

    fun deleteFixedBudget(userId: Long, fixedBudgetId: Long) {
        val fixedBudget = fixedBudgetTemplateRepository.findById(fixedBudgetId).orElseThrow {
            NotFoundException("고정비 항목을 찾을 수 없습니다.")
        }
        requireLedgerMember(userId, fixedBudget.ledger.id!!)
        fixedBudgetTemplateRepository.delete(fixedBudget)
    }

    private fun resolveExpenseCategory(ledgerId: Long, categoryId: Long): LedgerCategory {
        val category = ledgerCategoryRepository.findById(categoryId).orElseThrow {
            NotFoundException("카테고리를 찾을 수 없습니다.")
        }
        if (category.ledger.id != ledgerId || category.type != CategoryType.EXPENSE) {
            throw BadRequestException("고정비는 해당 장부의 지출 카테고리로만 설정할 수 있습니다.")
        }
        return category
    }

    private fun validate(request: SaveFixedBudgetRequest) {
        if (request.amount <= 0) throw BadRequestException("고정비 금액은 양수여야 합니다.")
    }

    private fun requireLedgerMember(userId: Long, ledgerId: Long): Ledger {
        val ledger = ledgerRepository.findById(ledgerId).orElseThrow { NotFoundException("장부를 찾을 수 없습니다.") }
        ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")
        return ledger
    }
}

data class SaveFixedBudgetRequest(
    val name: String,
    val categoryId: Long,
    val amount: Long,
    val active: Boolean = true,
)

data class FixedBudgetResponse(
    val id: Long,
    val ledgerId: Long,
    val name: String,
    val categoryId: Long,
    val categoryName: String,
    val amount: Long,
    val active: Boolean,
)

fun FixedBudgetTemplate.toResponse() = FixedBudgetResponse(
    id = id!!,
    ledgerId = ledger.id!!,
    name = name,
    categoryId = category.id!!,
    categoryName = category.name,
    amount = amount,
    active = active,
)
