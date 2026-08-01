package com.woorilog.infrastructure.persistence.budget

import com.woorilog.domain.budget.entity.MemberAllocation
import org.springframework.data.jpa.repository.JpaRepository

interface MemberAllocationJpaRepository : JpaRepository<MemberAllocation, Long> {
    fun findByLedgerMonthId(ledgerMonthId: Long): List<MemberAllocation>
    fun deleteByLedgerMonthId(ledgerMonthId: Long)
}
