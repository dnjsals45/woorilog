package com.woorilog.application.invitation.result

import com.woorilog.domain.invitation.entity.InvitationStatus
import com.woorilog.domain.ledger.entity.LedgerType

data class LinkInvitationPreviewResult(
    val ledgerId: Long,
    val ledgerName: String,
    val ledgerType: LedgerType,
    val inviterNickname: String,
    val status: InvitationStatus,
    val expired: Boolean
)
