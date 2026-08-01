package com.woorilog.infrastructure.persistence.invitation

import com.woorilog.domain.invitation.entity.Invitation
import com.woorilog.domain.invitation.entity.InvitationStatus
import com.woorilog.domain.invitation.entity.InvitationType
import jakarta.persistence.LockModeType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

@Repository
interface InvitationJpaRepository : JpaRepository<Invitation, Long> {
    fun findByLedgerId(ledgerId: Long): List<Invitation>

    fun findByLedgerIdOrderByIdDesc(ledgerId: Long): List<Invitation>

    fun findByInviteeIdAndTypeAndStatus(
        inviteeId: Long,
        type: InvitationType,
        status: InvitationStatus
    ): List<Invitation>

    fun findByLedgerIdAndInviteeIdAndTypeAndStatus(
        ledgerId: Long,
        inviteeId: Long,
        type: InvitationType,
        status: InvitationStatus
    ): List<Invitation>

    fun findByToken(token: String): Invitation?

    fun findByTokenHash(tokenHash: String): Invitation?

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select invitation from Invitation invitation where invitation.tokenHash = :tokenHash")
    fun findLockedByTokenHash(@Param("tokenHash") tokenHash: String): Invitation?

    fun findByLedgerIdAndTypeAndStatusOrderByIdDesc(
        ledgerId: Long,
        type: InvitationType,
        status: InvitationStatus,
    ): List<Invitation>

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    fun findByLedgerIdAndTypeAndStatus(
        ledgerId: Long,
        type: InvitationType,
        status: InvitationStatus,
    ): List<Invitation>
}
