package com.woorilog.domain.budget.repository

import com.woorilog.domain.budget.entity.MemberAllocation

interface MemberAllocationRepository {
    fun findByLedgerMonthId(ledgerMonthId: Long): List<MemberAllocation>
    fun deleteByLedgerMonthId(ledgerMonthId: Long)
    fun saveAll(memberAllocations: List<MemberAllocation>): List<MemberAllocation>
    fun flush()
}
