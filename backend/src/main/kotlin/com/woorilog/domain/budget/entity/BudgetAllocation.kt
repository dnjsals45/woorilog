package com.woorilog.domain.budget.entity

import com.woorilog.common.entity.BaseEntity
import com.woorilog.domain.auth.entity.User

import jakarta.persistence.*

@Entity
@Table(name = "budget_allocations")
class BudgetAllocation(
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "budget_period_id", nullable = false)
    var budgetPeriod: BudgetPeriod,
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    var scope: BudgetAllocationScope,
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "owner_user_id")
    var owner: User? = null,
    @Column(nullable = false)
    var amount: Long,
) : BaseEntity()
