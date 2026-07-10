package com.woorilog.domain

import jakarta.persistence.*
import java.time.LocalDate

enum class RecurringFrequency {
    WEEKLY, MONTHLY
}

@Entity
@Table(name = "recurring_transaction_templates")
class RecurringTransactionTemplate(
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ledger_id", nullable = false)
    var ledger: Ledger,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payer_id", nullable = false)
    var payer: User,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = true)
    var category: LedgerCategory?,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var type: CategoryType,

    @Column(nullable = false)
    var amount: Long,

    @Column(nullable = true)
    var memo: String?,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var frequency: RecurringFrequency,

    @Column(name = "start_date", nullable = false)
    var startDate: LocalDate,

    @Column(name = "next_due_date", nullable = false)
    var nextDueDate: LocalDate,

    @Column(name = "end_date", nullable = true)
    var endDate: LocalDate?,

    @Column(nullable = false)
    var paused: Boolean = false
) : BaseEntity()
