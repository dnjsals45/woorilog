package com.woorilog.controller.transaction.request

import com.woorilog.application.transaction.command.QuickTransactionCommand
import jakarta.validation.constraints.NotBlank
import java.time.LocalDate

data class QuickTransactionApiRequest(
    @field:NotBlank(message = "텍스트는 필수입니다.")
    val text: String,

    val transactionDate: LocalDate?
) {
    fun toCommand() = QuickTransactionCommand(text = text, transactionDate = transactionDate)
}
