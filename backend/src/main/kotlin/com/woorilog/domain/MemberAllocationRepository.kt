package com.woorilog.domain

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface MemberAllocationRepository : JpaRepository<MemberAllocation, Long> {
    fun findByLedgerMonthId(ledgerMonthId: Long): List<MemberAllocation>
    fun deleteByLedgerMonthId(ledgerMonthId: Long)
}
