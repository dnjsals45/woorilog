package com.woorilog.application.settlement.result

import com.woorilog.domain.settlement.entity.SettlementPayment
import java.time.Instant

data class SettlementSummaryResult(
    val ledgerId: Long,
    val budgetMonth: String,
    val totalExpenseAmount: Long,
    val members: List<SettlementMemberResult>,
    val transfers: List<SettlementTransferResult>,
    val payments: List<SettlementPaymentResult>,
)

data class SettlementMemberResult(val userId: Long, val nickname: String, val paidAmount: Long, val owedAmount: Long, val balanceAmount: Long)
data class SettlementTransferResult(val fromUserId: Long, val fromNickname: String, val toUserId: Long, val toNickname: String, val amount: Long)
data class SettlementPaymentResult(val id: Long, val fromUserId: Long, val fromNickname: String, val toUserId: Long, val toNickname: String, val amount: Long, val settledAt: Instant)

fun SettlementPayment.toResult() = SettlementPaymentResult(
    id = id!!,
    fromUserId = fromUser.id!!,
    fromNickname = fromUser.nickname,
    toUserId = toUser.id!!,
    toNickname = toUser.nickname,
    amount = amount,
    settledAt = settledAt,
)
