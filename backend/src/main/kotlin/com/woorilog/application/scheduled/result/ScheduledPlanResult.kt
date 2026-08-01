package com.woorilog.application.scheduled.result

import com.woorilog.application.transaction.result.TransactionResult
import com.woorilog.application.transaction.result.toResult
import com.woorilog.domain.scheduled.entity.ScheduledPlan
import com.woorilog.domain.scheduled.entity.ScheduledPlanStatus
import com.woorilog.domain.scheduled.entity.ScheduledPlanType
import com.woorilog.domain.scheduled.policy.ScheduleFrequency
import com.woorilog.domain.transaction.entity.Transaction
import java.time.LocalDate

data class ScheduledPlanResult(
    val id: Long,
    val type: ScheduledPlanType,
    val name: String,
    val amount: Long,
    val frequency: ScheduleFrequency?,
    val status: ScheduledPlanStatus,
    val nextDueDate: LocalDate,
    val isFixedExpense: Boolean,
    val firstTransaction: TransactionResult? = null,
) {
    companion object {
        fun from(plan: ScheduledPlan, transaction: Transaction? = null) = ScheduledPlanResult(
            plan.id!!, plan.type, plan.name, plan.amount, plan.frequency, plan.status,
            plan.nextDueDate, plan.fixedExpense, transaction?.toResult(),
        )
    }
}

data class ScheduledPlanCreationResult(val plan: ScheduledPlanResult, val firstTransaction: Transaction)
