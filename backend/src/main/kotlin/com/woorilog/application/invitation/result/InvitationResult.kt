package com.woorilog.application.invitation.result

import com.woorilog.application.auth.result.UserDto
import com.woorilog.domain.invitation.entity.Invitation
import com.woorilog.domain.invitation.entity.InvitationStatus
import com.woorilog.domain.invitation.entity.InvitationType
import com.woorilog.domain.ledger.entity.LedgerType
import java.time.Instant

data class InvitationResult(
    val id: Long,
    val ledgerId: Long,
    val ledgerName: String,
    val ledgerType: LedgerType,
    val inviter: UserDto,
    val invitee: UserDto?,
    val type: InvitationType,
    val status: InvitationStatus,
    val token: String?,
    val expiresAt: Instant?,
    val respondedAt: Instant?,
    val createdAt: Instant
)

fun Invitation.toResult(now: Instant) = InvitationResult(
    id = id!!,
    ledgerId = ledger.id!!,
    ledgerName = ledger.name,
    ledgerType = ledger.type,
    inviter = UserDto.from(inviter),
    invitee = invitee?.let { UserDto.from(it) },
    type = type,
    status = getEffectiveStatus(now),
    token = token,
    expiresAt = expiresAt,
    respondedAt = respondedAt,
    createdAt = createdAt
)
