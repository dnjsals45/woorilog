package com.woorilog.domain.scheduled.entity

import com.woorilog.common.entity.BaseEntity
import com.woorilog.domain.auth.entity.User
import com.woorilog.domain.budget.entity.BudgetAllocation
import com.woorilog.domain.category.entity.LedgerCategory
import com.woorilog.domain.ledger.entity.Ledger
import com.woorilog.domain.scheduled.policy.ScheduleFrequency
import com.woorilog.domain.transaction.entity.PaymentMethod
import com.woorilog.domain.transaction.policy.BudgetScopeType

import jakarta.persistence.*
import java.time.LocalDate

@Entity
@Table(name = "scheduled_plans")
class ScheduledPlan(
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "ledger_id", nullable = false)
    var ledger: Ledger,
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "created_by_user_id", nullable = false)
    var createdBy: User,
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "budget_allocation_id")
    var budgetAllocation: BudgetAllocation? = null,
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    var type: ScheduledPlanType,
    @Column(nullable = false)
    var amount: Long,
    @Column(name = "start_date", nullable = false)
    var startDate: LocalDate,
    @Column(name = "next_due_date", nullable = false)
    var nextDueDate: LocalDate,
    @Column(name = "end_date")
    var endDate: LocalDate? = null,
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    var status: ScheduledPlanStatus = ScheduledPlanStatus.ACTIVE,
    @Enumerated(EnumType.STRING) @Column(name = "pause_reason")
    var pauseReason: ScheduledPauseReason? = null,
    @Column(name = "is_fixed_expense", nullable = false)
    var fixedExpense: Boolean = false,
    @Enumerated(EnumType.STRING) @Column(name = "frequency")
    var frequency: ScheduleFrequency? = null,
    @Column(name = "installment_total_count")
    var installmentTotalCount: Int? = null,
    @Column(name = "monthly_interest_amount", nullable = false)
    var monthlyInterestAmount: Long = 0,
    @Column(nullable = false)
    var name: String = "",
    @Column
    var merchant: String? = null,
    @Column
    var memo: String? = null,
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "category_id")
    var category: LedgerCategory? = null,
    @Enumerated(EnumType.STRING) @Column(name = "scope_type")
    var scopeType: BudgetScopeType? = null,
    @Column(name = "scope_owner_user_id")
    var scopeOwnerUserId: Long? = null,
    @Enumerated(EnumType.STRING) @Column(name = "payment_method_type")
    var paymentMethodType: PaymentMethod? = null,
    @Column(name = "payment_method_display_name")
    var paymentMethodDisplayName: String? = null,
    @Column(name = "anchor_day", nullable = false)
    var anchorDay: Int = 1,
    @Column(name = "total_principal_amount")
    var totalPrincipalAmount: Long? = null,
) : BaseEntity()
