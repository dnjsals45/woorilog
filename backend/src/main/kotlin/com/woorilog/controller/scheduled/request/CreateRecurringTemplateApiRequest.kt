package com.woorilog.controller.scheduled.request

import com.woorilog.application.scheduled.command.CreateRecurringTemplateCommand
import com.woorilog.domain.category.entity.CategoryType
import com.woorilog.domain.scheduled.entity.RecurringFrequency
import jakarta.validation.constraints.NotNull
import java.time.LocalDate

data class CreateRecurringTemplateApiRequest(
    @field:NotNull(message = "거래 유형은 필수입니다.")
    val type: CategoryType,

    @field:NotNull(message = "금액은 필수입니다.")
    val amount: Long,

    val categoryId: Long?,

    val memo: String?,

    val payerUserId: Long?,

    @field:NotNull(message = "주기는 필수입니다.")
    val frequency: RecurringFrequency,

    @field:NotNull(message = "시작일은 필수입니다.")
    val startDate: LocalDate,

    val endDate: LocalDate?
) {
    fun toCommand() = CreateRecurringTemplateCommand(
        type = type,
        amount = amount,
        categoryId = categoryId,
        memo = memo,
        payerUserId = payerUserId,
        frequency = frequency,
        startDate = startDate,
        endDate = endDate,
    )
}
