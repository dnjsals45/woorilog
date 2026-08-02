package com.woorilog.controller.invitation.response

import com.woorilog.application.budget.result.UserSummaryResponse
import com.woorilog.application.invitation.result.V1LinkInvitationPreviewResult
import com.woorilog.controller.ledger.response.BudgetCycleResponse
import java.time.Instant

data class V1LinkInvitationPreviewResponse(
    val invitationId: Long,
    val ledgerName: String,
    val inviter: UserSummaryResponse,
    val status: String,
    val expiresAt: Instant,
    val authenticationRequired: Boolean,
    val currentMemberCount: Int,
    val viewerAlreadyMember: Boolean?,
    val budgetCycle: BudgetCycleResponse,
)

fun V1LinkInvitationPreviewResult.toResponse() = V1LinkInvitationPreviewResponse(
    invitationId = invitationId,
    ledgerName = ledgerName,
    inviter = inviter,
    status = status,
    expiresAt = expiresAt,
    authenticationRequired = authenticationRequired,
    currentMemberCount = currentMemberCount,
    viewerAlreadyMember = viewerAlreadyMember,
    budgetCycle = BudgetCycleResponse(budgetCycle.startType, budgetCycle.startDay),
)
