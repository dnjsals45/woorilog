package com.woorilog.application.category.service

import com.woorilog.domain.category.entity.CategoryType
import com.woorilog.domain.category.entity.LedgerCategory
import com.woorilog.domain.category.entity.LedgerCategoryGroup
import com.woorilog.domain.category.repository.LedgerCategoryGroupRepository
import com.woorilog.domain.category.repository.LedgerCategoryRepository
import com.woorilog.domain.ledger.entity.Ledger
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class LedgerCategorySeedingService(
    private val ledgerCategoryRepository: LedgerCategoryRepository,
    private val ledgerCategoryGroupRepository: LedgerCategoryGroupRepository,
) {
    fun seedDefaultCategories(ledger: Ledger) {
        if (ledgerCategoryGroupRepository.existsByLedgerId(ledger.id!!)) return

        val groups = defaultGroups.associate { spec ->
            spec.code to ledgerCategoryGroupRepository.save(
                LedgerCategoryGroup(
                    ledger = ledger,
                    name = spec.name,
                    type = spec.type,
                    code = spec.code,
                    hidden = false,
                    sortOrder = spec.sortOrder,
                )
            )
        }

        var categorySortOrder = 1
        defaultGroups.forEach { spec ->
            val group = groups.getValue(spec.code)
            spec.categories.forEach { name ->
                ledgerCategoryRepository.save(
                    LedgerCategory(
                        ledger = ledger,
                        categoryGroup = group,
                        name = name,
                        type = spec.type,
                        sortOrder = categorySortOrder++,
                        defaultCategory = true,
                        active = true,
                    )
                )
            }
        }
    }

    private data class GroupSpec(
        val code: String,
        val name: String,
        val type: CategoryType,
        val sortOrder: Int,
        val categories: List<String>,
    )

    private companion object {
        val defaultGroups = listOf(
            GroupSpec("FOOD", "식비", CategoryType.EXPENSE, 1, listOf("장보기", "외식", "배달", "카페·간식")),
            GroupSpec("HOUSING", "주거·생활", CategoryType.EXPENSE, 2, listOf("월세·관리비", "공과금", "통신", "생활용품")),
            GroupSpec("TRANSPORT", "교통·차량", CategoryType.EXPENSE, 3, listOf("대중교통", "택시", "주유", "주차·통행", "차량관리")),
            GroupSpec("SHOPPING", "쇼핑·미용", CategoryType.EXPENSE, 4, listOf("의류", "미용", "전자기기", "기타 쇼핑")),
            GroupSpec("HEALTH", "건강", CategoryType.EXPENSE, 5, listOf("병원", "약국", "운동")),
            GroupSpec("LEISURE", "여가", CategoryType.EXPENSE, 6, listOf("문화", "취미", "여행", "모임")),
            GroupSpec("EDUCATION", "교육", CategoryType.EXPENSE, 7, listOf("도서", "강의·학원")),
            GroupSpec("FINANCE", "금융", CategoryType.EXPENSE, 8, listOf("보험", "세금", "이자·수수료")),
            GroupSpec("RELATIONSHIPS", "관계", CategoryType.EXPENSE, 9, listOf("경조사", "선물")),
            GroupSpec("PETS", "반려동물", CategoryType.EXPENSE, 10, listOf("사료·용품", "동물병원")),
            GroupSpec("OTHER_EXPENSE", "기타", CategoryType.EXPENSE, 11, listOf("기타 지출")),
            GroupSpec("EARNED_INCOME", "근로소득", CategoryType.INCOME, 12, listOf("급여", "상여")),
            GroupSpec("OTHER_INCOME", "기타수입", CategoryType.INCOME, 13, listOf("용돈", "금융수입", "중고거래", "기타 수입")),
            GroupSpec("TRANSFER", "이체", CategoryType.TRANSFER, 14, listOf("내 계좌 간 이체", "송금", "입금")),
        )
    }
}
