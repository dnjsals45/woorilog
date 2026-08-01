package com.woorilog.infrastructure.persistence.card

import com.woorilog.domain.card.entity.Card
import org.springframework.data.jpa.repository.JpaRepository

interface CardJpaRepository : JpaRepository<Card, Long> {
    fun findByLedgerIdOrderByNameAsc(ledgerId: Long): List<Card>

    fun existsByLedgerIdAndName(ledgerId: Long, name: String): Boolean
}
