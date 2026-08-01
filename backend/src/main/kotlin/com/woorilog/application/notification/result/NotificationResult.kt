package com.woorilog.application.notification.result

import com.woorilog.domain.notification.entity.NotificationType
import com.woorilog.domain.notification.entity.UserNotification
import java.time.Instant
import java.time.LocalDate

data class NotificationListResult(val unreadCount: Long, val notifications: List<NotificationResult>)
data class NotificationResult(val id: Long, val type: NotificationType, val title: String, val message: String, val targetPath: String?, val readAt: Instant?, val createdAt: Instant)

fun UserNotification.toResult() = NotificationResult(
    id!!, type, title, message, targetPath, readAt, createdAt,
)

data class V1NotificationListResult(val items: List<V1NotificationResult>, val unreadCount: Long, val nextCursor: String?, val notifications: List<NotificationResult>)
data class V1NotificationResult(val id: Long, val type: NotificationType, val title: String, val message: String, val ledgerId: Long?, val budgetPeriodStart: LocalDate?, val targetPath: String?, val read: Boolean, val createdAt: Instant)

fun UserNotification.toV1Result() = V1NotificationResult(
    id!!, type, title, message, ledgerId, budgetPeriodStart, targetPath, readAt != null, createdAt,
)

data class NotificationPreferencesResult(val budgetWarning80Enabled: Boolean, val weeklyGuideEnabled: Boolean)
