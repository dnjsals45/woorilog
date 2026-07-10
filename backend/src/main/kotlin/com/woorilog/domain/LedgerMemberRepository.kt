package com.woorilog.domain

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface LedgerMemberRepository : JpaRepository<LedgerMember, Long> {
    fun findByUser(user: User): List<LedgerMember>
    fun findByUserId(userId: Long): List<LedgerMember>
    fun findByLedgerIdAndUserId(ledgerId: Long, userId: Long): LedgerMember?
    fun existsByLedgerIdAndUserId(ledgerId: Long, userId: Long): Boolean
    fun findByLedgerId(ledgerId: Long): List<LedgerMember>
}
