package com.woorilog.domain

import jakarta.persistence.*

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
) : BaseEntity()
