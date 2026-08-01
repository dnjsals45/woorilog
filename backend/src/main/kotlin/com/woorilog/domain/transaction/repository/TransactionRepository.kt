package com.woorilog.domain.transaction.repository

import com.woorilog.domain.transaction.entity.Transaction
import java.time.LocalDate

interface TransactionRepository {
    fun findByIdOrNull(id: Long): Transaction?
    fun getReferenceById(id: Long): Transaction
    fun findByCategoryId(categoryId: Long): List<Transaction>
    fun existsByCardId(cardId: Long): Boolean
    fun existsById(id: Long): Boolean

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

    fun save(transaction: Transaction): Transaction
    fun saveAll(transactions: List<Transaction>): List<Transaction>
    fun delete(transaction: Transaction)
    fun deleteAllByIdInBatch(ids: Collection<Long>)
}
