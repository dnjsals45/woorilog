package com.woorilog.application.transactionimport.command

import com.woorilog.domain.transaction.entity.BudgetSource
import com.woorilog.domain.transaction.entity.V1PaymentMethod
import java.time.LocalDate

data class TransactionImportPreviewCommand(
    val text: String,
    val transactionDate: LocalDate?,
    val ocrEngine: String?,
    val sourceName: String?
)

data class SaveImportSessionCommand(val sessionId: Long, val candidates: List<SaveImportCandidateCommand>)
data class SaveImportCandidateCommand(
    val candidateId: Long,
    val amount: Long,
    val occurredOn: LocalDate,
    val merchant: String,
    val categoryId: Long?,
    val budgetSource: BudgetSource?,
    val selected: Boolean = true,
    val paymentMethod: V1PaymentMethod? = null,
    val sharedWithPartner: Boolean? = null,
)
