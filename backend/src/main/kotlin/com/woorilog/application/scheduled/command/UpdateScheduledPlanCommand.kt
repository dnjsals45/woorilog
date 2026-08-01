package com.woorilog.application.scheduled.command

import java.time.LocalDate

data class UpdateScheduledPlanCommand(
    val scope: String,
    val name: String?,
    val amount: Long?,
    val nextDueDate: LocalDate?,
    val endDate: LocalDate?,
    val fixedExpense: Boolean?,
)
