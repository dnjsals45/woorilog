package com.woorilog.infrastructure.persistence.transaction

import com.woorilog.domain.transaction.entity.Transaction
import org.springframework.data.jpa.repository.JpaRepository
import java.time.LocalDate

interface TransactionJpaRepository : JpaRepository<Transaction, Long> {
    fun existsByCategoryId(categoryId: Long): Boolean
    fun findByCategoryId(categoryId: Long): List<Transaction>

    fun existsByCardId(cardId: Long): Boolean

    fun findByLedgerIdAndTransactionDateBetweenOrderByTransactionDateDescIdDesc(
        ledgerId: Long,
        startDate: LocalDate,
        endDate: LocalDate
    ): List<Transaction>
    fun findByLedgerIdOrderByTransactionDateDescIdDesc(ledgerId: Long): List<Transaction>
    fun findByBudgetAllocationIdAndTransactionDateBetween(
        budgetAllocationId: Long,
        startDate: LocalDate,
        endDate: LocalDate,
    ): List<Transaction>
}
