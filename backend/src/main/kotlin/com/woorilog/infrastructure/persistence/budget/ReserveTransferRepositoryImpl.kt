package com.woorilog.infrastructure.persistence.budget

import com.woorilog.domain.budget.entity.ReserveTransfer
import com.woorilog.domain.budget.repository.ReserveTransferRepository
import org.springframework.stereotype.Repository

@Repository
class ReserveTransferRepositoryImpl(
    private val jpaRepository: ReserveTransferJpaRepository,
) : ReserveTransferRepository {
    override fun findByBudgetPeriodIdOrderByCreatedAt(budgetPeriodId: Long) = jpaRepository.findByBudgetPeriodIdOrderByCreatedAt(budgetPeriodId)
    override fun save(reserveTransfer: ReserveTransfer): ReserveTransfer = jpaRepository.save(reserveTransfer)
}
