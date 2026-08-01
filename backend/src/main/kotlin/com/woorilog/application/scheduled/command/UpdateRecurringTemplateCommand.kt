package com.woorilog.application.scheduled.command

import com.woorilog.domain.category.entity.CategoryType
import com.woorilog.domain.scheduled.entity.RecurringFrequency
import java.time.LocalDate

data class UpdateRecurringTemplateCommand(
    val type: CategoryType,
    val amount: Long,
    val categoryId: Long?,
    val memo: String?,
    val payerUserId: Long?,
    val frequency: RecurringFrequency,
    val startDate: LocalDate,
    val endDate: LocalDate?
)
