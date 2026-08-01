package com.woorilog.controller.budget.request

import com.woorilog.application.budget.command.SaveFixedBudgetCommand
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Positive

data class FixedBudgetApiRequest(
    @field:NotBlank(message = "고정비 이름은 필수 입력값입니다.")
    val name: String,
    @field:NotNull(message = "카테고리는 필수 입력값입니다.")
    val categoryId: Long,
    @field:Positive(message = "고정비 금액은 양수여야 합니다.")
    val amount: Long,
    val active: Boolean = true,
) {
    fun toCommand() = SaveFixedBudgetCommand(name, categoryId, amount, active)
}
