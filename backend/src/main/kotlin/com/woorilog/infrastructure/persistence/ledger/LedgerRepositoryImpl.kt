package com.woorilog.infrastructure.persistence.ledger

import com.woorilog.domain.ledger.entity.Ledger
import com.woorilog.domain.ledger.repository.LedgerRepository
import org.springframework.stereotype.Repository

@Repository
class LedgerRepositoryImpl(
    private val jpaRepository: LedgerJpaRepository,
) : LedgerRepository {
    override fun findByIdOrNull(id: Long): Ledger? = jpaRepository.findById(id).orElse(null)
    override fun findAll(): List<Ledger> = jpaRepository.findAll()
    override fun findByIdForUpdate(ledgerId: Long) = jpaRepository.findByIdForUpdate(ledgerId)
    override fun getReferenceById(id: Long): Ledger = jpaRepository.getReferenceById(id)
    override fun save(ledger: Ledger): Ledger = jpaRepository.save(ledger)
}
