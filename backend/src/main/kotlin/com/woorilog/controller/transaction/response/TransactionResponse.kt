package com.woorilog.controller.transaction.response

import com.woorilog.application.transaction.result.BulkClassifyResult
import com.woorilog.application.transaction.result.CategorySummaryResult
import com.woorilog.application.transaction.result.InstallmentSummaryResult
import com.woorilog.application.transaction.result.MerchantSuggestionResult
import com.woorilog.application.transaction.result.MerchantSuggestionsResult
import com.woorilog.application.transaction.result.PayerSummaryResult
import com.woorilog.application.transaction.result.PaymentCardSummaryResult
import com.woorilog.application.transaction.result.TransactionEntryDefaultsResult
import com.woorilog.application.transaction.result.TransactionResult
import com.woorilog.application.transaction.result.TransactionScheduleSummaryResult
import com.woorilog.application.transaction.result.V1TransactionListResult
import com.woorilog.domain.category.entity.CategoryType
import com.woorilog.domain.transaction.entity.BudgetSource
import com.woorilog.domain.transaction.entity.PaymentMethod
import com.woorilog.domain.transaction.entity.V1PaymentMethod
import com.woorilog.domain.transaction.policy.TransferType
import java.time.Instant
import java.time.LocalDate

data class CategorySummary(
    val id: Long,
    val name: String,
    val type: CategoryType,
    val categoryId: Long = id,
    val groupCode: String? = null,
    val groupName: String? = null,
    val categoryName: String = name,
)

data class PayerSummary(
    val id: Long,
    val nickname: String
)

data class PaymentCardSummary(
    val id: Long,
    val name: String,
)

data class InstallmentSummary(
    val planId: String,
    val sequence: Int,
    val totalCount: Int,
)

data class TransactionScheduleSummary(val kind: String, val planId: Long, val sequence: Int, val totalSequences: Int?)

data class TransactionResponse(
    val id: Long,
    val ledgerId: Long,
    val type: CategoryType,
    val amount: Long,
    val occurredOn: LocalDate,
    val transactionDate: LocalDate,
    val category: CategorySummary?,
    val payer: PayerSummary,
    val memo: String?,
    val paymentMethod: V1PaymentMethod?,
    val legacyPaymentMethod: PaymentMethod,
    val card: PaymentCardSummary?,
    val installment: InstallmentSummary?,
    val merchant: String? = null,
    val transferType: TransferType? = null,
    val scope: BudgetSource? = null,
    val budgetSource: BudgetSource? = null,
    val sharedWithPartner: Boolean? = null,
    val occurredAt: Instant? = null,
    val schedule: TransactionScheduleSummary? = null,
    val lastModifiedBy: PayerSummary? = null,
    val lastModifiedAt: Instant? = null,
)

data class V1TransactionListResponse(val items: List<TransactionResponse>, val nextCursor: String?, val unclassifiedCount: Int)
data class TransactionEntryDefaultsResponse(val budgetSource: BudgetSource, val shareNewPersonalTransactions: Boolean)
data class MerchantSuggestion(val merchant: String, val suggestedCategoryId: Long?)
data class MerchantSuggestionsResponse(val items: List<MerchantSuggestion>)
data class BulkClassifyResponse(val transactionIds: List<Long>)

fun CategorySummaryResult.toResponse() = CategorySummary(id, name, type, categoryId, groupCode, groupName, categoryName)
fun PayerSummaryResult.toResponse() = PayerSummary(id, nickname)
fun PaymentCardSummaryResult.toResponse() = PaymentCardSummary(id, name)
fun InstallmentSummaryResult.toResponse() = InstallmentSummary(planId, sequence, totalCount)
fun TransactionScheduleSummaryResult.toResponse() = TransactionScheduleSummary(kind, planId, sequence, totalSequences)

fun TransactionResult.toResponse() = TransactionResponse(
    id = id,
    ledgerId = ledgerId,
    type = type,
    amount = amount,
    occurredOn = occurredOn,
    transactionDate = transactionDate,
    category = category?.toResponse(),
    payer = payer.toResponse(),
    memo = memo,
    paymentMethod = paymentMethod,
    legacyPaymentMethod = legacyPaymentMethod,
    card = card?.toResponse(),
    installment = installment?.toResponse(),
    merchant = merchant,
    transferType = transferType,
    scope = scope,
    budgetSource = budgetSource,
    sharedWithPartner = sharedWithPartner,
    occurredAt = occurredAt,
    schedule = schedule?.toResponse(),
    lastModifiedBy = lastModifiedBy?.toResponse(),
    lastModifiedAt = lastModifiedAt,
)

fun V1TransactionListResult.toResponse() = V1TransactionListResponse(items.map { it.toResponse() }, nextCursor, unclassifiedCount)
fun TransactionEntryDefaultsResult.toResponse() = TransactionEntryDefaultsResponse(budgetSource, shareNewPersonalTransactions)
fun MerchantSuggestionResult.toResponse() = MerchantSuggestion(merchant, suggestedCategoryId)
fun MerchantSuggestionsResult.toResponse() = MerchantSuggestionsResponse(items.map { it.toResponse() })
fun BulkClassifyResult.toResponse() = BulkClassifyResponse(transactionIds)
