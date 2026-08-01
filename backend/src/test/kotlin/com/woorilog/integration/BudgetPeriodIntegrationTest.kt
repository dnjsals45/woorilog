package com.woorilog.integration

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import com.woorilog.controller.auth.response.DevLoginResponse
import org.hamcrest.Matchers.hasSize
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class BudgetPeriodIntegrationTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @Test
    fun should_CreateAndConfigureSharedLedgerBudgetPeriodAndTransferReserve() {
        val login = devLogin("budget-period@example.com", "예산설정자")
        val created = mockMvc.perform(post("/api/ledgers/shared")
            .header("Authorization", "Bearer ${login.accessToken}")
            .contentType(MediaType.APPLICATION_JSON)
            .content(json(mapOf(
                "name" to "우리 생활비",
                "totalBudget" to 2_000_000,
                "budgetCycle" to mapOf("startType" to "DAY_OF_MONTH", "startDay" to 10),
            ))))
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.ledger.name").value("우리 생활비"))
            .andExpect(jsonPath("$.currentBudgetPeriod.totalBudget").value(2_000_000))
            .andExpect(jsonPath("$.currentBudgetPeriod.allocations", hasSize<Any>(0)))
            .andExpect(jsonPath("$.currentBudgetPeriod.reserveAmount").value(null))
            .andExpect(jsonPath("$.currentBudgetPeriod.prepared").value(false))
            .andReturn()

        val currentPeriod = body(created)
            .path("currentBudgetPeriod")
        val ledgerId = body(created).path("ledger").path("id").asLong()
        val startDate = LocalDate.parse(currentPeriod.path("startDate").asText())
        val endDate = LocalDate.parse(currentPeriod.path("endDate").asText())
        assertEquals(10, startDate.dayOfMonth)
        assertEquals(startDate.plusMonths(1).minusDays(1), endDate)

        val configure = mapOf(
            "totalBudget" to 2_000_000,
            "personalAllocations" to listOf(mapOf("userId" to login.user.id, "amount" to 400_000)),
            "sharedAllocation" to 1_000_000,
            "increaseTotalBudgetIfNeeded" to false,
            "applyToFutureDefaults" to false,
        )
        val periodPath = "/api/ledgers/$ledgerId/budget-periods/$startDate"
        mockMvc.perform(put(periodPath)
            .header("Authorization", "Bearer ${login.accessToken}")
            .contentType(MediaType.APPLICATION_JSON)
            .content(json(configure)))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.totalBudget").value(2_000_000))
            .andExpect(jsonPath("$.allocations", hasSize<Any>(2)))
            .andExpect(jsonPath("$.reserveAmount").value(600_000))
            .andExpect(jsonPath("$.prepared").value(true))

        val overAllocated = configure + mapOf("totalBudget" to 1_300_000)
        mockMvc.perform(put(periodPath)
            .header("Authorization", "Bearer ${login.accessToken}")
            .contentType(MediaType.APPLICATION_JSON)
            .content(json(overAllocated)))
            .andExpect(status().isConflict)
            .andExpect(jsonPath("$.code").value("TOTAL_BUDGET_INCREASE_CONFIRMATION_REQUIRED"))

        mockMvc.perform(put(periodPath)
            .header("Authorization", "Bearer ${login.accessToken}")
            .contentType(MediaType.APPLICATION_JSON)
            .content(json(overAllocated + mapOf("increaseTotalBudgetIfNeeded" to true))))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.totalBudget").value(1_400_000))
            .andExpect(jsonPath("$.reserveAmount").value(0))

        mockMvc.perform(post("$periodPath/reserve-transfers")
            .header("Authorization", "Bearer ${login.accessToken}")
            .contentType(MediaType.APPLICATION_JSON)
            .content(json(mapOf(
                "amount" to 100_000,
                "target" to mapOf("type" to "SHARED", "ownerUserId" to null),
            ))))
            .andExpect(status().isConflict)
            .andExpect(jsonPath("$.code").value("INSUFFICIENT_RESERVE"))

        val increasedTotal = configure + mapOf(
            "totalBudget" to 2_000_000,
            "increaseTotalBudgetIfNeeded" to false,
        )
        mockMvc.perform(put(periodPath)
            .header("Authorization", "Bearer ${login.accessToken}")
            .contentType(MediaType.APPLICATION_JSON)
            .content(json(increasedTotal)))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.reserveAmount").value(600_000))

        mockMvc.perform(post("$periodPath/reserve-transfers")
            .header("Authorization", "Bearer ${login.accessToken}")
            .contentType(MediaType.APPLICATION_JSON)
            .content(json(mapOf(
                "amount" to 100_000,
                "target" to mapOf("type" to "SHARED", "ownerUserId" to null),
            ))))
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.transfer.amount").value(100_000))
            .andExpect(jsonPath("$.period.reserveAmount").value(500_000))
            .andExpect(jsonPath("$.period.allocations[?(@.source.type == 'SHARED')].amount").value(1_100_000))

        mockMvc.perform(put("/api/ledgers/$ledgerId/budget-periods/${startDate.plusDays(1)}")
            .header("Authorization", "Bearer ${login.accessToken}")
            .contentType(MediaType.APPLICATION_JSON)
            .content(json(configure)))
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.code").value("INVALID_BUDGET_PERIOD_START"))
    }

    private fun devLogin(email: String, nickname: String): DevLoginResponse {
        val result = mockMvc.perform(post("/api/auth/dev-login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(json(mapOf("email" to email, "nickname" to nickname))))
            .andExpect(status().isOk)
            .andReturn()
        return objectMapper.readValue(result.response.contentAsString, DevLoginResponse::class.java)
    }

    private fun body(result: org.springframework.test.web.servlet.MvcResult): JsonNode =
        objectMapper.readTree(result.response.contentAsString)

    private fun json(value: Any): String = objectMapper.writeValueAsString(value)
}
