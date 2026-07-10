package com.woorilog.controller

import com.woorilog.security.UserPrincipal
import com.woorilog.service.TransactionImportPreviewRequest
import com.woorilog.service.TransactionImportPreviewResponse
import com.woorilog.service.TransactionImportService
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
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
}

data class TransactionImportPreviewApiRequest(
    @field:NotBlank(message = "가져올 텍스트는 필수입니다.")
    val text: String,
    val transactionDate: LocalDate?,
    val ocrEngine: String?,
    val sourceName: String?
)
