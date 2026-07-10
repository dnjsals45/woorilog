package com.woorilog.domain

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface LedgerRepository : JpaRepository<Ledger, Long>
