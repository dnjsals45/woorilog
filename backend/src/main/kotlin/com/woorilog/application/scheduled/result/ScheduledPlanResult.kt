package com.woorilog.application.scheduled.result

import com.woorilog.application.transaction.result.TransactionResult
import com.woorilog.application.transaction.result.toResult
import com.woorilog.domain.scheduled.entity.ScheduledPlan
import com.woorilog.domain.scheduled.entity.ScheduledPlanStatus
import com.woorilog.domain.scheduled.entity.ScheduledPlanType
import com.woorilog.domain.scheduled.policy.InstallmentPolicy
import com.woorilog.domain.scheduled.policy.ScheduleFrequency
import com.woorilog.domain.transaction.entity.BudgetSource
import com.woorilog.domain.transaction.entity.Transaction
import java.time.LocalDate

data class ScheduledPlanResult(
    val id: Long,
    val type: ScheduledPlanType,
    val name: String,
    val amount: Long,
    val frequency: ScheduleFrequency?,
    val status: ScheduledPlanStatus,
    val nextDueDate: LocalDate,
    val isFixedExpense: Boolean,
    val categoryId: Long?,
    val categoryName: String?,
    val budgetSource: BudgetSource?,
    val totalAmount: Long?,
    val round: Int?,
    val totalRounds: Int?,
    val principalAmount: Long?,
    val monthlyInterest: Long?,
    val firstTransaction: TransactionResult? = null,
) {
    companion object {
        // completedRounds는 지금까지 발생 처리(GENERATED)된 회차 수입니다. 회차/원금 표기는 할부(INSTALLMENT) 계획에만 의미가 있습니다.
        fun from(plan: ScheduledPlan, transaction: Transaction? = null, completedRounds: Int? = null): ScheduledPlanResult {
            val isInstallment = plan.type == ScheduledPlanType.INSTALLMENT
            val totalRounds = plan.installmentTotalCount
            val round = (completedRounds ?: 0).coerceAtLeast(1).let { if (totalRounds != null) minOf(it, totalRounds) else it }
            return ScheduledPlanResult(
                id = plan.id!!,
                type = plan.type,
                name = plan.name,
                amount = plan.amount,
                frequency = plan.frequency,
                status = plan.status,
                nextDueDate = plan.nextDueDate,
                isFixedExpense = plan.fixedExpense,
                categoryId = plan.category?.id,
                categoryName = plan.category?.name,
                budgetSource = plan.scopeType?.let { BudgetSource(it, plan.scopeOwnerUserId) },
                totalAmount = plan.totalPrincipalAmount,
                round = if (isInstallment) round else null,
                totalRounds = if (isInstallment) totalRounds else null,
                principalAmount = if (isInstallment && plan.totalPrincipalAmount != null && totalRounds != null) {
                    InstallmentPolicy.principalForSequence(plan.totalPrincipalAmount!!, totalRounds, round)
                } else null,
                monthlyInterest = if (isInstallment) plan.monthlyInterestAmount else null,
                firstTransaction = transaction?.toResult(),
            )
        }
    }
}

data class ScheduledPlanCreationResult(val plan: ScheduledPlanResult, val firstTransaction: Transaction)
