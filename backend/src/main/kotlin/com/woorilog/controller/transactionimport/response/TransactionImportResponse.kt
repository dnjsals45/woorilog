package com.woorilog.controller.transactionimport.response

import com.woorilog.application.transactionimport.result.TransactionImportCandidateResult
import com.woorilog.application.transactionimport.result.TransactionImportImagePreviewResult
import com.woorilog.application.transactionimport.result.TransactionImportPreviewResult
import com.woorilog.domain.category.entity.CategoryType
import java.time.LocalDate

data class TransactionImportCandidateResponse(
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

fun TransactionImportCandidateResult.toResponse() = TransactionImportCandidateResponse(
    id, type, amount, transactionDate, categoryId, categoryName, memo, rawText, confidence,
)

data class TransactionImportPreviewResponse(
    val candidates: List<TransactionImportCandidateResponse>,
    val rejectedLines: Int
)

fun TransactionImportPreviewResult.toResponse() = TransactionImportPreviewResponse(
    candidates = candidates.map { it.toResponse() },
    rejectedLines = rejectedLines,
)

data class TransactionImportImagePreviewResponse(
    val extractedText: String,
    val ocrEngine: String,
    val candidates: List<TransactionImportCandidateResponse>,
    val rejectedLines: Int,
)

fun TransactionImportImagePreviewResult.toResponse() = TransactionImportImagePreviewResponse(
    extractedText = extractedText,
    ocrEngine = ocrEngine,
    candidates = candidates.map { it.toResponse() },
    rejectedLines = rejectedLines,
)
