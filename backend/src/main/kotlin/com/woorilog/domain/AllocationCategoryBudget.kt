package com.woorilog.domain

import jakarta.persistence.*

@Entity
@Table(
    name = "allocation_category_budgets",
    uniqueConstraints = [UniqueConstraint(columnNames = ["budget_allocation_id", "category_group_code"])]
)
class AllocationCategoryBudget(
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "budget_allocation_id", nullable = false)
    var budgetAllocation: BudgetAllocation,

    @Column(name = "category_group_code", nullable = false)
    var categoryGroupCode: String,

    @Column(nullable = false)
    var amount: Long,
) : BaseEntity()
