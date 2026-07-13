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

        val categories = ledgerCategoryRepository.findByLedgerIdOrderBySortOrderAsc(ledgerId)
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

    fun createCategory(userId: Long, ledgerId: Long, name: String, type: CategoryType, categoryGroupId: Long): CategoryResponse {
        val ledger = ledgerRepository.findById(ledgerId).orElseThrow {
            NotFoundException("장부를 찾을 수 없습니다.")
        }
        // Verify user is a member
        ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")

        // Verify name uniqueness
        val existing = ledgerCategoryRepository.findByLedgerIdAndName(ledgerId, name)
        if (existing != null) {
            throw BadRequestException("이미 존재하는 카테고리 이름입니다.")
        }

        val group = ledgerCategoryGroupRepository.findById(categoryGroupId).orElseThrow {
            NotFoundException("대분류를 찾을 수 없습니다.")
        }
        if (group.ledger.id != ledgerId || group.type != type) {
            throw BadRequestException("카테고리 유형과 대분류가 일치하지 않습니다.")
        }

        val maxSortOrder = ledgerCategoryRepository.findByLedgerId(ledgerId)
            .maxOfOrNull { it.sortOrder } ?: 0

        val category = LedgerCategory(
            ledger = ledger,
            categoryGroup = group,
            name = name,
            type = type,
            sortOrder = maxSortOrder + 1,
            defaultCategory = false
        )
        val saved = ledgerCategoryRepository.save(category)
        return saved.toResponse()
    }

    fun updateCategory(userId: Long, categoryId: Long, name: String, categoryGroupId: Long): CategoryResponse {
        val category = ledgerCategoryRepository.findById(categoryId).orElseThrow {
            NotFoundException("카테고리를 찾을 수 없습니다.")
        }
        val ledgerId = category.ledger.id!!
        requireLedgerMember(userId, ledgerId)

        val existing = ledgerCategoryRepository.findByLedgerIdAndName(ledgerId, name)
        if (existing != null && existing.id != categoryId) {
            throw BadRequestException("이미 존재하는 카테고리 이름입니다.")
        }

        val group = ledgerCategoryGroupRepository.findById(categoryGroupId).orElseThrow {
            NotFoundException("대분류를 찾을 수 없습니다.")
        }
        if (group.ledger.id != ledgerId || group.type != category.type) {
            throw BadRequestException("카테고리 유형과 대분류가 일치하지 않습니다.")
        }

        category.name = name
        category.categoryGroup = group
        return category.toResponse()
    }

    fun deleteCategory(userId: Long, categoryId: Long) {
        val category = ledgerCategoryRepository.findById(categoryId).orElseThrow {
            NotFoundException("카테고리를 찾을 수 없습니다.")
        }
        requireLedgerMember(userId, category.ledger.id!!)

        if (
            transactionRepository.existsByCategoryId(categoryId) ||
            categoryBudgetRepository.existsByCategoryId(categoryId) ||
            fixedBudgetTemplateRepository.existsByCategoryId(categoryId) ||
            recurringTransactionTemplateRepository.existsByCategoryId(categoryId)
        ) {
            throw BadRequestException("거래, 예산 또는 반복 거래에 사용 중인 카테고리는 삭제할 수 없습니다.")
        }

        ledgerCategoryRepository.delete(category)
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
)

data class CategoryResponse(
    val id: Long,
    val ledgerId: Long,
    val name: String,
    val type: CategoryType,
    val categoryGroupId: Long,
    val categoryGroupName: String,
    val sortOrder: Int,
    val defaultCategory: Boolean
)

fun LedgerCategory.toResponse() = CategoryResponse(
    id = this.id!!,
    ledgerId = this.ledger.id!!,
    name = this.name,
    type = this.type,
    categoryGroupId = this.categoryGroup.id!!,
    categoryGroupName = this.categoryGroup.name,
    sortOrder = this.sortOrder,
    defaultCategory = this.defaultCategory
)

fun LedgerCategoryGroup.toResponse() = CategoryGroupResponse(
    id = this.id!!,
    ledgerId = this.ledger.id!!,
    name = this.name,
    type = this.type,
)
