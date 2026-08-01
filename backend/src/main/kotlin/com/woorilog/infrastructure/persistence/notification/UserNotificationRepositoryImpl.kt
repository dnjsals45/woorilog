package com.woorilog.infrastructure.persistence.notification

import com.woorilog.domain.notification.entity.UserNotification
import com.woorilog.domain.notification.repository.UserNotificationRepository
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Repository
import java.time.Instant

@Repository
class UserNotificationRepositoryImpl(
    private val jpaRepository: UserNotificationJpaRepository,
) : UserNotificationRepository {
    override fun findByIdOrNull(id: Long): UserNotification? = jpaRepository.findById(id).orElse(null)
    override fun findTop50ByUserIdOrderByCreatedAtDesc(userId: Long) = jpaRepository.findTop50ByUserIdOrderByCreatedAtDesc(userId)
    override fun existsByUserIdAndUniqueKey(userId: Long, uniqueKey: String) = jpaRepository.existsByUserIdAndUniqueKey(userId, uniqueKey)
    override fun countByUserIdAndReadAtIsNull(userId: Long) = jpaRepository.countByUserIdAndReadAtIsNull(userId)
    override fun findV1Page(userId: Long, ledgerId: Long?, unreadOnly: Boolean, cursor: Long?, limit: Int) =
        jpaRepository.findV1Page(userId, ledgerId, unreadOnly, cursor, PageRequest.of(0, limit))
    override fun markAllReadByUserId(userId: Long, readAt: Instant) = jpaRepository.markAllReadByUserId(userId, readAt)
    override fun save(userNotification: UserNotification): UserNotification = jpaRepository.save(userNotification)
}
