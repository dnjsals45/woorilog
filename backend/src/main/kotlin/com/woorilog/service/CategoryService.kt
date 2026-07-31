package com.woorilog.service

import com.woorilog.domain.*
import com.woorilog.exception.BadRequestException
import com.woorilog.exception.ForbiddenException
import com.woorilog.exception.NotFoundException
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
    fun getCategories(userId: Long, ledgerId: Long): List<CategoryResponse> {
        val ledger = ledgerRepository.findById(ledgerId).orElseThrow {
            NotFoundException("장부를 찾을 수 없습니다.")
        }
        // Verify user is a member
        ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")

        val categories = ledgerCategoryRepository.findByLedgerIdOrderBySortOrderAsc(ledgerId).filter { it.active }
        return categories.map { it.toResponse() }
    }

    fun getCategoryGroups(userId: Long, ledgerId: Long): List<CategoryGroupResponse> {
        requireLedgerMember(userId, ledgerId)
        return ledgerCategoryGroupRepository.findByLedgerIdOrderByIdAsc(ledgerId).map { it.toResponse() }
    }

    fun createCategoryGroup(userId: Long, ledgerId: Long, name: String, type: CategoryType): CategoryGroupResponse {
        val ledger = requireLedgerMember(userId, ledgerId)
        if (ledgerCategoryGroupRepository.findByLedgerIdAndName(ledgerId, name) != null) {
            throw BadRequestException("이미 존재하는 대분류 이름입니다.")
        }
        return ledgerCategoryGroupRepository.save(LedgerCategoryGroup(ledger, name, type)).toResponse()
    }

    fun createCategory(
        userId: Long,
        ledgerId: Long,
        name: String,
        type: CategoryType?,
        categoryGroupId: Long?,
        groupCode: String? = null,
    ): CategoryResponse {
        val ledger = ledgerRepository.findById(ledgerId).orElseThrow {
            NotFoundException("장부를 찾을 수 없습니다.")
        }
        // Verify user is a member
        ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")

        val group = when {
            groupCode != null -> ledgerCategoryGroupRepository.findByLedgerIdAndCode(ledgerId, groupCode)
            categoryGroupId != null -> ledgerCategoryGroupRepository.findById(categoryGroupId).orElse(null)
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
        return saved.toResponse()
    }

    fun updateCategory(
        userId: Long,
        categoryId: Long,
        name: String,
        categoryGroupId: Long? = null,
        applyNameToPastTransactions: Boolean = false,
    ): CategoryResponse {
        val category = ledgerCategoryRepository.findById(categoryId).orElseThrow {
            NotFoundException("카테고리를 찾을 수 없습니다.")
        }
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

        val group = ledgerCategoryGroupRepository.findById(targetGroupId).orElseThrow {
            NotFoundException("대분류를 찾을 수 없습니다.")
        }
        if (group.ledger.id != ledgerId || group.type != category.type) {
            throw BadRequestException("카테고리 유형과 대분류가 일치하지 않습니다.")
        }

        category.name = normalizedName
        category.categoryGroup = group
        if (applyNameToPastTransactions) {
            transactionRepository.findByCategoryId(categoryId).forEach { it.categoryName = normalizedName }
        }
        return category.toResponse()
    }

    fun deleteCategory(userId: Long, categoryId: Long) {
        val category = ledgerCategoryRepository.findById(categoryId).orElseThrow {
            NotFoundException("카테고리를 찾을 수 없습니다.")
        }
        requireLedgerMember(userId, category.ledger.id!!)

        category.active = false
        ledgerCategoryRepository.save(category)
    }

    fun updateCategoryGroupVisibility(userId: Long, ledgerId: Long, groupCode: String, hidden: Boolean): CategoryGroupResponse {
        requireLedgerMember(userId, ledgerId)
        val group = ledgerCategoryGroupRepository.findByLedgerIdAndCode(ledgerId, groupCode)
            ?: throw NotFoundException("대분류를 찾을 수 없습니다.")
        group.hidden = hidden
        return ledgerCategoryGroupRepository.save(group).toResponse()
    }

    private fun requireLedgerMember(userId: Long, ledgerId: Long): Ledger {
        val ledger = ledgerRepository.findById(ledgerId).orElseThrow {
            NotFoundException("장부를 찾을 수 없습니다.")
        }
        ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")
        return ledger
    }
}

data class CategoryGroupResponse(
    val id: Long,
    val ledgerId: Long,
    val name: String,
    val type: CategoryType,
    val code: String,
    val hidden: Boolean,
    val sortOrder: Int,
)

data class CategoryResponse(
    val id: Long,
    val ledgerId: Long,
    val name: String,
    val type: CategoryType,
    val categoryGroupId: Long,
    val categoryGroupName: String,
    val sortOrder: Int,
    val defaultCategory: Boolean,
    val groupCode: String,
    val groupName: String,
    val active: Boolean,
)

fun LedgerCategory.toResponse() = CategoryResponse(
    id = this.id!!,
    ledgerId = this.ledger.id!!,
    name = this.name,
    type = this.type,
    categoryGroupId = this.categoryGroup.id!!,
    categoryGroupName = this.categoryGroup.name,
    sortOrder = this.sortOrder,
    defaultCategory = this.defaultCategory,
    groupCode = this.categoryGroup.code,
    groupName = this.categoryGroup.name,
    active = this.active,
)

fun LedgerCategoryGroup.toResponse() = CategoryGroupResponse(
    id = this.id!!,
    ledgerId = this.ledger.id!!,
    name = this.name,
    type = this.type,
    code = this.code,
    hidden = this.hidden,
    sortOrder = this.sortOrder,
)
