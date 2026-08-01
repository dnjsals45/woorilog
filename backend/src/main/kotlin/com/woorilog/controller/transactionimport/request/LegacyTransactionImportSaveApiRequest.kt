package com.woorilog.controller.transactionimport.request

import com.woorilog.domain.category.entity.CategoryType
import jakarta.validation.Valid
import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.NotNull
import java.time.LocalDate

data class LegacyTransactionImportSaveApiRequest(
    @field:NotEmpty(message = "저장할 거래 후보는 하나 이상이어야 합니다.")
    @field:Valid val candidates: List<LegacyTransactionImportSaveCandidateApiRequest>,
)
data class LegacyTransactionImportSaveCandidateApiRequest(
    @field:NotNull val type: CategoryType,
    @field:NotNull val amount: Long,
    @field:NotNull val transactionDate: LocalDate,
    val categoryId: Long?,
    val memo: String?,
)
