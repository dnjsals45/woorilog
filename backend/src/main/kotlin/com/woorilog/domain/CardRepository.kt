package com.woorilog.domain

import org.springframework.data.jpa.repository.JpaRepository

interface CardRepository : JpaRepository<Card, Long> {
    fun findByLedgerIdOrderByNameAsc(ledgerId: Long): List<Card>

    fun existsByLedgerIdAndName(ledgerId: Long, name: String): Boolean
}
