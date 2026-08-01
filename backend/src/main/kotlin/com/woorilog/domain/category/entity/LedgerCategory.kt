package com.woorilog.domain.category.entity

import com.woorilog.common.entity.BaseEntity

import jakarta.persistence.*
import com.woorilog.domain.ledger.entity.Ledger

enum class CategoryType {
    EXPENSE, INCOME, TRANSFER
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_group_id", nullable = false)
    var categoryGroup: LedgerCategoryGroup,

    @Column(nullable = false)
    var name: String,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var type: CategoryType,

    @Column(name = "sort_order", nullable = false)
    var sortOrder: Int,

    @Column(name = "default_category", nullable = false)
    var defaultCategory: Boolean,

    @Column(nullable = false)
    var active: Boolean = true,
) : BaseEntity()
