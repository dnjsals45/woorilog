package com.woorilog.integration

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import org.hamcrest.Matchers.hasSize
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*
import org.springframework.transaction.annotation.Transactional

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class SettlementAndManagementIntegrationTest {
    @Autowired private lateinit var mockMvc: MockMvc
    @Autowired private lateinit var objectMapper: ObjectMapper

    @Test
    fun should_ManageSettlementNotificationAndClosedMonth_When_GroupLedgerIsUsed() {
        val owner = login("settlement-owner@example.com", "소유자")
        val member = login("settlement-member@example.com", "멤버")
        val ledger = json(
            mockMvc.perform(post("/api/ledgers/group")
                .header("Authorization", "Bearer ${owner.token}")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(mapOf("name" to "정산 장부"))))
                .andExpect(status().isOk).andReturn().response.contentAsString
        )
        val ledgerId = ledger["id"].asLong()

        val invitation = json(
            mockMvc.perform(post("/api/ledgers/$ledgerId/invitations/users")
                .header("Authorization", "Bearer ${owner.token}")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(mapOf("userId" to member.userId))))
                .andExpect(status().isOk).andReturn().response.contentAsString
        )
        mockMvc.perform(post("/api/invitations/${invitation["id"].asLong()}/accept")
            .header("Authorization", "Bearer ${member.token}"))
            .andExpect(status().isOk)

        mockMvc.perform(get("/api/notifications").header("Authorization", "Bearer ${member.token}"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.unreadCount").value(1))
            .andExpect(jsonPath("$.notifications[0].type").value("INVITATION"))
        mockMvc.perform(post("/api/notifications/read-all").header("Authorization", "Bearer ${member.token}"))
            .andExpect(status().isNoContent)

        val categories = json(
            mockMvc.perform(get("/api/ledgers/$ledgerId/categories").header("Authorization", "Bearer ${owner.token}"))
                .andExpect(status().isOk).andReturn().response.contentAsString
        )
        val expenseCategoryId = categories.first { it["type"].asText() == "EXPENSE" }["id"].asLong()
        val month = "2026-07"
        mockMvc.perform(put("/api/ledgers/$ledgerId/months/$month")
            .header("Authorization", "Bearer ${owner.token}")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body(mapOf(
                "totalBudgetAmount" to 100_000,
                "categoryBudgets" to listOf(mapOf("categoryId" to expenseCategoryId, "amount" to 100_000)),
                "memberAllocations" to listOf(
                    mapOf("userId" to owner.userId, "amount" to 50_000),
                    mapOf("userId" to member.userId, "amount" to 50_000),
                ),
            ))))
            .andExpect(status().isOk)

        val transaction = json(
            mockMvc.perform(post("/api/ledgers/$ledgerId/transactions")
                .header("Authorization", "Bearer ${owner.token}")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(mapOf(
                    "type" to "EXPENSE", "amount" to 100_000, "transactionDate" to "2026-07-12",
                    "categoryId" to expenseCategoryId, "memo" to "공동 생활비", "payerUserId" to owner.userId,
                ))))
                .andExpect(status().isOk).andReturn().response.contentAsString
        )

        mockMvc.perform(get("/api/ledgers/$ledgerId/months/$month/settlements")
            .header("Authorization", "Bearer ${owner.token}"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.transfers", hasSize<Any>(1)))
            .andExpect(jsonPath("$.transfers[0].fromUserId").value(member.userId))
            .andExpect(jsonPath("$.transfers[0].toUserId").value(owner.userId))
            .andExpect(jsonPath("$.transfers[0].amount").value(50_000))

        mockMvc.perform(post("/api/ledgers/$ledgerId/months/$month/settlements")
            .header("Authorization", "Bearer ${member.token}")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body(mapOf("fromUserId" to member.userId, "toUserId" to owner.userId, "amount" to 50_000))))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.transfers", hasSize<Any>(0)))
            .andExpect(jsonPath("$.payments", hasSize<Any>(1)))

        mockMvc.perform(patch("/api/ledgers/$ledgerId")
            .header("Authorization", "Bearer ${owner.token}")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body(mapOf("name" to "우리집 정산 장부"))))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.name").value("우리집 정산 장부"))

        mockMvc.perform(post("/api/ledgers/$ledgerId/months/$month/close")
            .header("Authorization", "Bearer ${owner.token}"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.closed").value(true))

        mockMvc.perform(delete("/api/transactions/${transaction["id"].asLong()}")
            .header("Authorization", "Bearer ${owner.token}"))
            .andExpect(status().isConflict)
            .andExpect(jsonPath("$.code").value("MONTH_CLOSED"))

        mockMvc.perform(post("/api/ledgers/$ledgerId/transactions")
            .header("Authorization", "Bearer ${owner.token}")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body(mapOf(
                "type" to "EXPENSE", "amount" to 1_000, "transactionDate" to "2026-07-13",
                "categoryId" to expenseCategoryId, "memo" to "마감 후 거래", "payerUserId" to owner.userId,
            ))))
            .andExpect(status().isConflict)

        mockMvc.perform(post("/api/ledgers/$ledgerId/months/$month/reopen")
            .header("Authorization", "Bearer ${owner.token}"))
            .andExpect(status().isOk)
        mockMvc.perform(delete("/api/transactions/${transaction["id"].asLong()}")
            .header("Authorization", "Bearer ${owner.token}"))
            .andExpect(status().isNoContent)
    }

    private fun login(email: String, nickname: String): Login {
        val response = json(
            mockMvc.perform(post("/api/auth/dev-login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(mapOf("email" to email, "nickname" to nickname))))
                .andExpect(status().isOk).andReturn().response.contentAsString
        )
        return Login(response["accessToken"].asText(), response["user"]["id"].asLong())
    }

    private fun body(value: Any): String = objectMapper.writeValueAsString(value)
    private fun json(value: String): JsonNode = objectMapper.readTree(value)
    private data class Login(val token: String, val userId: Long)
}
