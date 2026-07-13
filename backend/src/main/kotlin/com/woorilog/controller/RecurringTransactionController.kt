package com.woorilog.controller

import com.woorilog.domain.CategoryType
import com.woorilog.domain.RecurringFrequency
import com.woorilog.security.UserPrincipal
import com.woorilog.service.*
import jakarta.validation.Valid
import jakarta.validation.constraints.NotNull
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import java.time.LocalDate
import java.time.Clock

@RestController
class RecurringTransactionController(
    private val recurringTransactionService: RecurringTransactionService,
    private val clock: Clock,
) {

    @GetMapping("/api/ledgers/{ledgerId}/recurring-transactions")
    fun getTemplates(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long
    ): List<RecurringTransactionTemplateResponse> {
        return recurringTransactionService.getTemplates(principal.userId, ledgerId)
    }

    @PostMapping("/api/ledgers/{ledgerId}/recurring-transactions")
    fun createTemplate(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @Valid @RequestBody request: CreateRecurringTemplateApiRequest
    ): RecurringTransactionTemplateResponse {
        return recurringTransactionService.createTemplate(
            principal.userId,
            ledgerId,
            CreateRecurringTemplateRequest(
                type = request.type,
                amount = request.amount,
                categoryId = request.categoryId,
                memo = request.memo,
                payerUserId = request.payerUserId,
                frequency = request.frequency,
                startDate = request.startDate,
                endDate = request.endDate
            )
        )
    }

    @PutMapping("/api/recurring-transactions/{templateId}")
    fun updateTemplate(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable templateId: Long,
        @Valid @RequestBody request: UpdateRecurringTemplateApiRequest
    ): RecurringTransactionTemplateResponse {
        return recurringTransactionService.updateTemplate(
            principal.userId,
            templateId,
            UpdateRecurringTemplateRequest(
                type = request.type,
                amount = request.amount,
                categoryId = request.categoryId,
                memo = request.memo,
                payerUserId = request.payerUserId,
                frequency = request.frequency,
                startDate = request.startDate,
                endDate = request.endDate
            )
        )
    }

    @PostMapping("/api/recurring-transactions/{templateId}/pause")
    fun pauseTemplate(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable templateId: Long
    ): RecurringTransactionTemplateResponse {
        return recurringTransactionService.pauseTemplate(principal.userId, templateId)
    }

    @PostMapping("/api/recurring-transactions/{templateId}/resume")
    fun resumeTemplate(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable templateId: Long
    ): RecurringTransactionTemplateResponse {
        return recurringTransactionService.resumeTemplate(principal.userId, templateId)
    }

    @GetMapping("/api/ledgers/{ledgerId}/recurring-transactions/due")
    fun getDueTemplates(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) asOf: LocalDate?
    ): List<RecurringTransactionDueResponse> {
        val targetAsOf = asOf ?: LocalDate.now(clock)
        return recurringTransactionService.getDueTemplates(principal.userId, ledgerId, targetAsOf)
    }

    @PostMapping("/api/ledgers/{ledgerId}/recurring-transactions/generate")
    fun generateTransactions(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) asOf: LocalDate?
    ): List<TransactionResponse> {
        val targetAsOf = asOf ?: LocalDate.now(clock)
        return recurringTransactionService.generateTransactions(principal.userId, ledgerId, targetAsOf)
    }
}

data class CreateRecurringTemplateApiRequest(
    @field:NotNull(message = "거래 유형은 필수입니다.")
    val type: CategoryType,

    @field:NotNull(message = "금액은 필수입니다.")
    val amount: Long,

    val categoryId: Long?,

    val memo: String?,

    val payerUserId: Long?,

    @field:NotNull(message = "주기는 필수입니다.")
    val frequency: RecurringFrequency,

    @field:NotNull(message = "시작일은 필수입니다.")
    val startDate: LocalDate,

    val endDate: LocalDate?
)

data class UpdateRecurringTemplateApiRequest(
    @field:NotNull(message = "거래 유형은 필수입니다.")
    val type: CategoryType,

    @field:NotNull(message = "금액은 필수입니다.")
    val amount: Long,

    val categoryId: Long?,

    val memo: String?,

    val payerUserId: Long?,

    @field:NotNull(message = "주기는 필수입니다.")
    val frequency: RecurringFrequency,

    @field:NotNull(message = "시작일은 필수입니다.")
    val startDate: LocalDate,

    val endDate: LocalDate?
)
