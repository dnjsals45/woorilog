package com.woorilog.domain.ledger.repository

import com.woorilog.domain.auth.entity.User
import com.woorilog.domain.ledger.entity.LedgerMember

interface LedgerMemberRepository {
    fun findAll(): List<LedgerMember>
    fun findByUser(user: User): List<LedgerMember>
    fun findByUserId(userId: Long): List<LedgerMember>
    fun findByLedgerIdAndUserId(ledgerId: Long, userId: Long): LedgerMember?
    fun findFirstByLedgerIdAndUserIdAndLeftAtIsNullOrderByJoinedAtDesc(ledgerId: Long, userId: Long): LedgerMember?
    fun findByLedgerIdAndLeftAtIsNullOrderById(ledgerId: Long): List<LedgerMember>
    fun existsByLedgerIdAndUserId(ledgerId: Long, userId: Long): Boolean
    fun findByLedgerId(ledgerId: Long): List<LedgerMember>
    fun save(ledgerMember: LedgerMember): LedgerMember
}
