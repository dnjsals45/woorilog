package com.woorilog.infrastructure.persistence.scheduled

import com.woorilog.domain.scheduled.entity.ScheduledOccurrence
import com.woorilog.domain.scheduled.entity.ScheduledOccurrenceStatus
import jakarta.persistence.LockModeType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.time.LocalDate

@Repository
interface ScheduledOccurrenceJpaRepository : JpaRepository<ScheduledOccurrence, Long> {
    @Query("select occurrence from ScheduledOccurrence occurrence where occurrence.status = com.woorilog.domain.scheduled.entity.ScheduledOccurrenceStatus.SCHEDULED and occurrence.dueDate <= :dueDate")
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    fun lockDue(@Param("dueDate") dueDate: LocalDate): List<ScheduledOccurrence>
    fun findByPlanIdAndStatus(planId: Long, status: ScheduledOccurrenceStatus): List<ScheduledOccurrence>
    fun findByPlanIdOrderBySequence(planId: Long): List<ScheduledOccurrence>
    @Query(
        "select occurrence from ScheduledOccurrence occurrence where occurrence.plan.ledger.id = :ledgerId and occurrence.dueDate between :startDate and :endDate and occurrence.status = :status"
    )
    fun findByLedgerAndDueDateBetweenAndStatus(
        @Param("ledgerId") ledgerId: Long,
        @Param("startDate") startDate: LocalDate,
        @Param("endDate") endDate: LocalDate,
        @Param("status") status: ScheduledOccurrenceStatus,
    ): List<ScheduledOccurrence>
}
