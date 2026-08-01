package com.woorilog.controller.card.response

import com.woorilog.application.card.result.CardResult

data class CardResponse(
    val id: Long,
    val ledgerId: Long,
    val name: String,
    val statementClosingDay: Int,
)

fun CardResult.toResponse() = CardResponse(
    id = id,
    ledgerId = ledgerId,
    name = name,
    statementClosingDay = statementClosingDay,
)
