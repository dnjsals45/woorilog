package com.woorilog.domain

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import jakarta.persistence.LockModeType

@Repository
interface LedgerRepository : JpaRepository<Ledger, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select ledger from Ledger ledger where ledger.id = :ledgerId")
    fun findByIdForUpdate(@Param("ledgerId") ledgerId: Long): Ledger?
}
