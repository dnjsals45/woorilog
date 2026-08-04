package com.woorilog.controller.ledger.request

import jakarta.validation.constraints.NotBlank

data class CreateLedgerRequest(
    @field:NotBlank(message = "가계부 이름은 필수 입력값입니다.")
    val name: String
)
