package com.woorilog.domain

import jakarta.persistence.*
import java.time.Instant

enum class NotificationType { INVITATION, BUDGET, MONTH_CLOSED, SYSTEM }

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

    @Column(name = "unique_key", nullable = false)
    val uniqueKey: String,

    @Column(name = "read_at")
    var readAt: Instant? = null,
) : BaseEntity()
