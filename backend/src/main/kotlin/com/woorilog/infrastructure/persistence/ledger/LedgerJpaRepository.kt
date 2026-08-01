package com.woorilog.infrastructure.persistence.ledger

import com.woorilog.domain.ledger.entity.Ledger
import jakarta.persistence.LockModeType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface LedgerJpaRepository : JpaRepository<Ledger, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select ledger from Ledger ledger where ledger.id = :ledgerId")
    fun findByIdForUpdate(@Param("ledgerId") ledgerId: Long): Ledger?
}
