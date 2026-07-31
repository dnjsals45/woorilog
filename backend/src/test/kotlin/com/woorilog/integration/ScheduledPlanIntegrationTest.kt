package com.woorilog.integration

import com.fasterxml.jackson.databind.ObjectMapper
import com.woorilog.domain.ScheduledOccurrenceStatus
import com.woorilog.domain.ScheduledPauseReason
import com.woorilog.domain.ScheduledPlanStatus
import com.woorilog.domain.ScheduledOccurrenceRepository
import com.woorilog.domain.ScheduledPlanRepository
import com.woorilog.service.DevLoginResponse
import com.woorilog.service.ScheduledPlanService
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ScheduledPlanIntegrationTest {
    @Autowired lateinit var mockMvc: MockMvc
    @Autowired lateinit var objectMapper: ObjectMapper
    @Autowired lateinit var planRepository: ScheduledPlanRepository
    @Autowired lateinit var occurrenceRepository: ScheduledOccurrenceRepository
    @Autowired lateinit var scheduledPlanService: ScheduledPlanService

    @Test
    fun should_CreateInstallmentPlanOccurrencesAndFirstTransactionFromV1Body() {
        val login = login("scheduled-installment@example.com")
        val categoryId = categoryId(login, "장보기")
        val due = LocalDate.now()
        val result = mockMvc.perform(post("/api/ledgers/${login.currentLedger.id}/transactions")
            .header("Authorization", "Bearer ${login.accessToken}")
            .contentType(MediaType.APPLICATION_JSON)
            .content(json(mapOf(
                "type" to "EXPENSE", "amount" to 10_000, "occurredOn" to due.toString(), "merchant" to "가전점",
                "categoryId" to categoryId, "scope" to mapOf("type" to "PERSONAL", "ownerUserId" to login.user.id),
                "budgetSource" to mapOf("type" to "PERSONAL", "ownerUserId" to login.user.id),
                "paymentMethod" to mapOf("type" to "CARD", "displayName" to "테스트 카드"),
                "installment" to mapOf("months" to 3, "monthlyInterest" to 10),
            )))).andExpect(status().isOk).andReturn()
        val transactionId = objectMapper.readTree(result.response.contentAsString).path("id").asLong()
        val plan = planRepository.findByLedgerIdOrderByIdDesc(login.currentLedger.id).single()
        val occurrences = occurrenceRepository.findByPlanIdAndStatus(plan.id!!, ScheduledOccurrenceStatus.SCHEDULED)
        assertEquals(3, plan.installmentTotalCount)
        assertEquals(10_000, plan.totalPrincipalAmount)
        assertEquals(2, occurrences.size)
        val generated = occurrenceRepository.findByPlanIdAndStatus(plan.id!!, ScheduledOccurrenceStatus.GENERATED).single()
        assertEquals(transactionId, generated.generatedTransactionId)
        assertEquals(3_344, generated.amount) // 3,334 principal + 10 interest
        assertTrue(occurrences.all { it.amount == 3_343L })
    }

    @Test
    fun should_NotDuplicateGeneratedOccurrenceWhenDueJobRunsAgain() {
        val login = login("scheduled-duplicate@example.com")
        val categoryId = categoryId(login, "장보기")
        val due = LocalDate.now()
        val response = mockMvc.perform(post("/api/ledgers/${login.currentLedger.id}/scheduled-plans/recurring-expenses")
            .header("Authorization", "Bearer ${login.accessToken}").contentType(MediaType.APPLICATION_JSON)
            .content(json(mapOf("name" to "월세", "amount" to 100_000, "merchant" to "임대인", "categoryId" to categoryId,
                "budgetSource" to mapOf("type" to "PERSONAL", "ownerUserId" to login.user.id), "frequency" to "MONTHLY", "startDate" to due.toString(), "isFixedExpense" to true)))).andExpect(status().isCreated).andReturn()
        val planId = objectMapper.readTree(response.response.contentAsString).path("id").asLong()
        assertTrue(scheduledPlanService.generateDue(due) in 0..1)
        assertEquals(0, scheduledPlanService.generateDue(due))
        assertEquals(1, occurrenceRepository.findByPlanIdAndStatus(planId, ScheduledOccurrenceStatus.GENERATED).size)
    }

    private fun login(email: String): DevLoginResponse {
        val result = mockMvc.perform(post("/api/auth/dev-login").contentType(MediaType.APPLICATION_JSON).content(json(mapOf("email" to email, "nickname" to "예약 사용자")))).andExpect(status().isOk).andReturn()
        return objectMapper.readValue(result.response.contentAsString, DevLoginResponse::class.java)
    }
    private fun categoryId(login: DevLoginResponse, name: String): Long {
        val result = mockMvc.perform(get("/api/ledgers/${login.currentLedger.id}/categories").header("Authorization", "Bearer ${login.accessToken}")).andExpect(status().isOk).andReturn()
        return objectMapper.readTree(result.response.contentAsString).first { it.path("name").asText() == name }.path("id").asLong()
    }
    private fun json(value: Any) = objectMapper.writeValueAsString(value)
}
