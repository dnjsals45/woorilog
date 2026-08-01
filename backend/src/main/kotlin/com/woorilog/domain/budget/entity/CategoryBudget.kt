package com.woorilog.domain.budget.entity

import com.woorilog.common.entity.BaseEntity

import jakarta.persistence.*
import com.woorilog.domain.category.entity.LedgerCategory
import com.woorilog.domain.ledger.entity.LedgerMonth

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
