package com.woorilog.domain.budget.entity

import com.woorilog.common.entity.BaseEntity

import jakarta.persistence.*

@Entity
@Table(name = "budget_threshold_states", uniqueConstraints = [UniqueConstraint(columnNames = ["state_key"])])
class BudgetThresholdState(
    @Column(name = "state_key", nullable = false)
    var stateKey: String,
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "budget_period_id", nullable = false)
    var budgetPeriod: BudgetPeriod,
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "budget_allocation_id")
    var budgetAllocation: BudgetAllocation? = null,
    @Column(name = "category_group_code")
    var categoryGroupCode: String? = null,
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    var level: BudgetThresholdLevel = BudgetThresholdLevel.BELOW_80,
    @Column(name = "notification_sequence", nullable = false)
    var notificationSequence: Long = 0,
) : BaseEntity()
