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
    /** 이 장부를 쓴 적 있는 다른 상대가 있어서 참여가 막히는지. 비로그인 조회면 null. */
    val viewerIsDifferentPartner: Boolean?,
    val budgetCycle: BudgetCycleResult,
)
