package com.woorilog.controller.ledger.response

import com.woorilog.application.budget.result.UserSummaryResponse
import com.woorilog.application.ledger.result.LedgerMemberResult
import com.woorilog.domain.ledger.entity.LedgerRole
import java.time.Instant

data class LedgerMemberResponse(
    val userId: Long,
    val nickname: String,
    val role: LedgerRole,
    val user: UserSummaryResponse,
    val status: String,
    val joinedAt: Instant,
    val leftAt: Instant?,
)

fun LedgerMemberResult.toResponse() = LedgerMemberResponse(
    userId = userId,
    nickname = nickname,
    role = role,
    user = user,
    status = status,
    joinedAt = joinedAt,
    leftAt = leftAt,
)
