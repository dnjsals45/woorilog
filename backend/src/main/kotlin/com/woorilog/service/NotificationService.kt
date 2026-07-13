package com.woorilog.service

import com.woorilog.domain.*
import com.woorilog.exception.ForbiddenException
import com.woorilog.exception.NotFoundException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.Instant

@Service
@Transactional
class NotificationService(
    private val notificationRepository: UserNotificationRepository,
    private val userRepository: UserRepository,
    private val ledgerMemberRepository: LedgerMemberRepository,
    private val clock: Clock,
) {
    @Transactional(readOnly = true)
    fun getNotifications(userId: Long): NotificationListResponse = NotificationListResponse(
        unreadCount = notificationRepository.countByUserIdAndReadAtIsNull(userId),
        notifications = notificationRepository.findTop50ByUserIdOrderByCreatedAtDesc(userId).map(NotificationResponse::from),
    )

    fun markRead(userId: Long, notificationId: Long): NotificationResponse {
        val notification = notificationRepository.findById(notificationId).orElseThrow { NotFoundException("알림을 찾을 수 없습니다.") }
        if (notification.user.id != userId) throw ForbiddenException("알림을 변경할 권한이 없습니다.")
        if (notification.readAt == null) notification.readAt = clock.instant()
        return NotificationResponse.from(notificationRepository.save(notification))
    }

    fun markAllRead(userId: Long) {
        val now = clock.instant()
        val unread = notificationRepository.findTop50ByUserIdOrderByCreatedAtDesc(userId).filter { it.readAt == null }
        unread.forEach { it.readAt = now }
        notificationRepository.saveAll(unread)
    }

    fun notifyUser(userId: Long, type: NotificationType, title: String, message: String, targetPath: String?, uniqueKey: String) {
        if (notificationRepository.existsByUserIdAndUniqueKey(userId, uniqueKey)) return
        val user = userRepository.findById(userId).orElse(null) ?: return
        notificationRepository.save(UserNotification(user, type, title, message, targetPath, uniqueKey))
    }

    fun notifyLedgerMembers(ledgerId: Long, type: NotificationType, title: String, message: String, targetPath: String?, uniqueKey: String) {
        ledgerMemberRepository.findByLedgerId(ledgerId).forEach { member ->
            notifyUser(member.user.id!!, type, title, message, targetPath, "$uniqueKey-${member.user.id}")
        }
    }
}

data class NotificationListResponse(val unreadCount: Long, val notifications: List<NotificationResponse>)
data class NotificationResponse(val id: Long, val type: NotificationType, val title: String, val message: String, val targetPath: String?, val readAt: Instant?, val createdAt: Instant) {
    companion object {
        fun from(notification: UserNotification) = NotificationResponse(
            notification.id!!, notification.type, notification.title, notification.message,
            notification.targetPath, notification.readAt, notification.createdAt,
        )
    }
}
