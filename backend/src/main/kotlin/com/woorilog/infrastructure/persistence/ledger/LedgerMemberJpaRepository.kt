package com.woorilog.infrastructure.persistence.ledger

import com.woorilog.domain.auth.entity.User
import com.woorilog.domain.ledger.entity.LedgerMember
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface LedgerMemberJpaRepository : JpaRepository<LedgerMember, Long> {
    fun findByUser(user: User): List<LedgerMember>
    fun findByUserId(userId: Long): List<LedgerMember>
    @Query("select member from LedgerMember member where member.ledger.id = :ledgerId and member.user.id = :userId and member.leftAt is null")
    fun findByLedgerIdAndUserId(@Param("ledgerId") ledgerId: Long, @Param("userId") userId: Long): LedgerMember?
    fun findFirstByLedgerIdAndUserIdAndLeftAtIsNullOrderByJoinedAtDesc(ledgerId: Long, userId: Long): LedgerMember?
    fun findByLedgerIdAndLeftAtIsNullOrderById(ledgerId: Long): List<LedgerMember>
    @Query("select (count(member) > 0) from LedgerMember member where member.ledger.id = :ledgerId and member.user.id = :userId and member.leftAt is null")
    fun existsByLedgerIdAndUserId(@Param("ledgerId") ledgerId: Long, @Param("userId") userId: Long): Boolean
    fun findByLedgerId(ledgerId: Long): List<LedgerMember>
}
