package com.woorilog.controller.transaction

import com.woorilog.domain.category.entity.CategoryType
import com.woorilog.domain.transaction.entity.BudgetSource
import com.woorilog.domain.transaction.entity.PaymentMethod
import com.woorilog.domain.transaction.entity.V1PaymentMethod
import com.woorilog.domain.transaction.policy.BudgetScopeType
import com.woorilog.domain.transaction.policy.TransferType
import com.woorilog.domain.transaction.policy.LedgerTransactionType
import com.fasterxml.jackson.databind.JsonNode
import com.woorilog.common.security.UserPrincipal
import com.woorilog.application.transaction.command.V1InstallmentCommand
import com.woorilog.application.transaction.command.V1TransactionCommand
import com.woorilog.application.transaction.command.V1TransactionListCommand
import com.woorilog.application.transaction.service.TransactionService
import com.woorilog.controller.transaction.request.BulkClassifyRequest
import com.woorilog.controller.transaction.request.BulkDeleteTransactionsApiRequest
import com.woorilog.controller.transaction.request.CreateTransactionApiRequest
import com.woorilog.controller.transaction.request.QuickTransactionApiRequest
import com.woorilog.controller.transaction.request.SharingDefaultRequest
import com.woorilog.controller.transaction.request.UpdateTransactionApiRequest
import com.woorilog.controller.transaction.request.VisibilityRequest
import com.woorilog.controller.transaction.response.BulkClassifyResponse
import com.woorilog.controller.transaction.response.MerchantSuggestionsResponse
import com.woorilog.controller.transaction.response.TransactionEntryDefaultsResponse
import com.woorilog.controller.transaction.response.TransactionResponse
import com.woorilog.controller.transaction.response.V1TransactionListResponse
import com.woorilog.controller.transaction.response.toResponse
import jakarta.validation.Valid
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
            return transactionService.createV1Transaction(principal.userId, ledgerId, request.toV1Command()).toResponse()
        }
        val legacy = request.toLegacyCreateRequest()
        return transactionService.createTransaction(
            principal.userId,
            ledgerId,
            legacy.toCommand(),
        ).toResponse()
    }

    @GetMapping("/api/ledgers/{ledgerId}/transactions")
    fun listTransactions(@AuthenticationPrincipal principal: UserPrincipal, @PathVariable ledgerId: Long,
        @RequestParam(required = false) periodStart: LocalDate?, @RequestParam(required = false) query: String?,
        @RequestParam(required = false) types: String?, @RequestParam(defaultValue = "false") unclassified: Boolean,
        @RequestParam(required = false) categoryGroupCodes: String?, @RequestParam(required = false) scopes: String?,
        @RequestParam(required = false) kinds: String?, @RequestParam(required = false) shared: Boolean?,
        @RequestParam(required = false) cursor: String?, @RequestParam(defaultValue = "20") limit: Int): V1TransactionListResponse =
        transactionService.listV1Transactions(principal.userId, ledgerId, V1TransactionListCommand(periodStart, query,
            types.toValues().map { LedgerTransactionType.valueOf(it) }.toSet(),
            categoryGroupCodes.toValues().toSet(), scopes.toValues().map(BudgetScopeType::valueOf).toSet(),
            kinds.toValues().toSet(), shared, unclassified, cursor, limit)).toResponse()

    @PatchMapping("/api/transactions/{transactionId}/visibility")
    fun updateVisibility(@AuthenticationPrincipal principal: UserPrincipal, @PathVariable transactionId: Long, @RequestBody request: VisibilityRequest): TransactionResponse =
        transactionService.updateVisibility(principal.userId, transactionId, request.sharedWithPartner).toResponse()

    @PutMapping("/api/ledgers/{ledgerId}/transaction-sharing-default")
    fun updateSharingDefault(@AuthenticationPrincipal principal: UserPrincipal, @PathVariable ledgerId: Long, @RequestBody request: SharingDefaultRequest): ResponseEntity<Void> {
        transactionService.updateSharingDefault(principal.userId, ledgerId, request.shareNewPersonalTransactions, request.shareExistingPersonalTransactions); return ResponseEntity.noContent().build()
    }
    @GetMapping("/api/ledgers/{ledgerId}/transaction-entry-defaults")
    fun entryDefaults(@AuthenticationPrincipal principal: UserPrincipal, @PathVariable ledgerId: Long): TransactionEntryDefaultsResponse =
        transactionService.entryDefaults(principal.userId, ledgerId).toResponse()
    @GetMapping("/api/ledgers/{ledgerId}/merchant-suggestions")
    fun merchantSuggestions(@AuthenticationPrincipal principal: UserPrincipal, @PathVariable ledgerId: Long, @RequestParam query: String): MerchantSuggestionsResponse =
        transactionService.merchantSuggestions(principal.userId, ledgerId, query).toResponse()
    @PostMapping("/api/ledgers/{ledgerId}/transactions/bulk-classify")
    fun bulkClassify(@AuthenticationPrincipal principal: UserPrincipal, @PathVariable ledgerId: Long, @RequestBody request: BulkClassifyRequest): BulkClassifyResponse =
        transactionService.bulkClassify(principal.userId, ledgerId, request.transactionIds, request.categoryId).toResponse()

    @PostMapping("/api/ledgers/{ledgerId}/quick-transactions")
    fun quickTransaction(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @Valid @RequestBody request: QuickTransactionApiRequest
    ): TransactionResponse {
        return transactionService.quickTransaction(
            principal.userId,
            ledgerId,
            request.toCommand(),
        ).toResponse()
    }

    @GetMapping("/api/ledgers/{ledgerId}/months/{budgetMonth}/transactions")
    fun getMonthTransactions(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @PathVariable budgetMonth: String
    ): List<TransactionResponse> {
        return transactionService.getMonthTransactions(principal.userId, ledgerId, budgetMonth).map { it.toResponse() }
    }

    @GetMapping("/api/transactions/{transactionId}")
    fun getTransaction(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable transactionId: Long
    ): TransactionResponse {
        return transactionService.getTransaction(principal.userId, transactionId).toResponse()
    }

    @PutMapping("/api/transactions/{transactionId}")
    fun updateTransaction(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable transactionId: Long,
        @RequestBody request: JsonNode
    ): TransactionResponse {
        if (request.has("occurredOn") || request.has("merchant") || request.has("scope") || request.has("budgetSource")) {
            return transactionService.updateV1Transaction(principal.userId, transactionId, request.toV1Command()).toResponse()
        }
        val legacy = request.toLegacyUpdateRequest()
        return transactionService.updateTransaction(
            principal.userId,
            transactionId,
            legacy.toCommand(),
        ).toResponse()
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

private fun JsonNode.toLegacyCreateRequest(): CreateTransactionApiRequest = CreateTransactionApiRequest(
    type = CategoryType.valueOf(requiredText("type")), amount = requiredLong("amount"), transactionDate = LocalDate.parse(requiredText("transactionDate", "occurredOn")),
    categoryId = longOrNull("categoryId"), memo = textOrNull("memo"), payerUserId = longOrNull("payerUserId"), installmentMonths = intOrNull("installmentMonths"), paymentMethod = paymentNode("paymentMethod")?.type, cardId = longOrNull("cardId"),
)
private fun JsonNode.toLegacyUpdateRequest(): UpdateTransactionApiRequest = UpdateTransactionApiRequest(
    type = CategoryType.valueOf(requiredText("type")), amount = requiredLong("amount"), transactionDate = LocalDate.parse(requiredText("transactionDate")),
    categoryId = longOrNull("categoryId"), memo = textOrNull("memo"), payerUserId = longOrNull("payerUserId"), paymentMethod = paymentNode("paymentMethod")?.type, cardId = longOrNull("cardId"),
)
private fun JsonNode.toV1Command(): V1TransactionCommand {
    val installment = get("installment")
    return V1TransactionCommand(CategoryType.valueOf(requiredText("type")), requiredLong("amount"), LocalDate.parse(requiredText("occurredOn", "transactionDate")), requiredText("merchant"), longOrNull("categoryId"), textOrNull("memo"), textOrNull("transferType")?.let(TransferType::valueOf), source("scope"), source("budgetSource"), longOrNull("payerUserId"), booleanOrNull("sharedWithPartner"), paymentNode("paymentMethod"), textOrNull("occurredAt")?.let(java.time.Instant::parse), installment?.takeUnless { it.isNull }?.let { V1InstallmentCommand(it.path("months").asInt(), it.path("monthlyInterest").asLong(0)) }, longOrNull("cardId"))
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
