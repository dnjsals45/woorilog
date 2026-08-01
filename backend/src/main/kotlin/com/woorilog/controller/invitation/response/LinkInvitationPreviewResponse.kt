package com.woorilog.controller.invitation.response

import com.woorilog.application.invitation.result.LinkInvitationPreviewResult
import com.woorilog.domain.invitation.entity.InvitationStatus
import com.woorilog.domain.ledger.entity.LedgerType

data class LinkInvitationPreviewResponse(
    val ledgerId: Long,
    val ledgerName: String,
    val ledgerType: LedgerType,
    val inviterNickname: String,
    val status: InvitationStatus,
    val expired: Boolean
)

fun LinkInvitationPreviewResult.toResponse() = LinkInvitationPreviewResponse(
    ledgerId = ledgerId,
    ledgerName = ledgerName,
    ledgerType = ledgerType,
    inviterNickname = inviterNickname,
    status = status,
    expired = expired,
)
