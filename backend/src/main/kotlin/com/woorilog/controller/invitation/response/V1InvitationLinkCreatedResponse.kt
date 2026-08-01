package com.woorilog.controller.invitation.response

import com.woorilog.application.invitation.result.V1InvitationLinkCreatedResult
import java.time.Instant

data class V1InvitationLinkCreatedResponse(val invitationId: Long, val url: String, val expiresAt: Instant)

fun V1InvitationLinkCreatedResult.toResponse() = V1InvitationLinkCreatedResponse(
    invitationId = invitationId,
    url = url,
    expiresAt = expiresAt,
)
