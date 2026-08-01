package com.woorilog.infrastructure.persistence.ledger

import com.woorilog.domain.ledger.entity.LedgerUserPreference
import org.springframework.data.jpa.repository.JpaRepository

interface LedgerUserPreferenceJpaRepository : JpaRepository<LedgerUserPreference, Long> {
    fun findByLedgerIdAndUserId(ledgerId: Long, userId: Long): LedgerUserPreference?
}
