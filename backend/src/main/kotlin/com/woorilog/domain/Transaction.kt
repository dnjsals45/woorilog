package com.woorilog.domain

import jakarta.persistence.*
import java.time.LocalDate

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
    var memo: String?
) : BaseEntity()
