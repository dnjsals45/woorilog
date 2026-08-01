package com.woorilog.domain.ledger.repository

import com.woorilog.domain.ledger.entity.LedgerUserPreference

interface LedgerUserPreferenceRepository {
    fun findByLedgerIdAndUserId(ledgerId: Long, userId: Long): LedgerUserPreference?
    fun save(ledgerUserPreference: LedgerUserPreference): LedgerUserPreference
}
