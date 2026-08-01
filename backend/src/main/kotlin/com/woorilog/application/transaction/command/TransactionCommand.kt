package com.woorilog.application.transaction.command

import com.woorilog.domain.transaction.entity.BudgetSource
import com.woorilog.domain.transaction.entity.V1PaymentMethod
import com.woorilog.domain.category.entity.CategoryType
import com.woorilog.domain.transaction.entity.PaymentMethod
import com.woorilog.domain.transaction.policy.BudgetScopeType
import com.woorilog.domain.transaction.policy.LedgerTransactionType
import com.woorilog.domain.transaction.policy.TransferType
import java.time.Instant
import java.time.LocalDate

data class CreateTransactionCommand(
    val type: CategoryType,
    val amount: Long,
    val transactionDate: LocalDate,
    val categoryId: Long?,
    val memo: String?,
    val payerUserId: Long?,
    val installmentMonths: Int?,
    val paymentMethod: PaymentMethod?,
    val cardId: Long?,
)

data class QuickTransactionCommand(
    val text: String,
    val transactionDate: LocalDate?
)

data class UpdateTransactionCommand(
    val type: CategoryType,
    val amount: Long,
    val transactionDate: LocalDate,
    val categoryId: Long?,
    val memo: String?,
    val payerUserId: Long?,
    val paymentMethod: PaymentMethod?,
    val cardId: Long?,
)

data class V1InstallmentCommand(val months: Int, val monthlyInterest: Long = 0)

data class V1TransactionCommand(
    val type: CategoryType,
    val amount: Long,
    val occurredOn: LocalDate,
    val merchant: String,
    val categoryId: Long?,
    val memo: String?,
    val transferType: TransferType?,
    val scope: BudgetSource?,
    val budgetSource: BudgetSource?,
    val payerUserId: Long? = null,
    val sharedWithPartner: Boolean?,
    val paymentMethod: V1PaymentMethod?,
    val occurredAt: Instant?,
    val installment: V1InstallmentCommand? = null,
)

data class V1TransactionListCommand(
    val periodStart: LocalDate?,
    val query: String?,
    val types: Set<LedgerTransactionType>,
    val categoryGroupCodes: Set<String>,
    val scopes: Set<BudgetScopeType>,
    val kinds: Set<String>,
    val shared: Boolean?,
    val unclassified: Boolean,
    val cursor: String?,
    val limit: Int,
)
