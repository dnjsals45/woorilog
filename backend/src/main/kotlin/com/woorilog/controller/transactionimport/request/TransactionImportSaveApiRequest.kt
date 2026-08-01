package com.woorilog.controller.transactionimport.request

import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.NotNull
import java.time.LocalDate

data class TransactionImportSaveApiRequest(
    val sessionId: Long,

    @field:NotEmpty(message = "저장할 거래 후보는 하나 이상이어야 합니다.")
    @field:Valid
    val candidates: List<TransactionImportSaveCandidateApiRequest>,
)

data class TransactionImportSaveCandidateApiRequest(
    @field:NotNull(message = "금액은 필수입니다.")
    val amount: Long,

    @field:NotNull(message = "거래 일자는 필수입니다.")
    val occurredOn: LocalDate,

    val candidateId: Long,
    @field:NotBlank val merchant: String,
    val categoryId: Long?,
    val budgetSource: ImportBudgetSourceApiRequest?,
    val selected: Boolean = true,
    val paymentMethod: ImportPaymentMethodApiRequest? = null,
    val sharedWithPartner: Boolean? = null,
)

data class ImportBudgetSourceApiRequest(val type: String, val ownerUserId: Long?)
data class ImportPaymentMethodApiRequest(val type: String, val displayName: String? = null)
