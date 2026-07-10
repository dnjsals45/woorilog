package com.woorilog.domain

import jakarta.persistence.*

@Entity
@Table(
    name = "category_budgets",
    uniqueConstraints = [
        UniqueConstraint(columnNames = ["ledger_month_id", "category_id"])
    ]
)
class CategoryBudget(
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ledger_month_id", nullable = false)
    var ledgerMonth: LedgerMonth,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    var category: LedgerCategory,

    @Column(nullable = false)
    var amount: Long
) : BaseEntity()
