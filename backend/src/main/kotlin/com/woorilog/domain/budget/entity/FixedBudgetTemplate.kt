package com.woorilog.domain.budget.entity

import com.woorilog.common.entity.BaseEntity

import jakarta.persistence.*
import com.woorilog.domain.category.entity.LedgerCategory
import com.woorilog.domain.ledger.entity.Ledger

@Entity
@Table(name = "fixed_budget_templates")
class FixedBudgetTemplate(
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ledger_id", nullable = false)
    var ledger: Ledger,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    var category: LedgerCategory,

    @Column(nullable = false)
    var name: String,

    @Column(nullable = false)
    var amount: Long,

    @Column(nullable = false)
    var active: Boolean,
) : BaseEntity()
