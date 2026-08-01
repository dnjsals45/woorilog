package com.woorilog.infrastructure.persistence.notification

import com.woorilog.domain.notification.entity.NotificationPreference
import com.woorilog.domain.notification.repository.NotificationPreferenceRepository
import org.springframework.stereotype.Repository

@Repository
class NotificationPreferenceRepositoryImpl(
    private val jpaRepository: NotificationPreferenceJpaRepository,
) : NotificationPreferenceRepository {
    override fun findByUserId(userId: Long) = jpaRepository.findByUserId(userId)
    override fun save(notificationPreference: NotificationPreference): NotificationPreference = jpaRepository.save(notificationPreference)
}
