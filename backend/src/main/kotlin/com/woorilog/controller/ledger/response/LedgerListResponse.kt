package com.woorilog.controller.ledger.response

import com.woorilog.application.ledger.result.LedgerListResult

data class LedgerListResponse(
    val ledgers: List<LedgerResponse>,
    val currentLedgerId: Long,
    val items: List<LedgerResponse> = ledgers,
)

fun LedgerListResult.toResponse() = LedgerListResponse(
    ledgers = ledgers.map { it.toResponse() },
    currentLedgerId = currentLedgerId,
    items = items.map { it.toResponse() },
)
