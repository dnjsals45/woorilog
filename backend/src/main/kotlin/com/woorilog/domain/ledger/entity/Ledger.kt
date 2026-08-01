package com.woorilog.domain.ledger.entity

import com.woorilog.common.entity.BaseEntity

import jakarta.persistence.*
import com.woorilog.domain.budget.policy.BudgetStartType

enum class LedgerType {
    PERSONAL, GROUP
}

@Entity
@Table(name = "ledgers")
class Ledger(
    @Column(nullable = false)
    var name: String,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var type: LedgerType,

    @Column(name = "owner_id", nullable = false)
    var ownerId: Long,

    @Column(nullable = false)
    var archived: Boolean = false,

    @Column(name = "recurring_summary_closing_day", nullable = false)
    var recurringSummaryClosingDay: Int = 31,

    @Enumerated(EnumType.STRING)
    @Column(name = "budget_start_type", nullable = false)
    var budgetStartType: BudgetStartType = BudgetStartType.DAY_OF_MONTH,

    @Column(name = "budget_start_day")
    var budgetStartDay: Int? = 1,

    @Column(name = "default_total_budget_amount", nullable = false)
    var defaultTotalBudgetAmount: Long = 0,
) : BaseEntity()
