package com.woorilog.application.invitation.result

import java.time.Instant

data class V1InvitationLinkCreatedResult(val invitationId: Long, val url: String, val expiresAt: Instant)
