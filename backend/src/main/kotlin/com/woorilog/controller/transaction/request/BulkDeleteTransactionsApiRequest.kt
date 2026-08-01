package com.woorilog.controller.transaction.request

import jakarta.validation.constraints.NotNull

data class BulkDeleteTransactionsApiRequest(
    @field:NotNull(message = "거래 ID 목록은 필수입니다.")
    val transactionIds: List<Long?>?,
)
