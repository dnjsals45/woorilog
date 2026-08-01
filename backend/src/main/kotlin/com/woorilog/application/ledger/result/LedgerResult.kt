package com.woorilog.application.ledger.result

import com.woorilog.application.auth.result.LedgerDto
import com.woorilog.application.budget.result.UserSummaryResponse
import com.woorilog.domain.ledger.entity.LedgerMember
import com.woorilog.domain.ledger.entity.LedgerRole
import java.time.Instant

data class LedgerListResult(
    val ledgers: List<LedgerDto>,
    val currentLedgerId: Long,
    val items: List<LedgerDto> = ledgers,
)

data class BudgetCycleResult(val startType: String, val startDay: Int?)

data class LedgerSummaryResult(
    val id: Long,
    val name: String,
    val type: String,
    val role: String,
    val accessState: String,
    val partner: UserSummaryResponse?,
    val budgetCycle: BudgetCycleResult,
)

data class LedgerMemberResult(
    val userId: Long,
    val nickname: String,
    val role: LedgerRole,
    val user: UserSummaryResponse,
    val status: String,
    val joinedAt: Instant,
    val leftAt: Instant?,
)

fun LedgerMember.toResult() = LedgerMemberResult(
    userId = user.id!!,
    nickname = user.nickname,
    role = role,
    user = UserSummaryResponse(user.id!!, user.nickname),
    status = if (leftAt == null) "ACTIVE" else "FORMER",
    joinedAt = joinedAt,
    leftAt = leftAt,
)
