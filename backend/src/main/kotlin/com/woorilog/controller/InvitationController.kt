package com.woorilog.controller

import com.woorilog.security.UserPrincipal
import com.woorilog.service.*
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
        return invitationService.getInvitableUser(principal.userId, ledgerId, email)
    }

    // 2) POST /api/ledgers/{ledgerId}/invitations/users body { "userId": 123 }
    @PostMapping("/api/ledgers/{ledgerId}/invitations/users")
    fun inviteUser(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @Valid @RequestBody request: InviteUserRequest
    ): InvitationResponseDto {
        return invitationService.inviteUser(principal.userId, ledgerId, request.userId)
    }

    // V1: 단일 30분 링크. 만료 기간은 서버 정책으로 고정합니다.
    @PostMapping("/api/ledgers/{ledgerId}/invitations/links")
    @ResponseStatus(HttpStatus.CREATED)
    fun createInvitationLink(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
    ): V1InvitationLinkCreatedResponse = invitationService.createV1InvitationLink(principal.userId, ledgerId)

    // 4) GET /api/ledgers/{ledgerId}/invitations
    @GetMapping("/api/ledgers/{ledgerId}/invitations")
    fun getLedgerInvitations(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long
    ): List<InvitationResponseDto> {
        return invitationService.getLedgerInvitations(principal.userId, ledgerId)
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
    ): List<InvitationResponseDto> {
        return invitationService.getPendingInvitations(principal.userId)
    }

    // 7) POST /api/invitations/{invitationId}/accept
    @PostMapping("/api/invitations/{invitationId}/accept")
    fun acceptInvitation(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable invitationId: Long
    ): InvitationResponseDto {
        return invitationService.acceptInvitation(principal.userId, invitationId)
    }

    // 8) POST /api/invitations/{invitationId}/reject
    @PostMapping("/api/invitations/{invitationId}/reject")
    fun rejectInvitation(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable invitationId: Long
    ): InvitationResponseDto {
        return invitationService.rejectInvitation(principal.userId, invitationId)
    }

    // 9) GET /api/invitations/links/{token}
    @GetMapping("/api/invitations/links/{token}")
    fun getLinkInvitationPreview(
        @PathVariable token: String,
        @AuthenticationPrincipal principal: UserPrincipal?,
    ): V1LinkInvitationPreviewResponse = invitationService.getV1LinkPreview(token, principal != null)

    // 10) POST /api/invitations/links/{token}/accept
    @PostMapping("/api/invitations/links/{token}/accept")
    fun acceptLinkInvitationByToken(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable token: String
    ): V1InvitationAcceptedResponse = invitationService.acceptV1Link(principal.userId, token)

    @PostMapping("/api/invitations/links/{token}/reject")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun rejectLinkInvitationByToken(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable token: String,
    ) = invitationService.rejectV1Link(principal.userId, token)
}

data class InviteUserRequest(
    val userId: Long
)

data class CreateLinkInvitationRequest(
    val expiresInDays: Int? = null
)
