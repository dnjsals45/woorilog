package com.woorilog.infrastructure.persistence.scheduled

import com.woorilog.domain.scheduled.entity.ScheduledPlan
import com.woorilog.domain.scheduled.entity.ScheduledPlanStatus
import org.springframework.data.jpa.repository.JpaRepository

interface ScheduledPlanJpaRepository : JpaRepository<ScheduledPlan, Long> {
    fun findByLedgerIdOrderByIdDesc(ledgerId: Long): List<ScheduledPlan>
    fun findByLedgerIdAndFixedExpenseTrueAndStatus(ledgerId: Long, status: ScheduledPlanStatus): List<ScheduledPlan>
}
