package com.woorilog.infrastructure.persistence.scheduled

import com.woorilog.domain.scheduled.entity.ScheduledPlan
import com.woorilog.domain.scheduled.entity.ScheduledPlanStatus
import com.woorilog.domain.scheduled.repository.ScheduledPlanRepository
import org.springframework.stereotype.Repository

@Repository
class ScheduledPlanRepositoryImpl(
    private val jpaRepository: ScheduledPlanJpaRepository,
) : ScheduledPlanRepository {
    override fun findByIdOrNull(id: Long): ScheduledPlan? = jpaRepository.findById(id).orElse(null)
    override fun findByLedgerIdOrderByIdDesc(ledgerId: Long) = jpaRepository.findByLedgerIdOrderByIdDesc(ledgerId)
    override fun findByLedgerIdAndFixedExpenseTrueAndStatus(ledgerId: Long, status: ScheduledPlanStatus) =
        jpaRepository.findByLedgerIdAndFixedExpenseTrueAndStatus(ledgerId, status)
    override fun save(scheduledPlan: ScheduledPlan): ScheduledPlan = jpaRepository.save(scheduledPlan)
}
