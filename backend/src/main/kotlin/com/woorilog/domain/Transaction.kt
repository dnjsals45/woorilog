package com.woorilog.domain

import jakarta.persistence.*
import java.time.LocalDate

enum class PaymentMethod {
    CASH, CARD
}

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
) : BaseEntity()
