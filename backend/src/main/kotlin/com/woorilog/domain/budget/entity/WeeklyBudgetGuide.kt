package com.woorilog.domain.budget.entity

import com.woorilog.common.entity.BaseEntity
import com.woorilog.domain.auth.entity.User
import com.woorilog.domain.ledger.entity.Ledger

import jakarta.persistence.*
import java.time.LocalDate

@Entity
@Table(name = "weekly_budget_guides", uniqueConstraints = [UniqueConstraint(columnNames = ["user_id", "ledger_id", "week_start_date", "budget_period_id"])])
class WeeklyBudgetGuide(
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false)
    var user: User,
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "ledger_id", nullable = false)
    var ledger: Ledger,
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "budget_period_id", nullable = false)
    var budgetPeriod: BudgetPeriod,
    @Column(name = "week_start_date", nullable = false)
    var weekStartDate: LocalDate,
    @Column(name = "recommended_amount", nullable = false)
    var recommendedAmount: Long,
    @Column(name = "remaining_overage_amount", nullable = false)
    var remainingOverageAmount: Long = 0,
) : BaseEntity()
