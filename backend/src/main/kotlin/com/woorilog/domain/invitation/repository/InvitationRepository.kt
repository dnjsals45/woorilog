package com.woorilog.domain.invitation.repository

import com.woorilog.domain.invitation.entity.Invitation
import com.woorilog.domain.invitation.entity.InvitationStatus
import com.woorilog.domain.invitation.entity.InvitationType

interface InvitationRepository {
    fun findByIdOrNull(id: Long): Invitation?

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

    fun findLockedByTokenHash(tokenHash: String): Invitation?

    fun findByLedgerIdAndTypeAndStatus(
        ledgerId: Long,
        type: InvitationType,
        status: InvitationStatus,
    ): List<Invitation>

    fun save(invitation: Invitation): Invitation
    fun saveAndFlush(invitation: Invitation): Invitation
}
