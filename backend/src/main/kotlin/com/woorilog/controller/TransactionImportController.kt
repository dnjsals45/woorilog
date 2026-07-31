package com.woorilog.controller

import com.woorilog.security.UserPrincipal
import com.woorilog.service.TransactionImageInput
import com.woorilog.service.CreateTransactionRequest
import com.woorilog.service.TransactionImportImagePreviewResponse
import com.woorilog.service.TransactionImportPreviewRequest
import com.woorilog.service.TransactionImportPreviewResponse
import com.woorilog.service.TransactionImportService
import com.woorilog.service.V1TransactionImportService
import com.woorilog.service.SaveImportSessionRequest
import com.woorilog.service.SaveImportCandidateRequest
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import jakarta.validation.Valid
import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile
import java.time.LocalDate

@RestController
class TransactionImportController(
    private val transactionImportService: TransactionImportService,
    private val v1TransactionImportService: V1TransactionImportService,
    private val objectMapper: ObjectMapper,
) {

    @PostMapping(
        "/api/ledgers/{ledgerId}/transaction-imports/previews",
        consumes = [MediaType.MULTIPART_FORM_DATA_VALUE],
    )
    fun previewV1Images(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @RequestParam sourceType: String,
        @RequestPart("images") images: List<MultipartFile>,
    ) = v1TransactionImportService.preview(
        userId = principal.userId,
        ledgerId = ledgerId,
        sourceType = sourceType,
        images = images.map { TransactionImageInput(it.bytes, it.contentType) },
    )

    @PostMapping("/api/ledgers/{ledgerId}/transaction-imports/preview")
    fun preview(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @Valid @RequestBody request: TransactionImportPreviewApiRequest
    ): TransactionImportPreviewResponse {
        return transactionImportService.preview(
            principal.userId,
            ledgerId,
            TransactionImportPreviewRequest(
                text = request.text,
                transactionDate = request.transactionDate,
                ocrEngine = request.ocrEngine,
                sourceName = request.sourceName
            )
        )
    }

    @PostMapping(
        "/api/ledgers/{ledgerId}/transaction-imports/ocr-preview",
        consumes = [MediaType.MULTIPART_FORM_DATA_VALUE],
    )
    fun previewImages(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @RequestPart("image") images: List<MultipartFile>,
        @RequestParam(required = false)
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        transactionDate: LocalDate?,
    ): TransactionImportImagePreviewResponse {
        return transactionImportService.previewImages(
            userId = principal.userId,
            ledgerId = ledgerId,
            inputs = images.map { image ->
                TransactionImageInput(
                    bytes = image.bytes,
                    contentType = image.contentType,
                )
            },
            transactionDate = transactionDate,
        )
    }

    @PostMapping("/api/ledgers/{ledgerId}/transaction-imports")
    fun saveCandidates(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @RequestBody request: JsonNode,
    ): org.springframework.http.ResponseEntity<Any> {
        if (!request.has("sessionId")) {
            val legacy = objectMapper.treeToValue(request, LegacyTransactionImportSaveApiRequest::class.java)
            return org.springframework.http.ResponseEntity.ok(transactionImportService.saveCandidates(
                userId = principal.userId,
                ledgerId = ledgerId,
                candidates = legacy.candidates.map { candidate ->
                    CreateTransactionRequest(
                        type = candidate.type,
                        amount = candidate.amount,
                        transactionDate = candidate.transactionDate,
                        categoryId = candidate.categoryId,
                        memo = candidate.memo,
                        payerUserId = null,
                        installmentMonths = null,
                        paymentMethod = null,
                        cardId = null,
                    )
                },
            ))
        }
        val v1 = objectMapper.treeToValue(request, TransactionImportSaveApiRequest::class.java)
        return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.CREATED).body(v1TransactionImportService.save(
            userId = principal.userId,
            ledgerId = ledgerId,
            request = SaveImportSessionRequest(
            sessionId = v1.sessionId,
            candidates = v1.candidates.map { candidate ->
                SaveImportCandidateRequest(
                    candidateId = candidate.candidateId,
                    amount = candidate.amount,
                    occurredOn = candidate.occurredOn,
                    merchant = candidate.merchant,
                    categoryId = candidate.categoryId,
                    budgetSource = candidate.budgetSource?.let { com.woorilog.service.BudgetSource(com.woorilog.domain.BudgetScopeType.valueOf(it.type), it.ownerUserId) },
                    selected = candidate.selected,
                    paymentMethod = candidate.paymentMethod?.let { com.woorilog.service.V1PaymentMethod(com.woorilog.domain.PaymentMethod.valueOf(it.type), it.displayName) },
                    sharedWithPartner = candidate.sharedWithPartner,
                )
            },
        ),
        ))
    }
}

data class TransactionImportPreviewApiRequest(
    @field:NotBlank(message = "가져올 텍스트는 필수입니다.")
    val text: String,
    val transactionDate: LocalDate?,
    val ocrEngine: String?,
    val sourceName: String?
)

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

data class LegacyTransactionImportSaveApiRequest(
    @field:NotEmpty(message = "저장할 거래 후보는 하나 이상이어야 합니다.")
    @field:Valid val candidates: List<LegacyTransactionImportSaveCandidateApiRequest>,
)
data class LegacyTransactionImportSaveCandidateApiRequest(
    @field:NotNull val type: com.woorilog.domain.CategoryType,
    @field:NotNull val amount: Long,
    @field:NotNull val transactionDate: LocalDate,
    val categoryId: Long?,
    val memo: String?,
)
