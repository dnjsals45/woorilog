package com.woorilog.infrastructure.persistence.ledger

import com.woorilog.domain.auth.entity.User
import com.woorilog.domain.ledger.entity.LedgerMember
import com.woorilog.domain.ledger.repository.LedgerMemberRepository
import org.springframework.stereotype.Repository

@Repository
class LedgerMemberRepositoryImpl(
    private val jpaRepository: LedgerMemberJpaRepository,
) : LedgerMemberRepository {
    override fun findAll(): List<LedgerMember> = jpaRepository.findAll()
    override fun findByUser(user: User) = jpaRepository.findByUser(user)
    override fun findByUserId(userId: Long) = jpaRepository.findByUserId(userId)
    override fun findByLedgerIdAndUserId(ledgerId: Long, userId: Long) = jpaRepository.findByLedgerIdAndUserId(ledgerId, userId)
    override fun findFirstByLedgerIdAndUserIdAndLeftAtIsNullOrderByJoinedAtDesc(ledgerId: Long, userId: Long) =
        jpaRepository.findFirstByLedgerIdAndUserIdAndLeftAtIsNullOrderByJoinedAtDesc(ledgerId, userId)
    override fun findByLedgerIdAndLeftAtIsNullOrderById(ledgerId: Long) = jpaRepository.findByLedgerIdAndLeftAtIsNullOrderById(ledgerId)
    override fun existsByLedgerIdAndUserId(ledgerId: Long, userId: Long) = jpaRepository.existsByLedgerIdAndUserId(ledgerId, userId)
    override fun findByLedgerId(ledgerId: Long) = jpaRepository.findByLedgerId(ledgerId)
    override fun save(ledgerMember: LedgerMember): LedgerMember = jpaRepository.save(ledgerMember)
}
