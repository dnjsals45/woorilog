package com.woorilog.controller.settlement.response

import com.woorilog.application.settlement.result.SettlementMemberResult
import com.woorilog.application.settlement.result.SettlementPaymentResult
import com.woorilog.application.settlement.result.SettlementSummaryResult
import com.woorilog.application.settlement.result.SettlementTransferResult
import java.time.Instant

data class SettlementSummaryResponse(
    val ledgerId: Long,
    val budgetMonth: String,
    val totalExpenseAmount: Long,
    val members: List<SettlementMemberResponse>,
    val transfers: List<SettlementTransferResponse>,
    val payments: List<SettlementPaymentResponse>,
)

data class SettlementMemberResponse(val userId: Long, val nickname: String, val paidAmount: Long, val owedAmount: Long, val balanceAmount: Long)
data class SettlementTransferResponse(val fromUserId: Long, val fromNickname: String, val toUserId: Long, val toNickname: String, val amount: Long)
data class SettlementPaymentResponse(val id: Long, val fromUserId: Long, val fromNickname: String, val toUserId: Long, val toNickname: String, val amount: Long, val settledAt: Instant)

fun SettlementSummaryResult.toResponse() = SettlementSummaryResponse(
    ledgerId = ledgerId,
    budgetMonth = budgetMonth,
    totalExpenseAmount = totalExpenseAmount,
    members = members.map { it.toResponse() },
    transfers = transfers.map { it.toResponse() },
    payments = payments.map { it.toResponse() },
)

fun SettlementMemberResult.toResponse() = SettlementMemberResponse(userId, nickname, paidAmount, owedAmount, balanceAmount)
fun SettlementTransferResult.toResponse() = SettlementTransferResponse(fromUserId, fromNickname, toUserId, toNickname, amount)
fun SettlementPaymentResult.toResponse() = SettlementPaymentResponse(id, fromUserId, fromNickname, toUserId, toNickname, amount, settledAt)
