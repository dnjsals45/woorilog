package com.woorilog.controller.auth.response

import com.woorilog.application.auth.result.LedgerDto
import com.woorilog.application.auth.result.MeResult
import com.woorilog.application.auth.result.UserDto

data class MeResponse(
    val user: UserDto,
    val currentLedger: LedgerDto
)

fun MeResult.toResponse() = MeResponse(
    user = user,
    currentLedger = currentLedger,
)
