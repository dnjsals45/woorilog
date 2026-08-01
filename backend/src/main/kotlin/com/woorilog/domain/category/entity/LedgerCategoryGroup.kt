package com.woorilog.domain.category.entity

import com.woorilog.common.entity.BaseEntity

import jakarta.persistence.*
import com.woorilog.domain.ledger.entity.Ledger

@Entity
@Table(
    name = "category_groups",
    uniqueConstraints = [UniqueConstraint(columnNames = ["ledger_id", "name"])]
)
class LedgerCategoryGroup(
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ledger_id", nullable = false)
    var ledger: Ledger,

    @Column(nullable = false)
    var name: String,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var type: CategoryType,

    @Column(nullable = false)
    var code: String = "",

    @Column(nullable = false)
    var hidden: Boolean = false,

    @Column(name = "sort_order", nullable = false)
    var sortOrder: Int = 0,
) : BaseEntity()
