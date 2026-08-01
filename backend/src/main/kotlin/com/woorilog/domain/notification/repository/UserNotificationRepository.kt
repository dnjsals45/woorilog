package com.woorilog.domain.notification.repository

import com.woorilog.domain.notification.entity.UserNotification
import java.time.Instant

interface UserNotificationRepository {
    fun findByIdOrNull(id: Long): UserNotification?
    fun findTop50ByUserIdOrderByCreatedAtDesc(userId: Long): List<UserNotification>
    fun existsByUserIdAndUniqueKey(userId: Long, uniqueKey: String): Boolean
    fun countByUserIdAndReadAtIsNull(userId: Long): Long

    fun findV1Page(
        userId: Long,
        ledgerId: Long?,
        unreadOnly: Boolean,
        cursor: Long?,
        limit: Int,
    ): List<UserNotification>

    fun markAllReadByUserId(userId: Long, readAt: Instant): Int

    fun save(userNotification: UserNotification): UserNotification
}
