package com.woorilog.domain.card.entity

import com.woorilog.common.entity.BaseEntity

import jakarta.persistence.*
import com.woorilog.domain.ledger.entity.Ledger

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
