package com.woorilog.controller.invitation

import com.woorilog.common.security.UserPrincipal
import com.woorilog.application.invitation.service.InvitationService
import com.woorilog.controller.invitation.request.InviteUserRequest
import com.woorilog.controller.invitation.response.InvitableUserResponse
import com.woorilog.controller.invitation.response.InvitationResponse
import com.woorilog.controller.invitation.response.V1InvitationAcceptedResponse
import com.woorilog.controller.invitation.response.V1InvitationLinkCreatedResponse
import com.woorilog.controller.invitation.response.V1LinkInvitationPreviewResponse
import com.woorilog.controller.invitation.response.toResponse
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

@RestController
class InvitationController(
    private val invitationService: InvitationService
) {

    // 1) GET /api/ledgers/{ledgerId}/invitable-user?email=...
    @GetMapping("/api/ledgers/{ledgerId}/invitable-user")
    fun getInvitableUser(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @RequestParam email: String
    ): InvitableUserResponse {
        return invitationService.getInvitableUser(principal.userId, ledgerId, email).toResponse()
    }

    // 2) POST /api/ledgers/{ledgerId}/invitations/users body { "userId": 123 }
    @PostMapping("/api/ledgers/{ledgerId}/invitations/users")
    fun inviteUser(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @Valid @RequestBody request: InviteUserRequest
    ): InvitationResponse {
        return invitationService.inviteUser(principal.userId, ledgerId, request.userId).toResponse()
    }

    // V1: 단일 30분 링크. 만료 기간은 서버 정책으로 고정합니다.
    @PostMapping("/api/ledgers/{ledgerId}/invitations/links")
    @ResponseStatus(HttpStatus.CREATED)
    fun createInvitationLink(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
    ): V1InvitationLinkCreatedResponse = invitationService.createV1InvitationLink(principal.userId, ledgerId).toResponse()

    // 4) GET /api/ledgers/{ledgerId}/invitations
    @GetMapping("/api/ledgers/{ledgerId}/invitations")
    fun getLedgerInvitations(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long
    ): List<InvitationResponse> {
        return invitationService.getLedgerInvitations(principal.userId, ledgerId).map { it.toResponse() }
    }

    // 5) DELETE /api/ledgers/{ledgerId}/invitations/{invitationId}
    @DeleteMapping("/api/ledgers/{ledgerId}/invitations/{invitationId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun cancelInvitation(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @PathVariable invitationId: Long
    ) {
        invitationService.cancelInvitation(principal.userId, ledgerId, invitationId)
    }

    // 6) GET /api/invitations/pending
    @GetMapping("/api/invitations/pending")
    fun getPendingInvitations(
        @AuthenticationPrincipal principal: UserPrincipal
    ): List<InvitationResponse> {
        return invitationService.getPendingInvitations(principal.userId).map { it.toResponse() }
    }

    // 7) POST /api/invitations/{invitationId}/accept
    @PostMapping("/api/invitations/{invitationId}/accept")
    fun acceptInvitation(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable invitationId: Long
    ): InvitationResponse {
        return invitationService.acceptInvitation(principal.userId, invitationId).toResponse()
    }

    // 8) POST /api/invitations/{invitationId}/reject
    @PostMapping("/api/invitations/{invitationId}/reject")
    fun rejectInvitation(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable invitationId: Long
    ): InvitationResponse {
        return invitationService.rejectInvitation(principal.userId, invitationId).toResponse()
    }

    // 9) GET /api/invitations/links/{token}
    @GetMapping("/api/invitations/links/{token}")
    fun getLinkInvitationPreview(
        @PathVariable token: String,
        @AuthenticationPrincipal principal: UserPrincipal?,
    ): V1LinkInvitationPreviewResponse = invitationService.getV1LinkPreview(token, principal != null).toResponse()

    // 10) POST /api/invitations/links/{token}/accept
    @PostMapping("/api/invitations/links/{token}/accept")
    fun acceptLinkInvitationByToken(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable token: String
    ): V1InvitationAcceptedResponse = invitationService.acceptV1Link(principal.userId, token).toResponse()

    @PostMapping("/api/invitations/links/{token}/reject")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun rejectLinkInvitationByToken(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable token: String,
    ) = invitationService.rejectV1Link(principal.userId, token)
}
