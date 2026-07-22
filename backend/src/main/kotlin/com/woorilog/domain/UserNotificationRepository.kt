package com.woorilog.domain

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.time.Instant

@Repository
interface UserNotificationRepository : JpaRepository<UserNotification, Long> {
    fun findTop50ByUserIdOrderByCreatedAtDesc(userId: Long): List<UserNotification>
    fun existsByUserIdAndUniqueKey(userId: Long, uniqueKey: String): Boolean
    fun countByUserIdAndReadAtIsNull(userId: Long): Long

    @Modifying(clearAutomatically = true)
    @Query("update UserNotification notification set notification.readAt = :readAt where notification.user.id = :userId and notification.readAt is null")
    fun markAllReadByUserId(@Param("userId") userId: Long, @Param("readAt") readAt: Instant): Int
}
