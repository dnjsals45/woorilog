package com.woorilog.infrastructure.persistence.transaction

import com.woorilog.domain.transaction.entity.Transaction
import com.woorilog.domain.transaction.repository.TransactionRepository
import org.springframework.stereotype.Repository
import java.time.LocalDate

@Repository
class TransactionRepositoryImpl(
    private val jpaRepository: TransactionJpaRepository,
) : TransactionRepository {
    override fun findByIdOrNull(id: Long): Transaction? = jpaRepository.findById(id).orElse(null)
    override fun getReferenceById(id: Long): Transaction = jpaRepository.getReferenceById(id)
    override fun findByCategoryId(categoryId: Long) = jpaRepository.findByCategoryId(categoryId)
    override fun existsByCardId(cardId: Long) = jpaRepository.existsByCardId(cardId)
    override fun existsById(id: Long) = jpaRepository.existsById(id)
    override fun findByLedgerIdAndTransactionDateBetweenOrderByTransactionDateDescIdDesc(ledgerId: Long, startDate: LocalDate, endDate: LocalDate) =
        jpaRepository.findByLedgerIdAndTransactionDateBetweenOrderByTransactionDateDescIdDesc(ledgerId, startDate, endDate)
    override fun findByLedgerIdOrderByTransactionDateDescIdDesc(ledgerId: Long) = jpaRepository.findByLedgerIdOrderByTransactionDateDescIdDesc(ledgerId)
    override fun findByBudgetAllocationIdAndTransactionDateBetween(budgetAllocationId: Long, startDate: LocalDate, endDate: LocalDate) =
        jpaRepository.findByBudgetAllocationIdAndTransactionDateBetween(budgetAllocationId, startDate, endDate)
    override fun save(transaction: Transaction): Transaction = jpaRepository.save(transaction)
    override fun saveAll(transactions: List<Transaction>): List<Transaction> = jpaRepository.saveAll(transactions)
    override fun delete(transaction: Transaction) = jpaRepository.delete(transaction)
    override fun deleteAllByIdInBatch(ids: Collection<Long>) = jpaRepository.deleteAllByIdInBatch(ids)
}
