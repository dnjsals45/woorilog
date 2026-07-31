package com.woorilog.controller

import com.woorilog.domain.CategoryType
import com.woorilog.domain.PaymentMethod
import com.woorilog.domain.BudgetScopeType
import com.woorilog.domain.TransferType
import com.fasterxml.jackson.databind.JsonNode
import com.woorilog.security.UserPrincipal
import com.woorilog.service.*
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.time.LocalDate

@RestController
class TransactionController(
    private val transactionService: TransactionService
) {

    @PostMapping("/api/ledgers/{ledgerId}/transactions")
    fun createTransaction(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @RequestBody request: JsonNode
    ): TransactionResponse {
        if (request.has("occurredOn") || request.has("merchant") || request.has("scope") || request.has("budgetSource")) {
            return transactionService.createV1Transaction(principal.userId, ledgerId, request.toV1Request())
        }
        val legacy = request.toLegacyCreateRequest()
        return transactionService.createTransaction(
            principal.userId,
            ledgerId,
            CreateTransactionRequest(
                type = legacy.type, amount = legacy.amount, transactionDate = legacy.transactionDate, categoryId = legacy.categoryId, memo = legacy.memo, payerUserId = legacy.payerUserId, installmentMonths = legacy.installmentMonths, paymentMethod = legacy.paymentMethod, cardId = legacy.cardId,
            )
        )
    }

    @GetMapping("/api/ledgers/{ledgerId}/transactions")
    fun listTransactions(@AuthenticationPrincipal principal: UserPrincipal, @PathVariable ledgerId: Long,
        @RequestParam(required = false) periodStart: LocalDate?, @RequestParam(required = false) query: String?,
        @RequestParam(required = false) types: String?, @RequestParam(defaultValue = "false") unclassified: Boolean,
        @RequestParam(required = false) categoryGroupCodes: String?, @RequestParam(required = false) scopes: String?,
        @RequestParam(required = false) kinds: String?, @RequestParam(required = false) shared: Boolean?,
        @RequestParam(required = false) cursor: String?, @RequestParam(defaultValue = "20") limit: Int): V1TransactionListResponse =
        transactionService.listV1Transactions(principal.userId, ledgerId, V1TransactionListRequest(periodStart, query,
            types.toValues().map { com.woorilog.domain.LedgerTransactionType.valueOf(it) }.toSet(),
            categoryGroupCodes.toValues().toSet(), scopes.toValues().map(BudgetScopeType::valueOf).toSet(),
            kinds.toValues().toSet(), shared, unclassified, cursor, limit))

    @PatchMapping("/api/transactions/{transactionId}/visibility")
    fun updateVisibility(@AuthenticationPrincipal principal: UserPrincipal, @PathVariable transactionId: Long, @RequestBody request: VisibilityRequest) =
        transactionService.updateVisibility(principal.userId, transactionId, request.sharedWithPartner)

    @PutMapping("/api/ledgers/{ledgerId}/transaction-sharing-default")
    fun updateSharingDefault(@AuthenticationPrincipal principal: UserPrincipal, @PathVariable ledgerId: Long, @RequestBody request: SharingDefaultRequest): ResponseEntity<Void> {
        transactionService.updateSharingDefault(principal.userId, ledgerId, request.shareNewPersonalTransactions, request.shareExistingPersonalTransactions); return ResponseEntity.noContent().build()
    }
    @GetMapping("/api/ledgers/{ledgerId}/transaction-entry-defaults")
    fun entryDefaults(@AuthenticationPrincipal principal: UserPrincipal, @PathVariable ledgerId: Long) = transactionService.entryDefaults(principal.userId, ledgerId)
    @GetMapping("/api/ledgers/{ledgerId}/merchant-suggestions")
    fun merchantSuggestions(@AuthenticationPrincipal principal: UserPrincipal, @PathVariable ledgerId: Long, @RequestParam query: String) = transactionService.merchantSuggestions(principal.userId, ledgerId, query)
    @PostMapping("/api/ledgers/{ledgerId}/transactions/bulk-classify")
    fun bulkClassify(@AuthenticationPrincipal principal: UserPrincipal, @PathVariable ledgerId: Long, @RequestBody request: BulkClassifyRequest) = transactionService.bulkClassify(principal.userId, ledgerId, request.transactionIds, request.categoryId)

    @PostMapping("/api/ledgers/{ledgerId}/quick-transactions")
    fun quickTransaction(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @Valid @RequestBody request: QuickTransactionApiRequest
    ): TransactionResponse {
        return transactionService.quickTransaction(
            principal.userId,
            ledgerId,
            QuickTransactionRequest(
                text = request.text,
                transactionDate = request.transactionDate
            )
        )
    }

    @GetMapping("/api/ledgers/{ledgerId}/months/{budgetMonth}/transactions")
    fun getMonthTransactions(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @PathVariable budgetMonth: String
    ): List<TransactionResponse> {
        return transactionService.getMonthTransactions(principal.userId, ledgerId, budgetMonth)
    }

    @GetMapping("/api/transactions/{transactionId}")
    fun getTransaction(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable transactionId: Long
    ): TransactionResponse {
        return transactionService.getTransaction(principal.userId, transactionId)
    }

    @PutMapping("/api/transactions/{transactionId}")
    fun updateTransaction(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable transactionId: Long,
        @RequestBody request: JsonNode
    ): TransactionResponse {
        if (request.has("occurredOn") || request.has("merchant") || request.has("scope") || request.has("budgetSource")) {
            return transactionService.updateV1Transaction(principal.userId, transactionId, request.toV1Request())
        }
        val legacy = request.toLegacyUpdateRequest()
        return transactionService.updateTransaction(
            principal.userId,
            transactionId,
            UpdateTransactionRequest(
                type = legacy.type,
                amount = legacy.amount,
                transactionDate = legacy.transactionDate,
                categoryId = legacy.categoryId,
                memo = legacy.memo,
                payerUserId = legacy.payerUserId,
                paymentMethod = legacy.paymentMethod,
                cardId = legacy.cardId,
            )
        )
    }

    @DeleteMapping("/api/transactions/{transactionId}")
    fun deleteTransaction(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable transactionId: Long,
    ): ResponseEntity<Void> {
        transactionService.deleteTransaction(principal.userId, transactionId)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/api/transactions/bulk-delete")
    fun bulkDeleteTransactions(
        @AuthenticationPrincipal principal: UserPrincipal,
        @Valid @RequestBody request: BulkDeleteTransactionsApiRequest,
    ): ResponseEntity<Void> {
        transactionService.bulkDeleteTransactions(principal.userId, request.transactionIds ?: emptyList())
        return ResponseEntity.noContent().build()
    }
}

data class BulkDeleteTransactionsApiRequest(
    @field:NotNull(message = "거래 ID 목록은 필수입니다.")
    val transactionIds: List<Long?>?,
)

data class CreateTransactionApiRequest(
    @field:NotNull(message = "거래 유형은 필수입니다.")
    val type: CategoryType,

    @field:NotNull(message = "금액은 필수입니다.")
    val amount: Long,

    @field:NotNull(message = "거래 일자는 필수입니다.")
    val transactionDate: LocalDate,

    val categoryId: Long?,

    val memo: String?,

    val payerUserId: Long?,

    val installmentMonths: Int?,

    val paymentMethod: PaymentMethod?,

    val cardId: Long?,
)

data class QuickTransactionApiRequest(
    @field:NotBlank(message = "텍스트는 필수입니다.")
    val text: String,

    val transactionDate: LocalDate?
)

data class UpdateTransactionApiRequest(
    @field:NotNull(message = "거래 유형은 필수입니다.")
    val type: CategoryType,

    @field:NotNull(message = "금액은 필수입니다.")
    val amount: Long,

    @field:NotNull(message = "거래 일자는 필수입니다.")
    val transactionDate: LocalDate,

    val categoryId: Long?,

    val memo: String?,

    val payerUserId: Long?,

    val paymentMethod: PaymentMethod?,

    val cardId: Long?,
)

data class VisibilityRequest(val sharedWithPartner: Boolean)
data class SharingDefaultRequest(val shareNewPersonalTransactions: Boolean, val shareExistingPersonalTransactions: Boolean)
data class BulkClassifyRequest(val transactionIds: List<Long>, val categoryId: Long)

private fun JsonNode.toLegacyCreateRequest(): CreateTransactionApiRequest = CreateTransactionApiRequest(
    type = CategoryType.valueOf(requiredText("type")), amount = requiredLong("amount"), transactionDate = LocalDate.parse(requiredText("transactionDate", "occurredOn")),
    categoryId = longOrNull("categoryId"), memo = textOrNull("memo"), payerUserId = longOrNull("payerUserId"), installmentMonths = intOrNull("installmentMonths"), paymentMethod = paymentNode("paymentMethod")?.type, cardId = longOrNull("cardId"),
)
private fun JsonNode.toLegacyUpdateRequest(): UpdateTransactionApiRequest = UpdateTransactionApiRequest(
    type = CategoryType.valueOf(requiredText("type")), amount = requiredLong("amount"), transactionDate = LocalDate.parse(requiredText("transactionDate")),
    categoryId = longOrNull("categoryId"), memo = textOrNull("memo"), payerUserId = longOrNull("payerUserId"), paymentMethod = paymentNode("paymentMethod")?.type, cardId = longOrNull("cardId"),
)
private fun JsonNode.toV1Request(): V1TransactionRequest {
    val installment = get("installment")
    return V1TransactionRequest(CategoryType.valueOf(requiredText("type")), requiredLong("amount"), LocalDate.parse(requiredText("occurredOn", "transactionDate")), requiredText("merchant"), longOrNull("categoryId"), textOrNull("memo"), textOrNull("transferType")?.let(TransferType::valueOf), source("scope"), source("budgetSource"), longOrNull("payerUserId"), booleanOrNull("sharedWithPartner"), paymentNode("paymentMethod"), textOrNull("occurredAt")?.let(java.time.Instant::parse), installment?.takeUnless { it.isNull }?.let { V1InstallmentRequest(it.path("months").asInt(), it.path("monthlyInterest").asLong(0)) })
}
private fun String?.toValues(): List<String> = this?.split(',')?.map(String::trim)?.filter(String::isNotBlank) ?: emptyList()
private fun JsonNode.source(name: String): BudgetSource? = get(name)?.takeUnless { it.isNull }?.let { BudgetSource(BudgetScopeType.valueOf(it.requiredText("type")), it.longOrNull("ownerUserId")) }
private fun JsonNode.paymentNode(name: String): V1PaymentMethod? = get(name)?.takeUnless { it.isNull }?.let { node -> if (node.isTextual) V1PaymentMethod(PaymentMethod.valueOf(node.asText())) else V1PaymentMethod(PaymentMethod.valueOf(node.requiredText("type")), node.textOrNull("displayName")) }
private fun JsonNode.requiredText(vararg names: String): String = names.asSequence().mapNotNull { textOrNull(it) }.firstOrNull()?.takeIf { it.isNotBlank() } ?: throw IllegalArgumentException("필수 값이 없습니다.")
private fun JsonNode.requiredLong(name: String): Long = get(name)?.takeIf { it.isNumber }?.asLong() ?: throw IllegalArgumentException("필수 값이 없습니다.")
private fun JsonNode.textOrNull(name: String): String? = get(name)?.takeUnless { it.isNull }?.asText()
private fun JsonNode.longOrNull(name: String): Long? = get(name)?.takeIf { it.isNumber }?.asLong()
private fun JsonNode.intOrNull(name: String): Int? = get(name)?.takeIf { it.isNumber }?.asInt()
private fun JsonNode.booleanOrNull(name: String): Boolean? = get(name)?.takeUnless { it.isNull }?.asBoolean()
