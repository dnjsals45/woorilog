package com.woorilog.controller.scheduled

import com.woorilog.domain.scheduled.entity.ScheduledPauseReason
import com.woorilog.domain.scheduled.entity.ScheduledPlanStatus
import com.woorilog.domain.scheduled.entity.ScheduledPlanType
import com.woorilog.common.security.UserPrincipal
import com.woorilog.application.scheduled.service.ScheduledPlanService
import com.woorilog.controller.scheduled.request.PauseRequest
import com.woorilog.controller.scheduled.request.RecurringPlanApiRequest
import com.woorilog.controller.scheduled.request.ResumeRequest
import com.woorilog.controller.scheduled.request.UpdateScheduledPlanApiRequest
import com.woorilog.controller.scheduled.response.toResponse
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

@RestController
class ScheduledPlanController(private val scheduledPlanService: ScheduledPlanService) {
    @GetMapping("/api/ledgers/{ledgerId}/scheduled-plans")
    fun list(
        @AuthenticationPrincipal p: UserPrincipal,
        @PathVariable ledgerId: Long,
        @RequestParam(required = false) status: ScheduledPlanStatus?,
        @RequestParam(required = false) kind: ScheduledPlanType?,
        @RequestParam(required = false) fixedExpense: Boolean?,
    ) = scheduledPlanService.list(p.userId, ledgerId, status, kind, fixedExpense).map { it.toResponse() }
    @PostMapping("/api/ledgers/{ledgerId}/scheduled-plans/recurring-expenses")
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@AuthenticationPrincipal p: UserPrincipal, @PathVariable ledgerId: Long, @RequestBody r: RecurringPlanApiRequest) = scheduledPlanService.createRecurring(p.userId, ledgerId, r.toCommand()).toResponse()
    @PutMapping("/api/scheduled-plans/{planId}") fun update(@AuthenticationPrincipal p: UserPrincipal, @PathVariable planId: Long, @RequestBody r: UpdateScheduledPlanApiRequest) = scheduledPlanService.updateFuture(p.userId, planId, r.toCommand()).toResponse()
    @PostMapping("/api/scheduled-plans/{planId}/pause") fun pause(@AuthenticationPrincipal p: UserPrincipal, @PathVariable planId: Long, @RequestBody(required = false) r: PauseRequest?) = scheduledPlanService.pause(p.userId, planId, r?.reason ?: ScheduledPauseReason.USER_REQUEST).toResponse()
    @PostMapping("/api/scheduled-plans/{planId}/resume") fun resume(@AuthenticationPrincipal p: UserPrincipal, @PathVariable planId: Long, @RequestBody r: ResumeRequest) = scheduledPlanService.resume(p.userId, planId, r.nextDueDate).toResponse()
    @DeleteMapping("/api/scheduled-plans/{planId}") fun delete(@AuthenticationPrincipal p: UserPrincipal, @PathVariable planId: Long): ResponseEntity<Void> { scheduledPlanService.delete(p.userId, planId); return ResponseEntity.noContent().build() }
    @GetMapping("/api/ledgers/{ledgerId}/fixed-expenses") fun fixed(@AuthenticationPrincipal p: UserPrincipal, @PathVariable ledgerId: Long) = scheduledPlanService.fixedExpenses(p.userId, ledgerId).map { it.toResponse() }
}
