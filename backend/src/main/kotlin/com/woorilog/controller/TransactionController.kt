package com.woorilog.controller

import com.woorilog.domain.CategoryType
import com.woorilog.domain.PaymentMethod
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
        @Valid @RequestBody request: CreateTransactionApiRequest
    ): TransactionResponse {
        return transactionService.createTransaction(
            principal.userId,
            ledgerId,
            CreateTransactionRequest(
                type = request.type,
                amount = request.amount,
                transactionDate = request.transactionDate,
                categoryId = request.categoryId,
                memo = request.memo,
                payerUserId = request.payerUserId,
                installmentMonths = request.installmentMonths,
                paymentMethod = request.paymentMethod,
                cardId = request.cardId,
            )
        )
    }

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
        @Valid @RequestBody request: UpdateTransactionApiRequest
    ): TransactionResponse {
        return transactionService.updateTransaction(
            principal.userId,
            transactionId,
            UpdateTransactionRequest(
                type = request.type,
                amount = request.amount,
                transactionDate = request.transactionDate,
                categoryId = request.categoryId,
                memo = request.memo,
                payerUserId = request.payerUserId,
                paymentMethod = request.paymentMethod,
                cardId = request.cardId,
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
