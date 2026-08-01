package com.woorilog.domain.notification.repository

import com.woorilog.domain.notification.entity.NotificationPreference

interface NotificationPreferenceRepository {
    fun findByUserId(userId: Long): NotificationPreference?
    fun save(notificationPreference: NotificationPreference): NotificationPreference
}
