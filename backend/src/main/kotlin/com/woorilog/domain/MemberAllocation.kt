package com.woorilog.domain

import jakarta.persistence.*

@Entity
@Table(
    name = "member_allocations",
    uniqueConstraints = [
        UniqueConstraint(columnNames = ["ledger_month_id", "user_id"])
    ]
)
class MemberAllocation(
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ledger_month_id", nullable = false)
    var ledgerMonth: LedgerMonth,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    var user: User,

    @Column(nullable = false)
    var amount: Long
) : BaseEntity()
