package com.woorilog.controller.settlement.request

import jakarta.validation.constraints.NotNull

data class RecordSettlementRequest(
    @field:NotNull val fromUserId: Long,
    @field:NotNull val toUserId: Long,
    @field:NotNull val amount: Long,
)
