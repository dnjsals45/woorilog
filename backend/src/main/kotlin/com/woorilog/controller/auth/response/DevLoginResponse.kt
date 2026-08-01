package com.woorilog.controller.auth.response

import com.fasterxml.jackson.annotation.JsonIgnore
import com.woorilog.application.auth.result.DevLoginResult
import com.woorilog.application.auth.result.LedgerDto
import com.woorilog.application.auth.result.UserDto

data class DevLoginResponse(
    val accessToken: String,
    val expiresInSeconds: Long,
    val user: UserDto,
    val currentLedger: LedgerDto,
    @get:JsonIgnore val refreshToken: String = "",
)

fun DevLoginResult.toResponse() = DevLoginResponse(
    accessToken = accessToken,
    expiresInSeconds = expiresInSeconds,
    user = user,
    currentLedger = currentLedger,
    refreshToken = refreshToken,
)
