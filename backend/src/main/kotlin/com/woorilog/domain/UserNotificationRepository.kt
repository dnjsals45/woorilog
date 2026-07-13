package com.woorilog.domain

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface UserNotificationRepository : JpaRepository<UserNotification, Long> {
    fun findTop50ByUserIdOrderByCreatedAtDesc(userId: Long): List<UserNotification>
    fun existsByUserIdAndUniqueKey(userId: Long, uniqueKey: String): Boolean
    fun countByUserIdAndReadAtIsNull(userId: Long): Long
}
