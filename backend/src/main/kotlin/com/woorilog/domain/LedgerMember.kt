package com.woorilog.domain

import jakarta.persistence.*
import java.time.Instant

enum class LedgerRole {
    OWNER, MEMBER
}

@Entity
@Table(name = "ledger_members")
class LedgerMember(
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ledger_id", nullable = false)
    var ledger: Ledger,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    var user: User,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var role: LedgerRole,

    @Column(name = "joined_at", nullable = false)
    var joinedAt: Instant = Instant.EPOCH,

    @Column(name = "left_at")
    var leftAt: Instant? = null,

    @Column(name = "leave_reason")
    var leaveReason: String? = null,
) : BaseEntity()
