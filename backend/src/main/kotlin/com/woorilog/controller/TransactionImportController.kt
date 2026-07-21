package com.woorilog.controller

import com.woorilog.security.UserPrincipal
import com.woorilog.service.TransactionImageInput
import com.woorilog.service.CreateTransactionRequest
import com.woorilog.service.TransactionImportImagePreviewResponse
import com.woorilog.service.TransactionImportPreviewRequest
import com.woorilog.service.TransactionImportPreviewResponse
import com.woorilog.service.TransactionImportService
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
    private val transactionImportService: TransactionImportService
) {

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
        @Valid @RequestBody request: TransactionImportSaveApiRequest,
    ) = transactionImportService.saveCandidates(
        userId = principal.userId,
        ledgerId = ledgerId,
        candidates = request.candidates.map { candidate ->
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
    )
}

data class TransactionImportPreviewApiRequest(
    @field:NotBlank(message = "가져올 텍스트는 필수입니다.")
    val text: String,
    val transactionDate: LocalDate?,
    val ocrEngine: String?,
    val sourceName: String?
)

data class TransactionImportSaveApiRequest(
    @field:NotEmpty(message = "저장할 거래 후보는 하나 이상이어야 합니다.")
    @field:Valid
    val candidates: List<TransactionImportSaveCandidateApiRequest>,
)

data class TransactionImportSaveCandidateApiRequest(
    @field:NotNull(message = "거래 유형은 필수입니다.")
    val type: com.woorilog.domain.CategoryType,

    @field:NotNull(message = "금액은 필수입니다.")
    val amount: Long,

    @field:NotNull(message = "거래 일자는 필수입니다.")
    val transactionDate: LocalDate,

    val categoryId: Long?,
    val memo: String?,
)
