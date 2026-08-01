package com.woorilog.domain.scheduled.repository

import com.woorilog.domain.scheduled.entity.ScheduledPlan
import com.woorilog.domain.scheduled.entity.ScheduledPlanStatus

interface ScheduledPlanRepository {
    fun findByIdOrNull(id: Long): ScheduledPlan?
    fun findByLedgerIdOrderByIdDesc(ledgerId: Long): List<ScheduledPlan>
    fun findByLedgerIdAndFixedExpenseTrueAndStatus(ledgerId: Long, status: ScheduledPlanStatus): List<ScheduledPlan>
    fun save(scheduledPlan: ScheduledPlan): ScheduledPlan
}
