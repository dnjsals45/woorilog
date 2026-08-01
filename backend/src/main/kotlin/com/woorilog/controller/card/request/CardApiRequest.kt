package com.woorilog.controller.card.request

import com.woorilog.application.card.command.SaveCardCommand
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank

data class CardApiRequest(
    @field:NotBlank(message = "카드 이름은 필수입니다.")
    val name: String,
    @field:Min(value = 1, message = "결제금액 확정일은 1일 이상이어야 합니다.")
    @field:Max(value = 31, message = "결제금액 확정일은 31일 이하여야 합니다.")
    val statementClosingDay: Int,
) {
    fun toCommand() = SaveCardCommand(name, statementClosingDay)
}
