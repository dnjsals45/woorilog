package com.woorilog.controller.transactionimport.response

import com.woorilog.application.transactionimport.result.ImportCandidatePreviewResult
import com.woorilog.application.transactionimport.result.ImportPreviewResult
import com.woorilog.application.transactionimport.result.SaveImportSessionResult
import com.woorilog.application.transactionimport.result.SavedImportCandidateResult
import com.woorilog.controller.transaction.response.TransactionResponse
import com.woorilog.controller.transaction.response.toResponse
import com.woorilog.domain.transaction.entity.BudgetSource
import java.time.Instant
import java.time.LocalDate

data class ImportPreviewResponse(val sessionId: Long, val expiresAt: Instant, val omittedCount: Int, val candidates: List<ImportCandidatePreviewResponse>)
data class ImportCandidatePreviewResponse(
    val candidateId: Long,
    val amount: Long,
    val occurredOn: LocalDate,
    val merchant: String,
    val suggestedCategoryId: Long?,
    val defaultBudgetSource: BudgetSource?,
    val duplicateSuspected: Boolean,
    val duplicateReason: String?,
    val selectedByDefault: Boolean,
)
data class SaveImportSessionResponse(val created: List<SavedImportCandidateResponse>)
data class SavedImportCandidateResponse(val candidateId: Long, val transaction: TransactionResponse)

fun ImportCandidatePreviewResult.toResponse() = ImportCandidatePreviewResponse(
    candidateId, amount, occurredOn, merchant, suggestedCategoryId, defaultBudgetSource, duplicateSuspected, duplicateReason, selectedByDefault,
)

fun ImportPreviewResult.toResponse() = ImportPreviewResponse(
    sessionId = sessionId,
    expiresAt = expiresAt,
    omittedCount = omittedCount,
    candidates = candidates.map { it.toResponse() },
)

fun SavedImportCandidateResult.toResponse() = SavedImportCandidateResponse(candidateId, transaction.toResponse())

fun SaveImportSessionResult.toResponse() = SaveImportSessionResponse(created.map { it.toResponse() })
