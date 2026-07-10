package com.woorilog.domain

import jakarta.persistence.*
import java.time.LocalDate

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
