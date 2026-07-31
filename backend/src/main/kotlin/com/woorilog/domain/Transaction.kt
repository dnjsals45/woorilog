package com.woorilog.domain

import jakarta.persistence.*
import java.time.Instant
import java.time.LocalDate

enum class PaymentMethod {
    CASH, CARD, OTHER
}

enum class TransactionScheduleKind { RECURRING_EXPENSE, INSTALLMENT }

@Entity
@Table(name = "transactions")
class Transaction(
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ledger_id", nullable = false)
    var ledger: Ledger,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = true)
    var category: LedgerCategory?,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payer_id", nullable = false)
    var payer: User,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var type: CategoryType,

    @Column(nullable = false)
    var amount: Long,

    @Column(name = "transaction_date", nullable = false)
    var transactionDate: LocalDate,

    @Column(nullable = true)
    var memo: String?,

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false)
    var paymentMethod: PaymentMethod = PaymentMethod.CASH,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "card_id")
    var card: Card? = null,

    @Column(name = "installment_plan_id")
    var installmentPlanId: String? = null,

    @Column(name = "installment_sequence", nullable = false)
    var installmentSequence: Int = 1,

    @Column(name = "installment_total_count", nullable = false)
    var installmentTotalCount: Int = 1,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recorder_id")
    var recorder: User? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "budget_allocation_id")
    var budgetAllocation: BudgetAllocation? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "transfer_type")
    var transferType: TransferType? = null,

    @Column
    var merchant: String? = null,

    @Column(name = "occurred_at")
    var occurredAt: Instant? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "scope_type")
    var scopeType: BudgetScopeType? = null,

    @Column(name = "scope_owner_user_id")
    var scopeOwnerUserId: Long? = null,

    @Column(name = "shared_with_partner")
    var sharedWithPartner: Boolean? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "last_modified_by_user_id")
    var lastModifiedBy: User? = null,

    @Column(name = "category_group_code")
    var categoryGroupCode: String? = null,

    @Column(name = "category_group_name")
    var categoryGroupName: String? = null,

    @Column(name = "category_name")
    var categoryName: String? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method_type")
    var paymentMethodType: PaymentMethod? = null,

    @Column(name = "payment_method_display_name")
    var paymentMethodDisplayName: String? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scheduled_plan_id")
    var scheduledPlan: ScheduledPlan? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "schedule_kind")
    var scheduleKind: TransactionScheduleKind? = null,

    @Column(name = "external_reference_hash")
    var externalReferenceHash: String? = null,
) : BaseEntity()
