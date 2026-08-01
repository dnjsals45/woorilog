package com.woorilog.domain.budget.entity

import com.woorilog.common.entity.BaseEntity
import com.woorilog.domain.auth.entity.User

import jakarta.persistence.*

@Entity
@Table(name = "reserve_transfers")
class ReserveTransfer(
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "budget_period_id", nullable = false)
    var budgetPeriod: BudgetPeriod,
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "target_allocation_id", nullable = false)
    var targetAllocation: BudgetAllocation,
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "actor_user_id", nullable = false)
    var actor: User,
    @Column(nullable = false)
    var amount: Long,
) : BaseEntity()
