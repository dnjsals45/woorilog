package com.woorilog.infrastructure.persistence.scheduled

import com.woorilog.domain.scheduled.entity.ScheduledOccurrence
import com.woorilog.domain.scheduled.entity.ScheduledOccurrenceStatus
import com.woorilog.domain.scheduled.repository.ScheduledOccurrenceRepository
import org.springframework.stereotype.Repository
import java.time.LocalDate

@Repository
class ScheduledOccurrenceRepositoryImpl(
    private val jpaRepository: ScheduledOccurrenceJpaRepository,
) : ScheduledOccurrenceRepository {
    override fun lockDue(dueDate: LocalDate) = jpaRepository.lockDue(dueDate)
    override fun findByPlanIdAndStatus(planId: Long, status: ScheduledOccurrenceStatus) = jpaRepository.findByPlanIdAndStatus(planId, status)
    override fun findByPlanIdOrderBySequence(planId: Long) = jpaRepository.findByPlanIdOrderBySequence(planId)
    override fun findByLedgerAndDueDateBetweenAndStatus(ledgerId: Long, startDate: LocalDate, endDate: LocalDate, status: ScheduledOccurrenceStatus) =
        jpaRepository.findByLedgerAndDueDateBetweenAndStatus(ledgerId, startDate, endDate, status)
    override fun save(scheduledOccurrence: ScheduledOccurrence): ScheduledOccurrence = jpaRepository.save(scheduledOccurrence)
}
