package com.woorilog.application.transactionimport.result

import com.woorilog.domain.category.entity.CategoryType
import java.time.LocalDate

data class TransactionImportCandidateResult(
    val id: String,
    val type: CategoryType,
    val amount: Long,
    val transactionDate: LocalDate,
    val categoryId: Long?,
    val categoryName: String?,
    val memo: String,
    val rawText: String,
    val confidence: Double
)

data class TransactionImportPreviewResult(
    val candidates: List<TransactionImportCandidateResult>,
    val rejectedLines: Int
)

data class TransactionImportImagePreviewResult(
    val extractedText: String,
    val ocrEngine: String,
    val candidates: List<TransactionImportCandidateResult>,
    val rejectedLines: Int,
)
