package com.woorilog.infrastructure.persistence.budget

import com.woorilog.domain.budget.entity.MemberAllocation
import com.woorilog.domain.budget.repository.MemberAllocationRepository
import org.springframework.stereotype.Repository

@Repository
class MemberAllocationRepositoryImpl(
    private val jpaRepository: MemberAllocationJpaRepository,
) : MemberAllocationRepository {
    override fun findByLedgerMonthId(ledgerMonthId: Long) = jpaRepository.findByLedgerMonthId(ledgerMonthId)
    override fun deleteByLedgerMonthId(ledgerMonthId: Long) = jpaRepository.deleteByLedgerMonthId(ledgerMonthId)
    override fun saveAll(memberAllocations: List<MemberAllocation>): List<MemberAllocation> = jpaRepository.saveAll(memberAllocations)
    override fun flush() = jpaRepository.flush()
}
