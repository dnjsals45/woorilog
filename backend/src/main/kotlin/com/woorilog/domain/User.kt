package com.woorilog.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint

@Entity
@Table(
    name = "users",
    uniqueConstraints = [
        UniqueConstraint(columnNames = ["provider", "provider_user_id"])
    ]
)
class User(
    @Column(nullable = false)
    var provider: String,

    @Column(name = "provider_user_id", nullable = false)
    var providerUserId: String,

    @Column(nullable = true)
    var email: String?,

    @Column(nullable = false)
    var nickname: String,

    @Column(name = "last_used_ledger_id", nullable = true)
    var lastUsedLedgerId: Long? = null
) : BaseEntity()
