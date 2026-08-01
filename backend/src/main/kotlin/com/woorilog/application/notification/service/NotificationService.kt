package com.woorilog.application.notification.service

import com.woorilog.domain.auth.repository.UserRepository
import com.woorilog.domain.ledger.repository.LedgerMemberRepository
import com.woorilog.domain.notification.entity.NotificationPreference
import com.woorilog.domain.notification.entity.NotificationType
import com.woorilog.domain.notification.entity.UserNotification
import com.woorilog.domain.notification.repository.NotificationPreferenceRepository
import com.woorilog.domain.notification.repository.UserNotificationRepository
import com.woorilog.application.notification.result.NotificationPreferencesResult
import com.woorilog.application.notification.result.V1NotificationListResult
import com.woorilog.application.notification.result.toResult
import com.woorilog.application.notification.result.toV1Result
import com.woorilog.common.exception.ForbiddenException
import com.woorilog.common.exception.NotFoundException
import com.woorilog.common.exception.WoorilogException
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
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
    fun getNotifications(userId: Long, ledgerId: Long?, unreadOnly: Boolean, cursor: String?, limit: Int): V1NotificationListResult {
        val cursorId = cursor?.toLongOrNull() ?: if (cursor == null) null else throw WoorilogException("INVALID_REQUEST", "알림 cursor 형식이 올바르지 않습니다.", HttpStatus.BAD_REQUEST)
        val pageSize = limit.coerceIn(1, 100)
        val page = notificationRepository.findV1Page(userId, ledgerId, unreadOnly, cursorId, pageSize + 1)
        val items = if (page.size > pageSize) page.dropLast(1) else page
        return V1NotificationListResult(
            items = items.map { it.toV1Result() },
            unreadCount = notificationRepository.countByUserIdAndReadAtIsNull(userId),
            nextCursor = if (page.size > pageSize) items.last().id.toString() else null,
            notifications = notificationRepository.findTop50ByUserIdOrderByCreatedAtDesc(userId).map { it.toResult() },
        )
    }

    fun markRead(userId: Long, notificationId: Long) {
        val notification = notificationRepository.findByIdOrNull(notificationId) ?: throw NotFoundException("알림을 찾을 수 없습니다.")
        if (notification.user.id != userId) throw ForbiddenException("알림을 변경할 권한이 없습니다.")
        if (notification.readAt == null) notification.readAt = clock.instant()
        notificationRepository.save(notification)
    }

    fun markAllRead(userId: Long) {
        notificationRepository.markAllReadByUserId(userId, clock.instant())
    }

    fun notifyUser(userId: Long, type: NotificationType, title: String, message: String, targetPath: String?, uniqueKey: String, ledgerId: Long? = null, budgetPeriodStart: LocalDate? = null) {
        if (notificationRepository.existsByUserIdAndUniqueKey(userId, uniqueKey)) return
        val user = userRepository.findByIdOrNull(userId) ?: return
        notificationRepository.save(UserNotification(user, type, title, message, targetPath, ledgerId, budgetPeriodStart, uniqueKey))
    }

    fun notifyLedgerMembers(ledgerId: Long, type: NotificationType, title: String, message: String, targetPath: String?, uniqueKey: String) {
        ledgerMemberRepository.findByLedgerId(ledgerId).forEach { member ->
            notifyUser(member.user.id!!, type, title, message, targetPath, "$uniqueKey-${member.user.id}", ledgerId)
        }
    }

    @Transactional(readOnly = true)
    fun preferences(userId: Long): NotificationPreferencesResult {
        val preference = notificationPreferenceRepository.findByUserId(userId)
        return NotificationPreferencesResult(preference?.budgetWarning80Enabled ?: true, preference?.weeklyGuideEnabled ?: true)
    }

    fun updatePreferences(userId: Long, budgetWarning80Enabled: Boolean, weeklyGuideEnabled: Boolean): NotificationPreferencesResult {
        val user = userRepository.findByIdOrNull(userId) ?: throw ForbiddenException("사용자를 찾을 수 없습니다.")
        val preference = notificationPreferenceRepository.findByUserId(userId) ?: NotificationPreference(user)
        preference.budgetWarning80Enabled = budgetWarning80Enabled
        preference.weeklyGuideEnabled = weeklyGuideEnabled
        notificationPreferenceRepository.save(preference)
        return NotificationPreferencesResult(preference.budgetWarning80Enabled, preference.weeklyGuideEnabled)
    }
}
