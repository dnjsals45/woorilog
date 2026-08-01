package com.woorilog.application.transaction.result

import com.woorilog.domain.category.entity.CategoryType
import com.woorilog.domain.transaction.entity.BudgetSource
import com.woorilog.domain.transaction.entity.PaymentMethod
import com.woorilog.domain.transaction.entity.Transaction
import com.woorilog.domain.transaction.entity.V1PaymentMethod
import com.woorilog.domain.transaction.policy.BudgetScopeType
import com.woorilog.domain.transaction.policy.LedgerTransactionType
import com.woorilog.domain.transaction.policy.TransferType
import java.time.Instant
import java.time.LocalDate

data class CategorySummaryResult(
    val id: Long,
    val name: String,
    val type: CategoryType,
    val categoryId: Long = id,
    val groupCode: String? = null,
    val groupName: String? = null,
    val categoryName: String = name,
)

data class PayerSummaryResult(
    val id: Long,
    val nickname: String
)

data class PaymentCardSummaryResult(
    val id: Long,
    val name: String,
)

data class InstallmentSummaryResult(
    val planId: String,
    val sequence: Int,
    val totalCount: Int,
)

data class TransactionScheduleSummaryResult(val kind: String, val planId: Long, val sequence: Int, val totalSequences: Int?)

data class TransactionResult(
    val id: Long,
    val ledgerId: Long,
    val type: CategoryType,
    val amount: Long,
    val occurredOn: LocalDate,
    val transactionDate: LocalDate,
    val category: CategorySummaryResult?,
    val payer: PayerSummaryResult,
    val memo: String?,
    val paymentMethod: V1PaymentMethod?,
    val legacyPaymentMethod: PaymentMethod,
    val card: PaymentCardSummaryResult?,
    val installment: InstallmentSummaryResult?,
    val merchant: String? = null,
    val transferType: TransferType? = null,
    val scope: BudgetSource? = null,
    val budgetSource: BudgetSource? = null,
    val sharedWithPartner: Boolean? = null,
    val occurredAt: Instant? = null,
    val schedule: TransactionScheduleSummaryResult? = null,
    val lastModifiedBy: PayerSummaryResult? = null,
    val lastModifiedAt: Instant? = null,
)

data class V1TransactionListResult(val items: List<TransactionResult>, val nextCursor: String?, val unclassifiedCount: Int)
data class TransactionEntryDefaultsResult(val budgetSource: BudgetSource, val shareNewPersonalTransactions: Boolean)
data class MerchantSuggestionResult(val merchant: String, val suggestedCategoryId: Long?)
data class MerchantSuggestionsResult(val items: List<MerchantSuggestionResult>)
data class BulkClassifyResult(val transactionIds: List<Long>)

fun Transaction.toResult() = TransactionResult(
    id = this.id!!,
    ledgerId = this.ledger.id!!,
    type = this.type,
    amount = this.amount,
    occurredOn = this.transactionDate,
    transactionDate = this.transactionDate,
    category = this.category?.let { CategorySummaryResult(it.id!!, this.categoryName ?: it.name, it.type, it.id!!, this.categoryGroupCode, this.categoryGroupName, this.categoryName ?: it.name) },
    payer = PayerSummaryResult(this.payer.id!!, this.payer.nickname),
    memo = this.memo,
    paymentMethod = this.paymentMethodType?.let { V1PaymentMethod(it, this.paymentMethodDisplayName) }
        ?: V1PaymentMethod(this.paymentMethod, this.card?.name),
    legacyPaymentMethod = this.paymentMethod,
    card = this.card?.let { PaymentCardSummaryResult(it.id!!, it.name) },
    installment = this.installmentPlanId?.let {
        InstallmentSummaryResult(it, this.installmentSequence, this.installmentTotalCount)
    },
    merchant = this.merchant,
    transferType = this.transferType,
    scope = this.scopeType?.let { BudgetSource(it, this.scopeOwnerUserId) },
    budgetSource = this.budgetAllocation?.let { BudgetSource(BudgetScopeType.valueOf(it.scope.name), it.owner?.id) },
    sharedWithPartner = this.sharedWithPartner,
    occurredAt = this.occurredAt,
    schedule = this.scheduledPlan?.id?.let { TransactionScheduleSummaryResult(this.scheduleKind?.name ?: "RECURRING_EXPENSE", it, this.installmentSequence, this.installmentTotalCount.takeIf { count -> count > 1 }) },
    lastModifiedBy = this.lastModifiedBy?.let { PayerSummaryResult(it.id!!, it.nickname) },
    lastModifiedAt = this.updatedAt,
)
