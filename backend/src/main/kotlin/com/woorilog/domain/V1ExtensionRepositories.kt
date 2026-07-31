package com.woorilog.domain

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.time.LocalDate

@Repository
interface LedgerUserPreferenceRepository : JpaRepository<LedgerUserPreference, Long> {
    fun findByLedgerIdAndUserId(ledgerId: Long, userId: Long): LedgerUserPreference?
}

@Repository
interface BudgetPeriodRepository : JpaRepository<BudgetPeriod, Long> {
    fun findByLedgerIdAndStartDate(ledgerId: Long, startDate: LocalDate): BudgetPeriod?
    fun findFirstByLedgerIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
        ledgerId: Long,
        startDate: LocalDate,
        endDate: LocalDate,
    ): BudgetPeriod?
    fun findByLedgerIdOrderByStartDateDesc(ledgerId: Long): List<BudgetPeriod>
}

@Repository
interface BudgetAllocationRepository : JpaRepository<BudgetAllocation, Long> {
    fun findByBudgetPeriodIdOrderById(budgetPeriodId: Long): List<BudgetAllocation>
    fun findByBudgetPeriodIdAndScopeAndOwnerId(
        budgetPeriodId: Long,
        scope: BudgetAllocationScope,
        ownerId: Long?,
    ): BudgetAllocation?
}

@Repository
interface ReserveTransferRepository : JpaRepository<ReserveTransfer, Long> {
    fun findByBudgetPeriodIdOrderByCreatedAt(budgetPeriodId: Long): List<ReserveTransfer>
}

@Repository interface ScheduledPlanRepository : JpaRepository<ScheduledPlan, Long> {
    fun findByLedgerIdOrderByIdDesc(ledgerId: Long): List<ScheduledPlan>
    fun findByLedgerIdAndFixedExpenseTrueAndStatus(ledgerId: Long, status: ScheduledPlanStatus): List<ScheduledPlan>
}
@Repository interface ScheduledOccurrenceRepository : JpaRepository<ScheduledOccurrence, Long> {
    @org.springframework.data.jpa.repository.Query("select occurrence from ScheduledOccurrence occurrence where occurrence.status = com.woorilog.domain.ScheduledOccurrenceStatus.SCHEDULED and occurrence.dueDate <= :dueDate")
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    fun lockDue(@org.springframework.data.repository.query.Param("dueDate") dueDate: LocalDate): List<ScheduledOccurrence>
    fun findByPlanIdAndStatus(planId: Long, status: ScheduledOccurrenceStatus): List<ScheduledOccurrence>
    fun findByPlanIdOrderBySequence(planId: Long): List<ScheduledOccurrence>
    @org.springframework.data.jpa.repository.Query(
        "select occurrence from ScheduledOccurrence occurrence where occurrence.plan.ledger.id = :ledgerId and occurrence.dueDate between :startDate and :endDate and occurrence.status = :status"
    )
    fun findByLedgerAndDueDateBetweenAndStatus(
        @org.springframework.data.repository.query.Param("ledgerId") ledgerId: Long,
        @org.springframework.data.repository.query.Param("startDate") startDate: LocalDate,
        @org.springframework.data.repository.query.Param("endDate") endDate: LocalDate,
        @org.springframework.data.repository.query.Param("status") status: ScheduledOccurrenceStatus,
    ): List<ScheduledOccurrence>
}
@Repository interface ImportSessionRepository : JpaRepository<ImportSession, Long>
@Repository interface ImportCandidateRepository : JpaRepository<ImportCandidate, Long> {
    fun findByImportSessionIdOrderById(importSessionId: Long): List<ImportCandidate>
}
@Repository interface NotificationPreferenceRepository : JpaRepository<NotificationPreference, Long> {
    fun findByUserId(userId: Long): NotificationPreference?
}
@Repository interface BudgetThresholdStateRepository : JpaRepository<BudgetThresholdState, Long> {
    fun findByStateKey(stateKey: String): BudgetThresholdState?
}
@Repository interface WeeklyBudgetGuideRepository : JpaRepository<WeeklyBudgetGuide, Long> {
    fun existsByUserIdAndLedgerIdAndWeekStartDateAndBudgetPeriodId(userId: Long, ledgerId: Long, weekStartDate: LocalDate, budgetPeriodId: Long): Boolean
    fun findFirstByUserIdAndLedgerIdOrderByWeekStartDateDesc(userId: Long, ledgerId: Long): WeeklyBudgetGuide?
}
@Repository
interface AllocationCategoryBudgetRepository : JpaRepository<AllocationCategoryBudget, Long> {
    fun findByBudgetAllocationId(budgetAllocationId: Long): List<AllocationCategoryBudget>
    fun findByBudgetAllocationIdAndCategoryGroupCode(
        budgetAllocationId: Long,
        categoryGroupCode: String,
    ): AllocationCategoryBudget?
}
