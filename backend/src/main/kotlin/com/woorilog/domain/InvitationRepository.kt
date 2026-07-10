package com.woorilog.domain

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface InvitationRepository : JpaRepository<Invitation, Long> {
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
}
