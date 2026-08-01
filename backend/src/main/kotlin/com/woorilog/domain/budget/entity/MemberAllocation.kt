package com.woorilog.domain.budget.entity

import com.woorilog.common.entity.BaseEntity

import jakarta.persistence.*
import com.woorilog.domain.auth.entity.User
import com.woorilog.domain.ledger.entity.LedgerMonth

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
