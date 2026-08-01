package com.woorilog.controller.auth.response

import com.woorilog.application.auth.result.UserDto

data class UserResponse(
    val id: Long,
    val nickname: String,
    val nicknameConfirmed: Boolean,
    val timezone: String,
)

fun UserDto.toResponse() = UserResponse(
    id = id,
    nickname = nickname,
    nicknameConfirmed = nicknameConfirmed,
    timezone = timezone,
)
