package com.woorilog.domain

import jakarta.persistence.*

enum class CategoryType {
    EXPENSE, INCOME
}

@Entity
@Table(
    name = "ledger_categories",
    uniqueConstraints = [
        UniqueConstraint(columnNames = ["ledger_id", "name"])
    ]
)
class LedgerCategory(
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ledger_id", nullable = false)
    var ledger: Ledger,

    @Column(nullable = false)
    var name: String,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var type: CategoryType,

    @Column(name = "sort_order", nullable = false)
    var sortOrder: Int,

    @Column(name = "default_category", nullable = false)
    var defaultCategory: Boolean
) : BaseEntity()
