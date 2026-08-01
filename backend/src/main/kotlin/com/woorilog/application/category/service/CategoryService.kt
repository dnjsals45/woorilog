package com.woorilog.application.category.service

import com.woorilog.domain.budget.repository.CategoryBudgetRepository
import com.woorilog.domain.budget.repository.FixedBudgetTemplateRepository
import com.woorilog.domain.category.entity.CategoryType
import com.woorilog.domain.category.entity.LedgerCategory
import com.woorilog.domain.category.entity.LedgerCategoryGroup
import com.woorilog.domain.category.repository.LedgerCategoryGroupRepository
import com.woorilog.domain.category.repository.LedgerCategoryRepository
import com.woorilog.domain.ledger.entity.Ledger
import com.woorilog.domain.ledger.repository.LedgerMemberRepository
import com.woorilog.domain.ledger.repository.LedgerRepository
import com.woorilog.domain.scheduled.repository.RecurringTransactionTemplateRepository
import com.woorilog.domain.transaction.repository.TransactionRepository
import com.woorilog.application.category.result.CategoryGroupResult
import com.woorilog.application.category.result.CategoryResult
import com.woorilog.application.category.result.toResult
import com.woorilog.common.exception.BadRequestException
import com.woorilog.common.exception.ForbiddenException
import com.woorilog.common.exception.NotFoundException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class CategoryService(
    private val ledgerRepository: LedgerRepository,
    private val ledgerMemberRepository: LedgerMemberRepository,
    private val ledgerCategoryRepository: LedgerCategoryRepository,
    private val ledgerCategoryGroupRepository: LedgerCategoryGroupRepository,
    private val transactionRepository: TransactionRepository,
    private val categoryBudgetRepository: CategoryBudgetRepository,
    private val fixedBudgetTemplateRepository: FixedBudgetTemplateRepository,
    private val recurringTransactionTemplateRepository: RecurringTransactionTemplateRepository,
) {

    @Transactional(readOnly = true)
    fun getCategories(userId: Long, ledgerId: Long): List<CategoryResult> {
        val ledger = ledgerRepository.findByIdOrNull(ledgerId) ?: throw NotFoundException("장부를 찾을 수 없습니다.")
        // Verify user is a member
        ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")

        val categories = ledgerCategoryRepository.findByLedgerIdOrderBySortOrderAsc(ledgerId).filter { it.active }
        return categories.map { it.toResult() }
    }

    fun getCategoryGroups(userId: Long, ledgerId: Long): List<CategoryGroupResult> {
        requireLedgerMember(userId, ledgerId)
        return ledgerCategoryGroupRepository.findByLedgerIdOrderByIdAsc(ledgerId).map { it.toResult() }
    }

    fun createCategoryGroup(userId: Long, ledgerId: Long, name: String, type: CategoryType): CategoryGroupResult {
        val ledger = requireLedgerMember(userId, ledgerId)
        if (ledgerCategoryGroupRepository.findByLedgerIdAndName(ledgerId, name) != null) {
            throw BadRequestException("이미 존재하는 대분류 이름입니다.")
        }
        return ledgerCategoryGroupRepository.save(LedgerCategoryGroup(ledger, name, type)).toResult()
    }

    fun createCategory(
        userId: Long,
        ledgerId: Long,
        name: String,
        type: CategoryType?,
        categoryGroupId: Long?,
        groupCode: String? = null,
    ): CategoryResult {
        val ledger = ledgerRepository.findByIdOrNull(ledgerId) ?: throw NotFoundException("장부를 찾을 수 없습니다.")
        // Verify user is a member
        ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")

        val group = when {
            groupCode != null -> ledgerCategoryGroupRepository.findByLedgerIdAndCode(ledgerId, groupCode)
            categoryGroupId != null -> ledgerCategoryGroupRepository.findByIdOrNull(categoryGroupId)
            else -> null
        } ?: throw NotFoundException("대분류를 찾을 수 없습니다.")
        if (group.ledger.id != ledgerId || (type != null && group.type != type)) {
            throw BadRequestException("카테고리 유형과 대분류가 일치하지 않습니다.")
        }
        val normalizedName = name.trim()
        if (ledgerCategoryRepository.findByLedgerIdAndCategoryGroupIdAndNameAndActiveTrue(
                ledgerId,
                group.id!!,
                normalizedName,
            ) != null
        ) throw BadRequestException("이미 존재하는 카테고리 이름입니다.")

        val maxSortOrder = ledgerCategoryRepository.findByLedgerId(ledgerId)
            .maxOfOrNull { it.sortOrder } ?: 0

        val category = LedgerCategory(
            ledger = ledger,
            categoryGroup = group,
            name = normalizedName,
            type = group.type,
            sortOrder = maxSortOrder + 1,
            defaultCategory = false
        )
        val saved = ledgerCategoryRepository.save(category)
        return saved.toResult()
    }

    fun updateCategory(
        userId: Long,
        categoryId: Long,
        name: String,
        categoryGroupId: Long? = null,
        applyNameToPastTransactions: Boolean = false,
    ): CategoryResult {
        val category = ledgerCategoryRepository.findByIdOrNull(categoryId) ?: throw NotFoundException("카테고리를 찾을 수 없습니다.")
        val ledgerId = category.ledger.id!!
        requireLedgerMember(userId, ledgerId)

        val normalizedName = name.trim()
        val targetGroupId = categoryGroupId ?: category.categoryGroup.id!!
        val existing = ledgerCategoryRepository.findByLedgerIdAndCategoryGroupIdAndNameAndActiveTrue(
            ledgerId,
            targetGroupId,
            normalizedName,
        )
        if (existing != null && existing.id != categoryId) {
            throw BadRequestException("이미 존재하는 카테고리 이름입니다.")
        }

        val group = ledgerCategoryGroupRepository.findByIdOrNull(targetGroupId) ?: throw NotFoundException("대분류를 찾을 수 없습니다.")
        if (group.ledger.id != ledgerId || group.type != category.type) {
            throw BadRequestException("카테고리 유형과 대분류가 일치하지 않습니다.")
        }

        category.name = normalizedName
        category.categoryGroup = group
        if (applyNameToPastTransactions) {
            transactionRepository.findByCategoryId(categoryId).forEach { it.categoryName = normalizedName }
        }
        return category.toResult()
    }

    fun deleteCategory(userId: Long, categoryId: Long) {
        val category = ledgerCategoryRepository.findByIdOrNull(categoryId) ?: throw NotFoundException("카테고리를 찾을 수 없습니다.")
        requireLedgerMember(userId, category.ledger.id!!)

        category.active = false
        ledgerCategoryRepository.save(category)
    }

    fun updateCategoryGroupVisibility(userId: Long, ledgerId: Long, groupCode: String, hidden: Boolean): CategoryGroupResult {
        requireLedgerMember(userId, ledgerId)
        val group = ledgerCategoryGroupRepository.findByLedgerIdAndCode(ledgerId, groupCode)
            ?: throw NotFoundException("대분류를 찾을 수 없습니다.")
        group.hidden = hidden
        return ledgerCategoryGroupRepository.save(group).toResult()
    }

    private fun requireLedgerMember(userId: Long, ledgerId: Long): Ledger {
        val ledger = ledgerRepository.findByIdOrNull(ledgerId) ?: throw NotFoundException("장부를 찾을 수 없습니다.")
        ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")
        return ledger
    }
}
