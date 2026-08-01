package com.woorilog.controller.scheduled

import com.woorilog.common.security.UserPrincipal
import com.woorilog.application.scheduled.service.RecurringTransactionService
import com.woorilog.controller.scheduled.request.CreateRecurringTemplateApiRequest
import com.woorilog.controller.scheduled.request.UpdateRecurringTemplateApiRequest
import com.woorilog.controller.scheduled.response.RecurringTransactionDueResponse
import com.woorilog.controller.scheduled.response.RecurringTransactionTemplateResponse
import com.woorilog.controller.scheduled.response.toResponse
import com.woorilog.controller.transaction.response.TransactionResponse
import com.woorilog.controller.transaction.response.toResponse
import jakarta.validation.Valid
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.http.ResponseEntity
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
        return recurringTransactionService.getTemplates(principal.userId, ledgerId).map { it.toResponse() }
    }

    @PostMapping("/api/ledgers/{ledgerId}/recurring-transactions")
    fun createTemplate(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @Valid @RequestBody request: CreateRecurringTemplateApiRequest
    ): RecurringTransactionTemplateResponse {
        return recurringTransactionService.createTemplate(principal.userId, ledgerId, request.toCommand()).toResponse()
    }

    @PutMapping("/api/recurring-transactions/{templateId}")
    fun updateTemplate(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable templateId: Long,
        @Valid @RequestBody request: UpdateRecurringTemplateApiRequest
    ): RecurringTransactionTemplateResponse {
        return recurringTransactionService.updateTemplate(principal.userId, templateId, request.toCommand()).toResponse()
    }

    @DeleteMapping("/api/recurring-transactions/{templateId}")
    fun deleteTemplate(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable templateId: Long,
    ): ResponseEntity<Void> {
        recurringTransactionService.deleteTemplate(principal.userId, templateId)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/api/recurring-transactions/{templateId}/pause")
    fun pauseTemplate(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable templateId: Long
    ): RecurringTransactionTemplateResponse {
        return recurringTransactionService.pauseTemplate(principal.userId, templateId).toResponse()
    }

    @PostMapping("/api/recurring-transactions/{templateId}/resume")
    fun resumeTemplate(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable templateId: Long
    ): RecurringTransactionTemplateResponse {
        return recurringTransactionService.resumeTemplate(principal.userId, templateId).toResponse()
    }

    @GetMapping("/api/ledgers/{ledgerId}/recurring-transactions/due")
    fun getDueTemplates(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) asOf: LocalDate?
    ): List<RecurringTransactionDueResponse> {
        val targetAsOf = asOf ?: LocalDate.now(clock)
        return recurringTransactionService.getDueTemplates(principal.userId, ledgerId, targetAsOf).map { it.toResponse() }
    }

    @PostMapping("/api/ledgers/{ledgerId}/recurring-transactions/generate")
    fun generateTransactions(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) asOf: LocalDate?
    ): List<TransactionResponse> {
        val targetAsOf = asOf ?: LocalDate.now(clock)
        return recurringTransactionService.generateTransactions(principal.userId, ledgerId, targetAsOf).map { it.toResponse() }
    }
}
