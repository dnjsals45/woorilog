package com.woorilog.domain

import jakarta.persistence.*
import java.time.Instant

enum class InvitationType {
    DIRECT, LINK
}

enum class InvitationStatus {
    PENDING, ACCEPTED, REJECTED, CANCELLED, EXPIRED
}

@Entity
@Table(name = "invitations")
class Invitation(
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ledger_id", nullable = false)
    var ledger: Ledger,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inviter_id", nullable = false)
    var inviter: User,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invitee_id", nullable = true)
    var invitee: User? = null,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var type: InvitationType,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: InvitationStatus = InvitationStatus.PENDING,

    @Column(nullable = true)
    var token: String? = null,

    @Column(name = "expires_at", nullable = true)
    var expiresAt: Instant? = null,

    @Column(name = "responded_at", nullable = true)
    var respondedAt: Instant? = null
) : BaseEntity() {

    fun isExpired(now: Instant = Instant.now()): Boolean {
        if (status == InvitationStatus.EXPIRED) return true
        return expiresAt != null && expiresAt!!.isBefore(now)
    }

    fun getEffectiveStatus(now: Instant = Instant.now()): InvitationStatus {
        if (status == InvitationStatus.PENDING && isExpired(now)) {
            return InvitationStatus.EXPIRED
        }
        return status
    }
}
