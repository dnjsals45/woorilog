package com.woorilog.controller.notification.response

import com.woorilog.application.notification.result.NotificationListResult
import com.woorilog.application.notification.result.NotificationPreferencesResult
import com.woorilog.application.notification.result.NotificationResult
import com.woorilog.application.notification.result.V1NotificationListResult
import com.woorilog.application.notification.result.V1NotificationResult
import com.woorilog.domain.notification.entity.NotificationType
import java.time.Instant
import java.time.LocalDate

data class NotificationListResponse(val unreadCount: Long, val notifications: List<NotificationResponse>)
data class NotificationResponse(val id: Long, val type: NotificationType, val title: String, val message: String, val targetPath: String?, val readAt: Instant?, val createdAt: Instant)

fun NotificationResult.toResponse() = NotificationResponse(id, type, title, message, targetPath, readAt, createdAt)
fun NotificationListResult.toResponse() = NotificationListResponse(unreadCount, notifications.map { it.toResponse() })

data class V1NotificationListResponse(val items: List<V1NotificationResponse>, val unreadCount: Long, val nextCursor: String?, val notifications: List<NotificationResponse>)
data class V1NotificationResponse(val id: Long, val type: NotificationType, val title: String, val message: String, val ledgerId: Long?, val budgetPeriodStart: LocalDate?, val targetPath: String?, val read: Boolean, val createdAt: Instant)

fun V1NotificationResult.toResponse() = V1NotificationResponse(id, type, title, message, ledgerId, budgetPeriodStart, targetPath, read, createdAt)
fun V1NotificationListResult.toResponse() = V1NotificationListResponse(
    items = items.map { it.toResponse() },
    unreadCount = unreadCount,
    nextCursor = nextCursor,
    notifications = notifications.map { it.toResponse() },
)

data class NotificationPreferencesResponse(val budgetWarning80Enabled: Boolean, val weeklyGuideEnabled: Boolean)

fun NotificationPreferencesResult.toResponse() = NotificationPreferencesResponse(budgetWarning80Enabled, weeklyGuideEnabled)
