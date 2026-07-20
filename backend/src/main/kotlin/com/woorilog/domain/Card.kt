package com.woorilog.domain

import jakarta.persistence.*

@Entity
@Table(name = "cards")
class Card(
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ledger_id", nullable = false)
    var ledger: Ledger,

    @Column(nullable = false)
    var name: String,

    @Column(name = "statement_closing_day", nullable = false)
    var statementClosingDay: Int,
) : BaseEntity()
