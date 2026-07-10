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
    private val ledgerCategoryRepository: LedgerCategoryRepository
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

    fun createCategory(userId: Long, ledgerId: Long, name: String, type: CategoryType): CategoryResponse {
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

        val maxSortOrder = ledgerCategoryRepository.findByLedgerId(ledgerId)
            .maxOfOrNull { it.sortOrder } ?: 0

        val category = LedgerCategory(
            ledger = ledger,
            name = name,
            type = type,
            sortOrder = maxSortOrder + 1,
            defaultCategory = false
        )
        val saved = ledgerCategoryRepository.save(category)
        return saved.toResponse()
    }
}

data class CategoryResponse(
    val id: Long,
    val ledgerId: Long,
    val name: String,
    val type: CategoryType,
    val sortOrder: Int,
    val defaultCategory: Boolean
)

fun LedgerCategory.toResponse() = CategoryResponse(
    id = this.id!!,
    ledgerId = this.ledger.id!!,
    name = this.name,
    type = this.type,
    sortOrder = this.sortOrder,
    defaultCategory = this.defaultCategory
)
