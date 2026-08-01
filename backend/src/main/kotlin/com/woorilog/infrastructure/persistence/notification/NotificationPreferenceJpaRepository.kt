package com.woorilog.infrastructure.persistence.notification

import com.woorilog.domain.notification.entity.NotificationPreference
import org.springframework.data.jpa.repository.JpaRepository

interface NotificationPreferenceJpaRepository : JpaRepository<NotificationPreference, Long> {
    fun findByUserId(userId: Long): NotificationPreference?
}
