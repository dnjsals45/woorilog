package com.woorilog.integration

import com.fasterxml.jackson.databind.ObjectMapper
import com.woorilog.domain.*
import com.woorilog.service.*
import org.hamcrest.Matchers.*
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class InvitationIntegrationTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    private fun devLogin(email: String, nickname: String): DevLoginResponse {
        val requestBody = mapOf(
            "email" to email,
            "nickname" to nickname
        )
        val result = mockMvc.perform(post("/api/auth/dev-login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isOk)
            .andReturn()
        return objectMapper.readValue(result.response.contentAsString, DevLoginResponse::class.java)
    }

    private fun createGroupLedger(token: String, name: String): LedgerDto {
        val requestBody = mapOf("name" to name)
        val result = mockMvc.perform(post("/api/ledgers/group")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isOk)
            .andReturn()
        return objectMapper.readValue(result.response.contentAsString, LedgerDto::class.java)
    }

    @Test
    fun should_ProcessDirectInvitationFlow_When_Valid() {
        // 1. Log in Owner and Invitee
        val ownerResponse = devLogin("owner@example.com", "장부주인")
        val inviteeResponse = devLogin("invitee@example.com", "초대손님")
        val ownerToken = ownerResponse.accessToken
        val inviteeToken = inviteeResponse.accessToken

        // 2. Owner creates a GROUP ledger
        val ledger = createGroupLedger(ownerToken, "우리공동장부")
        val ledgerId = ledger.id

        // 3. Owner checks if Invitee is invitable
        mockMvc.perform(get("/api/ledgers/$ledgerId/invitable-user")
            .header("Authorization", "Bearer $ownerToken")
            .param("email", "invitee@example.com"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.invitable").value(true))
            .andExpect(jsonPath("$.user.email").value("invitee@example.com"))
            .andExpect(jsonPath("$.reason").isEmpty)

        // 4. Owner creates DIRECT invitation to Invitee
        val inviteResult = mockMvc.perform(post("/api/ledgers/$ledgerId/invitations/users")
            .header("Authorization", "Bearer $ownerToken")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(mapOf("userId" to inviteeResponse.user.id))))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.ledgerId").value(ledgerId))
            .andExpect(jsonPath("$.type").value("DIRECT"))
            .andExpect(jsonPath("$.status").value("PENDING"))
            .andExpect(jsonPath("$.invitee.id").value(inviteeResponse.user.id))
            .andReturn()

        val invitation = objectMapper.readValue(inviteResult.response.contentAsString, InvitationResponseDto::class.java)

        // 5. Try to invite again -> duplicate check should fail
        mockMvc.perform(post("/api/ledgers/$ledgerId/invitations/users")
            .header("Authorization", "Bearer $ownerToken")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(mapOf("userId" to inviteeResponse.user.id))))
            .andExpect(status().isBadRequest)

        // 6. Check invitable-user status again -> should be PENDING_INVITATION
        mockMvc.perform(get("/api/ledgers/$ledgerId/invitable-user")
            .header("Authorization", "Bearer $ownerToken")
            .param("email", "invitee@example.com"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.invitable").value(false))
            .andExpect(jsonPath("$.reason").value("PENDING_INVITATION"))

        // 7. Invitee views own pending invitations
        mockMvc.perform(get("/api/invitations/pending")
            .header("Authorization", "Bearer $inviteeToken"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$", hasSize<Any>(1)))
            .andExpect(jsonPath("$[0].id").value(invitation.id))

        // 8. Invitee accepts direct invitation
        mockMvc.perform(post("/api/invitations/${invitation.id}/accept")
            .header("Authorization", "Bearer $inviteeToken"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.status").value("ACCEPTED"))

        // 9. Verify membership and lastUsedLedgerId
        mockMvc.perform(get("/api/ledgers")
            .header("Authorization", "Bearer $inviteeToken"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.currentLedgerId").value(ledgerId))
            .andExpect(jsonPath("$.ledgers[*].id", hasItem(ledgerId.toInt())))

        // 10. Check invitable-user status again -> should be ALREADY_MEMBER
        mockMvc.perform(get("/api/ledgers/$ledgerId/invitable-user")
            .header("Authorization", "Bearer $ownerToken")
            .param("email", "invitee@example.com"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.invitable").value(false))
            .andExpect(jsonPath("$.reason").value("ALREADY_MEMBER"))
    }

    @Test
    fun should_ProcessLinkInvitationFlow_When_Valid() {
        val ownerResponse = devLogin("owner2@example.com", "장부주인2")
        val inviteeResponse = devLogin("invitee2@example.com", "초대손님2")
        val ownerToken = ownerResponse.accessToken
        val inviteeToken = inviteeResponse.accessToken

        val ledger = createGroupLedger(ownerToken, "우리공동장부2")
        val ledgerId = ledger.id

        // 1. Create link invitation
        val linkResult = mockMvc.perform(post("/api/ledgers/$ledgerId/invitations/links")
            .header("Authorization", "Bearer $ownerToken")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(mapOf("expiresInDays" to 5))))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.ledgerId").value(ledgerId))
            .andExpect(jsonPath("$.type").value("LINK"))
            .andExpect(jsonPath("$.status").value("PENDING"))
            .andExpect(jsonPath("$.token").isNotEmpty)
            .andReturn()

        val linkInvitation = objectMapper.readValue(linkResult.response.contentAsString, InvitationResponseDto::class.java)
        val token = linkInvitation.token!!

        // 2. Get link preview
        mockMvc.perform(get("/api/invitations/links/$token")
            .header("Authorization", "Bearer $inviteeToken"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.ledgerId").value(ledgerId))
            .andExpect(jsonPath("$.ledgerName").value("우리공동장부2"))
            .andExpect(jsonPath("$.inviterNickname").value("장부주인2"))
            .andExpect(jsonPath("$.status").value("PENDING"))
            .andExpect(jsonPath("$.expired").value(false))

        // 3. Accept link invitation by token
        mockMvc.perform(post("/api/invitations/links/$token/accept")
            .header("Authorization", "Bearer $inviteeToken"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.status").value("ACCEPTED"))

        // 4. Verify membership
        mockMvc.perform(get("/api/ledgers")
            .header("Authorization", "Bearer $inviteeToken"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.currentLedgerId").value(ledgerId))
    }

    @Test
    fun should_ReturnForbidden_When_NonOwnerAccessesOwnerOnlyEndpoints() {
        val ownerResponse = devLogin("owner3@example.com", "장부주인3")
        val hackerResponse = devLogin("hacker@example.com", "해커")
        val ownerToken = ownerResponse.accessToken
        val hackerToken = hackerResponse.accessToken

        val ledger = createGroupLedger(ownerToken, "우리공동장부3")
        val ledgerId = ledger.id

        // 1. Hacker checks invitable user -> Forbidden
        mockMvc.perform(get("/api/ledgers/$ledgerId/invitable-user")
            .header("Authorization", "Bearer $hackerToken")
            .param("email", "owner3@example.com"))
            .andExpect(status().isForbidden)

        // 2. Hacker sends user invitation -> Forbidden
        mockMvc.perform(post("/api/ledgers/$ledgerId/invitations/users")
            .header("Authorization", "Bearer $hackerToken")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(mapOf("userId" to ownerResponse.user.id))))
            .andExpect(status().isForbidden)

        // 3. Hacker creates link invitation -> Forbidden
        mockMvc.perform(post("/api/ledgers/$ledgerId/invitations/links")
            .header("Authorization", "Bearer $hackerToken")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(mapOf("expiresInDays" to 7))))
            .andExpect(status().isForbidden)

        // 4. Hacker lists ledger invitations -> Forbidden
        mockMvc.perform(get("/api/ledgers/$ledgerId/invitations")
            .header("Authorization", "Bearer $hackerToken"))
            .andExpect(status().isForbidden)
    }

    @Test
    fun should_CancelAndRejectInvitations_When_RequestedByAuthorizedUsers() {
        val ownerResponse = devLogin("owner4@example.com", "장부주인4")
        val inviteeResponse = devLogin("invitee4@example.com", "초대손님4")
        val ownerToken = ownerResponse.accessToken
        val inviteeToken = inviteeResponse.accessToken
        val ledgerId = createGroupLedger(ownerToken, "우리공동장부4").id

        // 1. Create first invitation (to be cancelled)
        val inviteResult1 = mockMvc.perform(post("/api/ledgers/$ledgerId/invitations/users")
            .header("Authorization", "Bearer $ownerToken")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(mapOf("userId" to inviteeResponse.user.id))))
            .andExpect(status().isOk)
            .andReturn()

        val invitation1 = objectMapper.readValue(inviteResult1.response.contentAsString, InvitationResponseDto::class.java)

        // 2. Owner cancels the first invitation
        mockMvc.perform(delete("/api/ledgers/$ledgerId/invitations/${invitation1.id}")
            .header("Authorization", "Bearer $ownerToken"))
            .andExpect(status().isNoContent)

        // 3. Invitee tries to accept cancelled invitation -> BadRequest
        mockMvc.perform(post("/api/invitations/${invitation1.id}/accept")
            .header("Authorization", "Bearer $inviteeToken"))
            .andExpect(status().isBadRequest)

        // 4. Create second invitation (to be rejected)
        val inviteResult2 = mockMvc.perform(post("/api/ledgers/$ledgerId/invitations/users")
            .header("Authorization", "Bearer $ownerToken")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(mapOf("userId" to inviteeResponse.user.id))))
            .andExpect(status().isOk)
            .andReturn()

        val invitation2 = objectMapper.readValue(inviteResult2.response.contentAsString, InvitationResponseDto::class.java)

        // 5. Invitee rejects second invitation
        mockMvc.perform(post("/api/invitations/${invitation2.id}/reject")
            .header("Authorization", "Bearer $inviteeToken"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.status").value("REJECTED"))

        // 6. Invitee tries to accept rejected invitation -> BadRequest
        mockMvc.perform(post("/api/invitations/${invitation2.id}/accept")
            .header("Authorization", "Bearer $inviteeToken"))
            .andExpect(status().isBadRequest)
    }
}
