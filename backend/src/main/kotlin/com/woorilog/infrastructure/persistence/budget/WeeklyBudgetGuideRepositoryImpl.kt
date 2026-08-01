package com.woorilog.infrastructure.persistence.budget

import com.woorilog.domain.budget.entity.WeeklyBudgetGuide
import com.woorilog.domain.budget.repository.WeeklyBudgetGuideRepository
import org.springframework.stereotype.Repository
import java.time.LocalDate

@Repository
class WeeklyBudgetGuideRepositoryImpl(
    private val jpaRepository: WeeklyBudgetGuideJpaRepository,
) : WeeklyBudgetGuideRepository {
    override fun existsByUserIdAndLedgerIdAndWeekStartDateAndBudgetPeriodId(userId: Long, ledgerId: Long, weekStartDate: LocalDate, budgetPeriodId: Long) =
        jpaRepository.existsByUserIdAndLedgerIdAndWeekStartDateAndBudgetPeriodId(userId, ledgerId, weekStartDate, budgetPeriodId)
    override fun findFirstByUserIdAndLedgerIdOrderByWeekStartDateDesc(userId: Long, ledgerId: Long) =
        jpaRepository.findFirstByUserIdAndLedgerIdOrderByWeekStartDateDesc(userId, ledgerId)
    override fun save(weeklyBudgetGuide: WeeklyBudgetGuide): WeeklyBudgetGuide = jpaRepository.save(weeklyBudgetGuide)
}
