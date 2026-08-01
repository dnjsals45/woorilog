package com.woorilog.controller.invitation.response

import com.woorilog.application.auth.result.UserDto
import com.woorilog.application.invitation.result.InvitationResult
import com.woorilog.domain.invitation.entity.InvitationStatus
import com.woorilog.domain.invitation.entity.InvitationType
import com.woorilog.domain.ledger.entity.LedgerType
import java.time.Instant

data class InvitationResponse(
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

fun InvitationResult.toResponse() = InvitationResponse(
    id = id,
    ledgerId = ledgerId,
    ledgerName = ledgerName,
    ledgerType = ledgerType,
    inviter = inviter,
    invitee = invitee,
    type = type,
    status = status,
    token = token,
    expiresAt = expiresAt,
    respondedAt = respondedAt,
    createdAt = createdAt,
)
