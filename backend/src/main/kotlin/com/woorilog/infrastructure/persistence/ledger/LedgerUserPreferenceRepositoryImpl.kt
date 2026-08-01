package com.woorilog.infrastructure.persistence.ledger

import com.woorilog.domain.ledger.entity.LedgerUserPreference
import com.woorilog.domain.ledger.repository.LedgerUserPreferenceRepository
import org.springframework.stereotype.Repository

@Repository
class LedgerUserPreferenceRepositoryImpl(
    private val jpaRepository: LedgerUserPreferenceJpaRepository,
) : LedgerUserPreferenceRepository {
    override fun findByLedgerIdAndUserId(ledgerId: Long, userId: Long) = jpaRepository.findByLedgerIdAndUserId(ledgerId, userId)
    override fun save(ledgerUserPreference: LedgerUserPreference): LedgerUserPreference = jpaRepository.save(ledgerUserPreference)
}
