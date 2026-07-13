package com.woorilog.controller

import com.woorilog.security.UserPrincipal
import com.woorilog.service.NotificationListResponse
import com.woorilog.service.NotificationResponse
import com.woorilog.service.NotificationService
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/notifications")
class NotificationController(private val notificationService: NotificationService) {
    @GetMapping
    fun getNotifications(@AuthenticationPrincipal principal: UserPrincipal): NotificationListResponse =
        notificationService.getNotifications(principal.userId)

    @PostMapping("/{notificationId}/read")
    fun markRead(@AuthenticationPrincipal principal: UserPrincipal, @PathVariable notificationId: Long): NotificationResponse =
        notificationService.markRead(principal.userId, notificationId)

    @PostMapping("/read-all")
    fun markAllRead(@AuthenticationPrincipal principal: UserPrincipal): ResponseEntity<Void> {
        notificationService.markAllRead(principal.userId)
        return ResponseEntity.noContent().build()
    }
}
