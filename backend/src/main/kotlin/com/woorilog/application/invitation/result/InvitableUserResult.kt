package com.woorilog.application.invitation.result

import com.woorilog.application.auth.result.UserDto

data class InvitableUserResult(
    val user: UserDto,
    val invitable: Boolean,
    val reason: String?
)
