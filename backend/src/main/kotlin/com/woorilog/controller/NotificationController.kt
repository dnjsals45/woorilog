package com.woorilog.controller

import com.woorilog.security.UserPrincipal
import com.woorilog.service.V1NotificationListResponse
import com.woorilog.service.NotificationPreferencesResponse
import com.woorilog.service.NotificationService
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/notifications")
class NotificationController(private val notificationService: NotificationService) {
    @GetMapping
    fun getNotifications(
        @AuthenticationPrincipal principal: UserPrincipal,
        @RequestParam(required = false) ledgerId: Long?,
        @RequestParam(defaultValue = "false") unreadOnly: Boolean,
        @RequestParam(required = false) cursor: String?,
        @RequestParam(defaultValue = "20") limit: Int,
    ): V1NotificationListResponse = notificationService.getNotifications(principal.userId, ledgerId, unreadOnly, cursor, limit)

    @PostMapping("/{notificationId}/read")
    fun markRead(@AuthenticationPrincipal principal: UserPrincipal, @PathVariable notificationId: Long): ResponseEntity<Void> {
        notificationService.markRead(principal.userId, notificationId)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/read-all")
    fun markAllRead(@AuthenticationPrincipal principal: UserPrincipal): ResponseEntity<Void> {
        notificationService.markAllRead(principal.userId)
        return ResponseEntity.noContent().build()
    }
}

@RestController
@RequestMapping("/api/notification-preferences")
class NotificationPreferenceController(private val notificationService: NotificationService) {
    @GetMapping
    fun get(@AuthenticationPrincipal principal: UserPrincipal): NotificationPreferencesResponse = notificationService.preferences(principal.userId)

    @PutMapping
    fun update(
        @AuthenticationPrincipal principal: UserPrincipal,
        @RequestBody request: NotificationPreferencesRequest,
    ): NotificationPreferencesResponse = notificationService.updatePreferences(principal.userId, request.budgetWarning80Enabled, request.weeklyGuideEnabled)
}

data class NotificationPreferencesRequest(val budgetWarning80Enabled: Boolean, val weeklyGuideEnabled: Boolean)
