package com.woorilog.domain.notification.entity

import com.woorilog.common.entity.BaseEntity
import com.woorilog.domain.auth.entity.User

import jakarta.persistence.*

@Entity
@Table(name = "notification_preferences", uniqueConstraints = [UniqueConstraint(columnNames = ["user_id"])])
class NotificationPreference(
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false)
    var user: User,
    @Column(name = "budget_warning_80_enabled", nullable = false)
    var budgetWarning80Enabled: Boolean = true,
    @Column(name = "weekly_guide_enabled", nullable = false)
    var weeklyGuideEnabled: Boolean = true,
) : BaseEntity()
