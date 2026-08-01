package com.woorilog.domain.invitation.entity

import com.woorilog.common.entity.BaseEntity

import jakarta.persistence.*
import java.time.Instant
import com.woorilog.domain.auth.entity.User
import com.woorilog.domain.ledger.entity.Ledger

enum class InvitationType {
    DIRECT, LINK
}

enum class InvitationStatus {
    PENDING, ACCEPTED, REJECTED, CANCELLED, EXPIRED, REPLACED
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

    @Column(name = "token_hash", length = 64)
    var tokenHash: String? = null,

    @Column(name = "expires_at", nullable = true)
    var expiresAt: Instant? = null,

    @Column(name = "responded_at", nullable = true)
    var respondedAt: Instant? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responded_by_user_id")
    var respondedBy: User? = null,
) : BaseEntity() {

    fun isExpired(now: Instant): Boolean {
        if (status == InvitationStatus.EXPIRED || status == InvitationStatus.REPLACED) return true
        return expiresAt != null && expiresAt!!.isBefore(now)
    }

    fun getEffectiveStatus(now: Instant): InvitationStatus {
        if (status == InvitationStatus.REPLACED) return InvitationStatus.REPLACED
        if (status == InvitationStatus.PENDING && isExpired(now)) {
            return InvitationStatus.EXPIRED
        }
        return status
    }
}
