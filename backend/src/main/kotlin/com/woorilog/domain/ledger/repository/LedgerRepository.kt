package com.woorilog.domain.ledger.repository

import com.woorilog.domain.ledger.entity.Ledger

interface LedgerRepository {
    fun findByIdOrNull(id: Long): Ledger?
    fun findAll(): List<Ledger>
    fun findByIdForUpdate(ledgerId: Long): Ledger?
    fun getReferenceById(id: Long): Ledger
    fun save(ledger: Ledger): Ledger
}
