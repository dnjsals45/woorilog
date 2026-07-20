package com.woorilog.integration

import com.fasterxml.jackson.databind.ObjectMapper
import com.woorilog.domain.*
import com.woorilog.service.DevLoginResponse
import com.woorilog.service.LedgerDto
import org.hamcrest.Matchers.*
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*
import org.springframework.transaction.annotation.Transactional
import jakarta.servlet.http.Cookie
import org.junit.jupiter.api.Assertions.assertNotEquals

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuthAndLedgerIntegrationTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var ledgerRepository: LedgerRepository

    @Autowired
    private lateinit var ledgerMemberRepository: LedgerMemberRepository

    @Test
    fun should_ReturnHealthStatus_When_GetHealth() {
        mockMvc.perform(get("/health")
            .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk)
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.status").value("UP"))
            .andExpect(jsonPath("$.service").value("woorilog-backend"))
    }

    @Test
    fun should_RegisterOrLoginUser_When_DevLogin() {
        val requestBody = mapOf(
            "email" to "dev-user@example.com",
            "nickname" to "개발자"
        )

        val result = mockMvc.perform(post("/api/auth/dev-login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.accessToken").isNotEmpty)
            .andExpect(jsonPath("$.expiresInSeconds").value(1800))
            .andExpect(jsonPath("$.user.email").value("dev-user@example.com"))
            .andExpect(jsonPath("$.user.nickname").value("개발자"))
            .andExpect(jsonPath("$.currentLedger.name").value("개발자의 개인 장부"))
            .andExpect(jsonPath("$.currentLedger.type").value("PERSONAL"))
            .andReturn()

        val response = objectMapper.readValue(result.response.contentAsString, DevLoginResponse::class.java)

        // Assert database state
        val user = userRepository.findByProviderAndProviderUserId("DEV", "dev-user@example.com")
        assertNotNull(user)
        assertEquals("개발자", user!!.nickname)
        assertNotNull(user.lastUsedLedgerId)

        val ledger = ledgerRepository.findById(response.currentLedger.id).orElse(null)
        assertNotNull(ledger)
        assertEquals("개발자의 개인 장부", ledger.name)
        assertEquals(LedgerType.PERSONAL, ledger.type)
        assertEquals(user.id, ledger.ownerId)

        val member = ledgerMemberRepository.findByLedgerIdAndUserId(ledger.id!!, user.id!!)
        assertNotNull(member)
        assertEquals(LedgerRole.OWNER, member!!.role)
    }

    @Test
    fun should_ReturnBadRequest_When_DevLoginWithInvalidRequest() {
        val requestBody = mapOf(
            "email" to "not-an-email",
            "nickname" to ""
        )

        mockMvc.perform(post("/api/auth/dev-login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
            .andExpect(jsonPath("$.message").isNotEmpty)
    }

    @Test
    fun should_ReturnUnauthorized_When_AccessMeWithoutToken() {
        mockMvc.perform(get("/api/me"))
            .andExpect(status().isUnauthorized)
            .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
            .andExpect(jsonPath("$.message").value("인증 정보가 유효하지 않습니다."))
    }

    @Test
    fun should_ReturnUserAndLedger_When_AccessMeWithToken() {
        // Setup user and token
        val devLoginResult = mockMvc.perform(post("/api/auth/dev-login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(mapOf("email" to "test@example.com", "nickname" to "테스터"))))
            .andReturn()

        val devLoginResponse = objectMapper.readValue(devLoginResult.response.contentAsString, DevLoginResponse::class.java)
        val token = devLoginResponse.accessToken

        mockMvc.perform(get("/api/me")
            .header("Authorization", "Bearer $token"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.user.id").value(devLoginResponse.user.id))
            .andExpect(jsonPath("$.currentLedger.id").value(devLoginResponse.currentLedger.id))
    }

    @Test
    fun should_Return204_When_Logout() {
        val devLoginResult = mockMvc.perform(post("/api/auth/dev-login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(mapOf("email" to "logout-test@example.com", "nickname" to "로그아웃테스터"))))
            .andReturn()

        val refreshCookie = devLoginResult.response.getCookie("woorilog.refreshToken")
        assertNotNull(refreshCookie)

        mockMvc.perform(post("/api/auth/logout")
            .cookie(refreshCookie!!))
            .andExpect(status().isNoContent)
            .andExpect(cookie().maxAge("woorilog.refreshToken", 0))

        mockMvc.perform(post("/api/auth/refresh").cookie(refreshCookie))
            .andExpect(status().isUnauthorized)
    }

    @Test
    fun should_RotateRefreshToken_When_Refresh() {
        val devLoginResult = mockMvc.perform(post("/api/auth/dev-login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(mapOf("email" to "refresh-test@example.com", "nickname" to "리프레시테스터"))))
            .andReturn()

        val refreshCookie = devLoginResult.response.getCookie("woorilog.refreshToken")
        assertNotNull(refreshCookie)

        val refreshed = mockMvc.perform(post("/api/auth/refresh").cookie(refreshCookie!!))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.accessToken").isNotEmpty)
            .andExpect(cookie().exists("woorilog.refreshToken"))
            .andReturn()
        val rotatedCookie = refreshed.response.getCookie("woorilog.refreshToken")
        assertNotNull(rotatedCookie)
        assertNotEquals(refreshCookie.value, rotatedCookie!!.value)

        mockMvc.perform(post("/api/auth/refresh").cookie(Cookie("woorilog.refreshToken", refreshCookie.value)))
            .andExpect(status().isUnauthorized)
    }

    @Test
    fun should_Return501_When_KakaoEndpoints() {
        mockMvc.perform(get("/api/auth/kakao/login-url"))
            .andExpect(status().isNotImplemented)
            .andExpect(jsonPath("$.code").value("NOT_CONFIGURED"))

        mockMvc.perform(post("/api/auth/kakao/callback")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(mapOf("code" to "authorization-code"))))
            .andExpect(status().isNotImplemented)
            .andExpect(jsonPath("$.code").value("NOT_CONFIGURED"))
    }

    @Test
    fun should_ManageLedgers_When_Authenticated() {
        // 1. Dev login to get token
        val loginResult = mockMvc.perform(post("/api/auth/dev-login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(mapOf("email" to "user@example.com", "nickname" to "유저"))))
            .andReturn()
        val loginResponse = objectMapper.readValue(loginResult.response.contentAsString, DevLoginResponse::class.java)
        val token = loginResponse.accessToken
        val userId = loginResponse.user.id
        val defaultLedgerId = loginResponse.currentLedger.id

        // 2. Get ledgers - should contain default personal ledger
        mockMvc.perform(get("/api/ledgers")
            .header("Authorization", "Bearer $token"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.currentLedgerId").value(defaultLedgerId))
            .andExpect(jsonPath("$.ledgers", hasSize<Any>(1)))
            .andExpect(jsonPath("$.ledgers[0].id").value(defaultLedgerId))
            .andExpect(jsonPath("$.ledgers[0].type").value("PERSONAL"))

        mockMvc.perform(get("/api/ledgers/$defaultLedgerId/members")
            .header("Authorization", "Bearer $token"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$", hasSize<Any>(1)))
            .andExpect(jsonPath("$[0].userId").value(userId))
            .andExpect(jsonPath("$[0].role").value("OWNER"))

        // 3. Create another personal ledger
        val personalResult = mockMvc.perform(post("/api/ledgers/personal")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(mapOf("name" to "두번째 개인장부"))))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.name").value("두번째 개인장부"))
            .andExpect(jsonPath("$.type").value("PERSONAL"))
            .andExpect(jsonPath("$.ownerId").value(userId))
            .andReturn()
        val secondLedger = objectMapper.readValue(personalResult.response.contentAsString, LedgerDto::class.java)

        // 4. Create a group ledger
        val groupResult = mockMvc.perform(post("/api/ledgers/group")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(mapOf("name" to "가족 모임장부"))))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.name").value("가족 모임장부"))
            .andExpect(jsonPath("$.type").value("GROUP"))
            .andExpect(jsonPath("$.ownerId").value(userId))
            .andReturn()
        val groupLedger = objectMapper.readValue(groupResult.response.contentAsString, LedgerDto::class.java)

        // 5. Get ledgers again - should now contain 3 ledgers
        mockMvc.perform(get("/api/ledgers")
            .header("Authorization", "Bearer $token"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.ledgers", hasSize<Any>(3)))

        // 6. Switch to second personal ledger
        mockMvc.perform(post("/api/ledgers/${secondLedger.id}/use")
            .header("Authorization", "Bearer $token"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.id").value(secondLedger.id))

        // 7. Verify /api/me returns second personal ledger as current
        mockMvc.perform(get("/api/me")
            .header("Authorization", "Bearer $token"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.currentLedger.id").value(secondLedger.id))
    }

    @Test
    fun should_FailToSwitchLedger_When_NotMemberOrNonExistent() {
        // 1. Dev login User A
        val loginA = mockMvc.perform(post("/api/auth/dev-login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(mapOf("email" to "usera@example.com", "nickname" to "유저A"))))
            .andReturn()
        val responseA = objectMapper.readValue(loginA.response.contentAsString, DevLoginResponse::class.java)
        val tokenA = responseA.accessToken

        // 2. Dev login User B
        val loginB = mockMvc.perform(post("/api/auth/dev-login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(mapOf("email" to "userb@example.com", "nickname" to "유저B"))))
            .andReturn()
        val responseB = objectMapper.readValue(loginB.response.contentAsString, DevLoginResponse::class.java)
        val ledgerIdB = responseB.currentLedger.id

        // 3. User A tries to switch to User B's ledger -> 403 Forbidden
        mockMvc.perform(post("/api/ledgers/$ledgerIdB/use")
            .header("Authorization", "Bearer $tokenA"))
            .andExpect(status().isForbidden)
            .andExpect(jsonPath("$.code").value("FORBIDDEN"))

        // 4. User A tries to switch to non-existent ledger -> 404 Not Found
        mockMvc.perform(post("/api/ledgers/99999/use")
            .header("Authorization", "Bearer $tokenA"))
            .andExpect(status().isNotFound)
            .andExpect(jsonPath("$.code").value("NOT_FOUND"))
    }

    @Test
    fun should_UpdateRecurringSummaryClosingDay_When_LedgerOwner() {
        val loginResult = mockMvc.perform(post("/api/auth/dev-login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(mapOf("email" to "summary-day@example.com", "nickname" to "집계일사용자"))))
            .andExpect(status().isOk)
            .andReturn()
        val loginResponse = objectMapper.readValue(loginResult.response.contentAsString, DevLoginResponse::class.java)
        val token = loginResponse.accessToken
        val ledgerId = loginResponse.currentLedger.id

        mockMvc.perform(patch("/api/ledgers/$ledgerId")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(mapOf("recurringSummaryClosingDay" to 10))))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.recurringSummaryClosingDay").value(10))

        mockMvc.perform(get("/api/ledgers")
            .header("Authorization", "Bearer $token"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.ledgers[0].recurringSummaryClosingDay").value(10))
    }
}
