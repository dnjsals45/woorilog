package com.woorilog.application.transactionimport.result

import com.woorilog.application.transaction.result.TransactionResult
import com.woorilog.domain.transaction.entity.BudgetSource
import com.woorilog.domain.transactionimport.entity.ImportSourceType
import java.time.Instant
import java.time.LocalDate

data class ImportPreviewResult(val sessionId: Long, val expiresAt: Instant, val omittedCount: Int, val candidates: List<ImportCandidatePreviewResult>)
data class ImportCandidatePreviewResult(
    val candidateId: Long,
    val amount: Long,
    val occurredOn: LocalDate,
    val merchant: String,
    val suggestedCategoryId: Long?,
    val defaultBudgetSource: BudgetSource?,
    val duplicateSuspected: Boolean,
    val duplicateReason: String?,
    val duplicateTransactionId: Long?,
    val selectedByDefault: Boolean,
    val sourceType: ImportSourceType,
)
data class SaveImportSessionResult(val created: List<SavedImportCandidateResult>)
data class SavedImportCandidateResult(val candidateId: Long, val transaction: TransactionResult)
