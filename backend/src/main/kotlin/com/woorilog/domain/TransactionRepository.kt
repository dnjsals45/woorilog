package com.woorilog.domain

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.time.LocalDate

@Repository
interface TransactionRepository : JpaRepository<Transaction, Long> {
    fun existsByCategoryId(categoryId: Long): Boolean

    fun findByLedgerIdAndTransactionDateBetweenOrderByTransactionDateDescIdDesc(
        ledgerId: Long,
        startDate: LocalDate,
        endDate: LocalDate
    ): List<Transaction>
}
