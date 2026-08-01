package com.woorilog.domain.scheduled.entity

import com.woorilog.common.entity.BaseEntity

import jakarta.persistence.*
import java.time.LocalDate

@Entity
@Table(name = "scheduled_occurrences", uniqueConstraints = [UniqueConstraint(columnNames = ["plan_id", "due_date", "sequence"])])
class ScheduledOccurrence(
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "plan_id", nullable = false)
    var plan: ScheduledPlan,
    @Column(name = "due_date", nullable = false)
    var dueDate: LocalDate,
    @Column(nullable = false)
    var sequence: Int,
    @Column(nullable = false)
    var amount: Long,
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    var status: ScheduledOccurrenceStatus = ScheduledOccurrenceStatus.SCHEDULED,
    @Column(name = "generated_transaction_id")
    var generatedTransactionId: Long? = null,
) : BaseEntity()
