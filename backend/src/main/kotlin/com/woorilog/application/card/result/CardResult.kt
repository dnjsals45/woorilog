package com.woorilog.application.card.result

import com.woorilog.domain.card.entity.Card

data class CardResult(
    val id: Long,
    val ledgerId: Long,
    val name: String,
    val statementClosingDay: Int,
)

fun Card.toResult() = CardResult(
    id = id!!,
    ledgerId = ledger.id!!,
    name = name,
    statementClosingDay = statementClosingDay,
)
