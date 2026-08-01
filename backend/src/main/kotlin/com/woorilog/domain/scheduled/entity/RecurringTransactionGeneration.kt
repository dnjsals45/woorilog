package com.woorilog.domain.scheduled.entity

import com.woorilog.common.entity.BaseEntity

import jakarta.persistence.*
import java.time.LocalDate
import com.woorilog.domain.transaction.entity.Transaction

@Entity
@Table(
    name = "recurring_transaction_generations",
    uniqueConstraints = [
        UniqueConstraint(columnNames = ["template_id", "generated_date"])
    ]
)
class RecurringTransactionGeneration(
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false)
    var template: RecurringTransactionTemplate,

    @Column(name = "generated_date", nullable = false)
    var generatedDate: LocalDate,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transaction_id", nullable = true)
    var transaction: Transaction?
) : BaseEntity()
