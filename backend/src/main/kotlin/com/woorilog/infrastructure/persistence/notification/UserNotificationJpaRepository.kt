package com.woorilog.infrastructure.persistence.notification

import com.woorilog.domain.notification.entity.UserNotification
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.time.Instant

@Repository
interface UserNotificationJpaRepository : JpaRepository<UserNotification, Long> {
    fun findTop50ByUserIdOrderByCreatedAtDesc(userId: Long): List<UserNotification>
    fun existsByUserIdAndUniqueKey(userId: Long, uniqueKey: String): Boolean
    fun countByUserIdAndReadAtIsNull(userId: Long): Long

    @Query("""
        select notification from UserNotification notification
        where notification.user.id = :userId
          and (:ledgerId is null or notification.ledgerId = :ledgerId)
          and (:unreadOnly = false or notification.readAt is null)
          and (:cursor is null or notification.id < :cursor)
        order by notification.createdAt desc, notification.id desc
    """)
    fun findV1Page(
        @Param("userId") userId: Long,
        @Param("ledgerId") ledgerId: Long?,
        @Param("unreadOnly") unreadOnly: Boolean,
        @Param("cursor") cursor: Long?,
        pageable: Pageable,
    ): List<UserNotification>

    @Modifying(clearAutomatically = true)
    @Query("update UserNotification notification set notification.readAt = :readAt where notification.user.id = :userId and notification.readAt is null")
    fun markAllReadByUserId(@Param("userId") userId: Long, @Param("readAt") readAt: Instant): Int
}
