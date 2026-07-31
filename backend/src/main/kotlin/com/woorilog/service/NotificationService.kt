package com.woorilog.service

import com.woorilog.domain.*
import com.woorilog.exception.ForbiddenException
import com.woorilog.exception.NotFoundException
import com.woorilog.exception.WoorilogException
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.data.domain.PageRequest
import java.time.Clock
import java.time.Instant
import java.time.LocalDate

@Service
@Transactional
class NotificationService(
    private val notificationRepository: UserNotificationRepository,
    private val userRepository: UserRepository,
    private val ledgerMemberRepository: LedgerMemberRepository,
    private val notificationPreferenceRepository: NotificationPreferenceRepository,
    private val clock: Clock,
) {
    @Transactional(readOnly = true)
    fun getNotifications(userId: Long, ledgerId: Long?, unreadOnly: Boolean, cursor: String?, limit: Int): V1NotificationListResponse {
        val cursorId = cursor?.toLongOrNull() ?: if (cursor == null) null else throw WoorilogException("INVALID_REQUEST", "알림 cursor 형식이 올바르지 않습니다.", HttpStatus.BAD_REQUEST)
        val pageSize = limit.coerceIn(1, 100)
        val page = notificationRepository.findV1Page(userId, ledgerId, unreadOnly, cursorId, PageRequest.of(0, pageSize + 1))
        val items = if (page.size > pageSize) page.dropLast(1) else page
        return V1NotificationListResponse(
            items = items.map(V1NotificationResponse::from),
            unreadCount = notificationRepository.countByUserIdAndReadAtIsNull(userId),
            nextCursor = if (page.size > pageSize) items.last().id.toString() else null,
            notifications = notificationRepository.findTop50ByUserIdOrderByCreatedAtDesc(userId).map(NotificationResponse::from),
        )
    }

    fun markRead(userId: Long, notificationId: Long) {
        val notification = notificationRepository.findById(notificationId).orElseThrow { NotFoundException("알림을 찾을 수 없습니다.") }
        if (notification.user.id != userId) throw ForbiddenException("알림을 변경할 권한이 없습니다.")
        if (notification.readAt == null) notification.readAt = clock.instant()
        notificationRepository.save(notification)
    }

    fun markAllRead(userId: Long) {
        notificationRepository.markAllReadByUserId(userId, clock.instant())
    }

    fun notifyUser(userId: Long, type: NotificationType, title: String, message: String, targetPath: String?, uniqueKey: String, ledgerId: Long? = null, budgetPeriodStart: LocalDate? = null) {
        if (notificationRepository.existsByUserIdAndUniqueKey(userId, uniqueKey)) return
        val user = userRepository.findById(userId).orElse(null) ?: return
        notificationRepository.save(UserNotification(user, type, title, message, targetPath, ledgerId, budgetPeriodStart, uniqueKey))
    }

    fun notifyLedgerMembers(ledgerId: Long, type: NotificationType, title: String, message: String, targetPath: String?, uniqueKey: String) {
        ledgerMemberRepository.findByLedgerId(ledgerId).forEach { member ->
            notifyUser(member.user.id!!, type, title, message, targetPath, "$uniqueKey-${member.user.id}", ledgerId)
        }
    }

    @Transactional(readOnly = true)
    fun preferences(userId: Long): NotificationPreferencesResponse {
        val preference = notificationPreferenceRepository.findByUserId(userId)
        return NotificationPreferencesResponse(preference?.budgetWarning80Enabled ?: true, preference?.weeklyGuideEnabled ?: true)
    }

    fun updatePreferences(userId: Long, budgetWarning80Enabled: Boolean, weeklyGuideEnabled: Boolean): NotificationPreferencesResponse {
        val user = userRepository.findById(userId).orElseThrow { ForbiddenException("사용자를 찾을 수 없습니다.") }
        val preference = notificationPreferenceRepository.findByUserId(userId) ?: NotificationPreference(user)
        preference.budgetWarning80Enabled = budgetWarning80Enabled
        preference.weeklyGuideEnabled = weeklyGuideEnabled
        notificationPreferenceRepository.save(preference)
        return NotificationPreferencesResponse(preference.budgetWarning80Enabled, preference.weeklyGuideEnabled)
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
data class V1NotificationListResponse(val items: List<V1NotificationResponse>, val unreadCount: Long, val nextCursor: String?, val notifications: List<NotificationResponse>)
data class V1NotificationResponse(val id: Long, val type: NotificationType, val title: String, val message: String, val ledgerId: Long?, val budgetPeriodStart: LocalDate?, val targetPath: String?, val read: Boolean, val createdAt: Instant) {
    companion object {
        fun from(notification: UserNotification) = V1NotificationResponse(notification.id!!, notification.type, notification.title, notification.message, notification.ledgerId, notification.budgetPeriodStart, notification.targetPath, notification.readAt != null, notification.createdAt)
    }
}
data class NotificationPreferencesResponse(val budgetWarning80Enabled: Boolean, val weeklyGuideEnabled: Boolean)
