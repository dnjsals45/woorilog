package com.woorilog.controller.invitation.response

import com.woorilog.application.invitation.result.V1InvitationAcceptedResult
import com.woorilog.controller.ledger.response.LedgerSummaryResponse
import com.woorilog.controller.ledger.response.toResponse

data class V1InvitationAcceptedResponse(val ledger: LedgerSummaryResponse)

fun V1InvitationAcceptedResult.toResponse() = V1InvitationAcceptedResponse(
    ledger = ledger.toResponse(),
)
