package com.woorilog.domain

import jakarta.persistence.*

@Entity
@Table(
    name = "ledger_months",
    uniqueConstraints = [
        UniqueConstraint(columnNames = ["ledger_id", "budget_month"])
    ]
)
class LedgerMonth(
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ledger_id", nullable = false)
    var ledger: Ledger,

    @Column(name = "budget_month", nullable = false)
    var budgetMonth: String,

    @Column(name = "total_budget_amount", nullable = false)
    var totalBudgetAmount: Long = 0L,

    @Column(nullable = false)
    var closed: Boolean = false
) : BaseEntity()
