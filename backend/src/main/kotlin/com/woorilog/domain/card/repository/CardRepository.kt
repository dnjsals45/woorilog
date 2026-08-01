package com.woorilog.domain.card.repository

import com.woorilog.domain.card.entity.Card

interface CardRepository {
    fun findByIdOrNull(id: Long): Card?
    fun findByLedgerIdOrderByNameAsc(ledgerId: Long): List<Card>
    fun save(card: Card): Card
    fun delete(card: Card)
}
