package com.woorilog.controller.invitation.response

import com.woorilog.application.auth.result.UserDto
import com.woorilog.application.invitation.result.InvitableUserResult

data class InvitableUserResponse(
    val user: UserDto,
    val invitable: Boolean,
    val reason: String?
)

fun InvitableUserResult.toResponse() = InvitableUserResponse(
    user = user,
    invitable = invitable,
    reason = reason,
)
