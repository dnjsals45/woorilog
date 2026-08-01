package com.woorilog.domain.notification.entity

import com.woorilog.common.entity.BaseEntity

import jakarta.persistence.*
import java.time.Instant
import java.time.LocalDate
import com.woorilog.domain.auth.entity.User

enum class NotificationType {
    INVITATION, BUDGET, MONTH_CLOSED, SYSTEM,
    BUDGET_THRESHOLD_80, BUDGET_THRESHOLD_100, BUDGET_PERIOD_PREPARATION, WEEKLY_GUIDE,
}

@Entity
@Table(
    name = "user_notifications",
    uniqueConstraints = [UniqueConstraint(columnNames = ["user_id", "unique_key"])],
)
class UserNotification(
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    val type: NotificationType,

    @Column(nullable = false)
    val title: String,

    @Column(nullable = false, length = 500)
    val message: String,

    @Column(name = "target_path")
    val targetPath: String?,

    @Column(name = "ledger_id")
    val ledgerId: Long? = null,

    @Column(name = "budget_period_start")
    val budgetPeriodStart: LocalDate? = null,

    @Column(name = "unique_key", nullable = false)
    val uniqueKey: String,

    @Column(name = "read_at")
    var readAt: Instant? = null,
) : BaseEntity()
