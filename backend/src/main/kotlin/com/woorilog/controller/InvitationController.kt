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

    // 3) POST /api/ledgers/{ledgerId}/invitations/links body optional { "expiresInDays": 7 }
    @PostMapping("/api/ledgers/{ledgerId}/invitations/links")
    fun createInvitationLink(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @RequestBody(required = false) request: CreateLinkInvitationRequest?
    ): InvitationResponseDto {
        return invitationService.createInvitationLink(principal.userId, ledgerId, request?.expiresInDays)
    }

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
        @PathVariable token: String
    ): LinkInvitationPreviewResponse {
        return invitationService.getLinkInvitationPreview(token)
    }

    // 10) POST /api/invitations/links/{token}/accept
    @PostMapping("/api/invitations/links/{token}/accept")
    fun acceptLinkInvitationByToken(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable token: String
    ): InvitationResponseDto {
        return invitationService.acceptLinkInvitationByToken(principal.userId, token)
    }
}

data class InviteUserRequest(
    val userId: Long
)

data class CreateLinkInvitationRequest(
    val expiresInDays: Int? = null
)
