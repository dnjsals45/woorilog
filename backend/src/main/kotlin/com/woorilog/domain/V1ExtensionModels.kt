package com.woorilog.domain

import jakarta.persistence.*
import java.time.Instant
import java.time.LocalDate

enum class BudgetAllocationScope { PERSONAL, SHARED }
enum class ScheduledPlanType { RECURRING_EXPENSE, INSTALLMENT }
enum class ScheduledPlanStatus { ACTIVE, PAUSED, CANCELLED }
enum class ScheduledPauseReason { USER_REQUEST, MEMBERSHIP_CHANGED }
enum class ScheduledOccurrenceStatus { SCHEDULED, GENERATED, SKIPPED, CANCELLED }
enum class ImportSourceType { RECEIPT, CARD_APP_SCREENSHOT }
enum class ImportSessionStatus { PREVIEWED, SAVED, EXPIRED }
enum class BudgetThresholdLevel { BELOW_80, AT_LEAST_80, AT_LEAST_100 }

@Entity
@Table(
    name = "ledger_user_preferences",
    uniqueConstraints = [UniqueConstraint(columnNames = ["ledger_id", "user_id"])]
)
class LedgerUserPreference(
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "ledger_id", nullable = false)
    var ledger: Ledger,
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false)
    var user: User,
    @Enumerated(EnumType.STRING) @Column(name = "last_budget_scope")
    var lastBudgetScope: BudgetAllocationScope? = null,
    @Column(name = "last_budget_owner_user_id")
    var lastBudgetOwnerUserId: Long? = null,
    @Column(name = "share_new_personal_transactions", nullable = false)
    var shareNewPersonalTransactions: Boolean = false,
) : BaseEntity()

@Entity
@Table(name = "budget_periods", uniqueConstraints = [UniqueConstraint(columnNames = ["ledger_id", "start_date"])])
class BudgetPeriod(
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "ledger_id", nullable = false)
    var ledger: Ledger,
    @Column(name = "start_date", nullable = false)
    var startDate: LocalDate,
    @Column(name = "end_date", nullable = false)
    var endDate: LocalDate,
    @Column(name = "total_budget_amount", nullable = false)
    var totalBudgetAmount: Long,
    @Column(name = "prepared_at")
    var preparedAt: Instant? = null,
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "source_period_id")
    var sourcePeriod: BudgetPeriod? = null,
) : BaseEntity()

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

@Entity
@Table(name = "scheduled_occurrences", uniqueConstraints = [UniqueConstraint(columnNames = ["plan_id", "due_date", "sequence"])])
class ScheduledOccurrence(
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "plan_id", nullable = false)
    var plan: ScheduledPlan,
    @Column(name = "due_date", nullable = false)
    var dueDate: LocalDate,
    @Column(nullable = false)
    var sequence: Int,
    @Column(nullable = false)
    var amount: Long,
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    var status: ScheduledOccurrenceStatus = ScheduledOccurrenceStatus.SCHEDULED,
    @Column(name = "generated_transaction_id")
    var generatedTransactionId: Long? = null,
) : BaseEntity()

@Entity
@Table(name = "import_sessions")
class ImportSession(
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "ledger_id", nullable = false)
    var ledger: Ledger,
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "uploaded_by_user_id", nullable = false)
    var uploadedBy: User,
    @Enumerated(EnumType.STRING) @Column(name = "source_type", nullable = false)
    var sourceType: ImportSourceType,
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    var status: ImportSessionStatus = ImportSessionStatus.PREVIEWED,
    @Column(name = "expires_at", nullable = false)
    var expiresAt: Instant,
    @Column(name = "omitted_count", nullable = false)
    var omittedCount: Int = 0,
) : BaseEntity()

@Entity
@Table(name = "import_candidates")
class ImportCandidate(
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "import_session_id", nullable = false)
    var importSession: ImportSession,
    @Column(name = "occurred_on", nullable = false)
    var occurredOn: LocalDate,
    @Column(nullable = false)
    var amount: Long,
    @Column(nullable = false)
    var merchant: String,
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "suggested_category_id")
    var suggestedCategory: LedgerCategory? = null,
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "suggested_allocation_id")
    var suggestedAllocation: BudgetAllocation? = null,
    @Column(name = "duplicate_suspected", nullable = false)
    var duplicateSuspected: Boolean = false,
    @Column(name = "duplicate_reason")
    var duplicateReason: String? = null,
    @Column(name = "selected_by_default", nullable = false)
    var selectedByDefault: Boolean = true,
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "generated_transaction_id")
    var generatedTransaction: Transaction? = null,
) : BaseEntity()

@Entity
@Table(name = "notification_preferences", uniqueConstraints = [UniqueConstraint(columnNames = ["user_id"])])
class NotificationPreference(
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false)
    var user: User,
    @Column(name = "budget_warning_80_enabled", nullable = false)
    var budgetWarning80Enabled: Boolean = true,
    @Column(name = "weekly_guide_enabled", nullable = false)
    var weeklyGuideEnabled: Boolean = true,
) : BaseEntity()

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
