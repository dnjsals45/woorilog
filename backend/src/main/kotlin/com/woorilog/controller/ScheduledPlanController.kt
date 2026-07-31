package com.woorilog.controller

import com.woorilog.domain.ScheduleFrequency
import com.woorilog.domain.ScheduledPauseReason
import com.woorilog.security.UserPrincipal
import com.woorilog.service.*
import jakarta.validation.constraints.NotNull
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import java.time.LocalDate

@RestController
class ScheduledPlanController(private val scheduledPlanService: ScheduledPlanService) {
    @GetMapping("/api/ledgers/{ledgerId}/scheduled-plans")
    fun list(
        @AuthenticationPrincipal p: UserPrincipal,
        @PathVariable ledgerId: Long,
        @RequestParam(required = false) status: com.woorilog.domain.ScheduledPlanStatus?,
        @RequestParam(required = false) kind: com.woorilog.domain.ScheduledPlanType?,
        @RequestParam(required = false) fixedExpense: Boolean?,
    ) = scheduledPlanService.list(p.userId, ledgerId, status, kind, fixedExpense)
    @PostMapping("/api/ledgers/{ledgerId}/scheduled-plans/recurring-expenses")
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@AuthenticationPrincipal p: UserPrincipal, @PathVariable ledgerId: Long, @RequestBody r: RecurringPlanRequest) = scheduledPlanService.createRecurring(p.userId, ledgerId, r)
    @PutMapping("/api/scheduled-plans/{planId}") fun update(@AuthenticationPrincipal p: UserPrincipal, @PathVariable planId: Long, @RequestBody r: UpdateScheduledPlanRequest) = scheduledPlanService.updateFuture(p.userId, planId, r)
    @PostMapping("/api/scheduled-plans/{planId}/pause") fun pause(@AuthenticationPrincipal p: UserPrincipal, @PathVariable planId: Long, @RequestBody(required = false) r: PauseRequest?) = scheduledPlanService.pause(p.userId, planId, r?.reason ?: ScheduledPauseReason.USER_REQUEST)
    @PostMapping("/api/scheduled-plans/{planId}/resume") fun resume(@AuthenticationPrincipal p: UserPrincipal, @PathVariable planId: Long, @RequestBody r: ResumeRequest) = scheduledPlanService.resume(p.userId, planId, r.nextDueDate)
    @DeleteMapping("/api/scheduled-plans/{planId}") fun delete(@AuthenticationPrincipal p: UserPrincipal, @PathVariable planId: Long): ResponseEntity<Void> { scheduledPlanService.delete(p.userId, planId); return ResponseEntity.noContent().build() }
    @GetMapping("/api/ledgers/{ledgerId}/fixed-expenses") fun fixed(@AuthenticationPrincipal p: UserPrincipal, @PathVariable ledgerId: Long) = scheduledPlanService.fixedExpenses(p.userId, ledgerId)
}
data class PauseRequest(val reason: ScheduledPauseReason?)
data class ResumeRequest(@field:NotNull val nextDueDate: LocalDate)
