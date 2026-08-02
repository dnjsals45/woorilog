package com.woorilog.application.invitation.result

import com.woorilog.application.budget.result.UserSummaryResponse
import com.woorilog.application.ledger.result.BudgetCycleResult
import java.time.Instant

data class V1LinkInvitationPreviewResult(
    val invitationId: Long,
    val ledgerName: String,
    val inviter: UserSummaryResponse,
    val status: String,
    val expiresAt: Instant,
    val authenticationRequired: Boolean,
    val currentMemberCount: Int,
    val viewerAlreadyMember: Boolean?,
    val budgetCycle: BudgetCycleResult,
)
