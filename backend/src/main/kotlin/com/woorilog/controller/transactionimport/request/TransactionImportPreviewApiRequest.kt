package com.woorilog.controller.transactionimport.request

import com.woorilog.application.transactionimport.command.TransactionImportPreviewCommand
import jakarta.validation.constraints.NotBlank
import java.time.LocalDate

data class TransactionImportPreviewApiRequest(
    @field:NotBlank(message = "가져올 텍스트는 필수입니다.")
    val text: String,
    val transactionDate: LocalDate?,
    val ocrEngine: String?,
    val sourceName: String?
) {
    fun toCommand() = TransactionImportPreviewCommand(
        text = text,
        transactionDate = transactionDate,
        ocrEngine = ocrEngine,
        sourceName = sourceName,
    )
}
