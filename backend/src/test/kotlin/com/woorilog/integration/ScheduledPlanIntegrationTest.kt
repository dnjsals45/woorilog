package com.woorilog.integration

import com.fasterxml.jackson.databind.ObjectMapper
import com.woorilog.domain.scheduled.entity.ScheduledOccurrenceStatus
import com.woorilog.domain.scheduled.entity.ScheduledPauseReason
import com.woorilog.domain.scheduled.entity.ScheduledPlanStatus
import com.woorilog.domain.scheduled.repository.ScheduledOccurrenceRepository
import com.woorilog.domain.scheduled.repository.ScheduledPlanRepository
import com.woorilog.controller.auth.response.DevLoginResponse
import com.woorilog.application.scheduled.service.ScheduledPlanService
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
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
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
    fun should_ExposeCategoryBudgetSourceAndInstallmentMetricsOnPlanResponse() {
        val login = login("scheduled-response-fields@example.com")
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
        val planId = objectMapper.readTree(result.response.contentAsString).path("schedule").path("planId").asLong()

        mockMvc.perform(get("/api/ledgers/${login.currentLedger.id}/scheduled-plans")
            .header("Authorization", "Bearer ${login.accessToken}"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].categoryId").value(categoryId))
            .andExpect(jsonPath("$[0].categoryName").value("장보기"))
            .andExpect(jsonPath("$[0].budgetSource.type").value("PERSONAL"))
            .andExpect(jsonPath("$[0].budgetSource.ownerUserId").value(login.user.id))
            .andExpect(jsonPath("$[0].totalAmount").value(10_000))
            .andExpect(jsonPath("$[0].round").value(1))
            .andExpect(jsonPath("$[0].totalRounds").value(3))
            .andExpect(jsonPath("$[0].principalAmount").value(3_334))
            .andExpect(jsonPath("$[0].monthlyInterest").value(10))
        assertTrue(planId > 0)
    }

    @Test
    fun should_ApplyCategoryBudgetSourceFrequencyAndFixedExpenseRenameOnUpdate() {
        val login = login("scheduled-update@example.com")
        val groceryId = categoryId(login, "장보기")
        val diningId = categoryId(login, "외식")
        val due = LocalDate.now()
        val created = mockMvc.perform(post("/api/ledgers/${login.currentLedger.id}/scheduled-plans/recurring-expenses")
            .header("Authorization", "Bearer ${login.accessToken}").contentType(MediaType.APPLICATION_JSON)
            .content(json(mapOf("name" to "월세", "amount" to 100_000, "merchant" to "임대인", "categoryId" to groceryId,
                "budgetSource" to mapOf("type" to "PERSONAL", "ownerUserId" to login.user.id), "frequency" to "MONTHLY",
                "startDate" to due.toString(), "isFixedExpense" to false)))).andExpect(status().isCreated).andReturn()
        val planId = objectMapper.readTree(created.response.contentAsString).path("id").asLong()

        mockMvc.perform(put("/api/scheduled-plans/$planId")
            .header("Authorization", "Bearer ${login.accessToken}").contentType(MediaType.APPLICATION_JSON)
            .content(json(mapOf(
                "scope" to "FUTURE", "name" to "월세", "amount" to 820_000, "categoryId" to diningId,
                "budgetSource" to mapOf("type" to "PERSONAL", "ownerUserId" to login.user.id), "frequency" to "YEARLY",
                "nextDueDate" to due.toString(), "isFixedExpense" to true,
            ))))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.amount").value(820_000))
            .andExpect(jsonPath("$.isFixedExpense").value(true))
            .andExpect(jsonPath("$.frequency").value("YEARLY"))
            .andExpect(jsonPath("$.categoryId").value(diningId))
            .andExpect(jsonPath("$.categoryName").value("외식"))

        val plan = planRepository.findByLedgerIdOrderByIdDesc(login.currentLedger.id).single { it.id == planId }
        assertEquals(820_000, plan.amount)
        assertTrue(plan.fixedExpense)
        assertEquals(diningId, plan.category?.id)
    }

    @Test
    fun should_RegenerateScheduledOccurrencesWithNewAmountAndFrequencyOnUpdate() {
        val login = login("scheduled-regenerate@example.com")
        val groceryId = categoryId(login, "장보기")
        val due = LocalDate.now()
        val created = mockMvc.perform(post("/api/ledgers/${login.currentLedger.id}/scheduled-plans/recurring-expenses")
            .header("Authorization", "Bearer ${login.accessToken}").contentType(MediaType.APPLICATION_JSON)
            .content(json(mapOf("name" to "통신비", "amount" to 50_000, "merchant" to "통신사", "categoryId" to groceryId,
                "budgetSource" to mapOf("type" to "PERSONAL", "ownerUserId" to login.user.id), "frequency" to "MONTHLY",
                "startDate" to due.toString(), "isFixedExpense" to true)))).andExpect(status().isCreated).andReturn()
        val planId = objectMapper.readTree(created.response.contentAsString).path("id").asLong()

        // 첫 발생분은 시작일이 오늘이라 이미 거래로 생성(GENERATED)돼 있다.
        val generatedBefore = occurrenceRepository.findByPlanIdAndStatus(planId, ScheduledOccurrenceStatus.GENERATED)
        assertEquals(1, generatedBefore.size)
        assertEquals(50_000, generatedBefore.single().amount)

        mockMvc.perform(put("/api/scheduled-plans/$planId")
            .header("Authorization", "Bearer ${login.accessToken}").contentType(MediaType.APPLICATION_JSON)
            .content(json(mapOf("scope" to "FUTURE", "amount" to 70_000, "frequency" to "YEARLY"))))
            .andExpect(status().isOk)

        // 이미 생성된 발생분은 옛 금액 그대로 남고, 아직 생성 안 된 발생분만 새 금액으로 다시 만들어진다.
        assertEquals(50_000, occurrenceRepository.findByPlanIdAndStatus(planId, ScheduledOccurrenceStatus.GENERATED).single().amount)
        val scheduled = occurrenceRepository.findByPlanIdAndStatus(planId, ScheduledOccurrenceStatus.SCHEDULED)
        assertTrue(scheduled.isNotEmpty())
        assertTrue(scheduled.all { it.amount == 70_000L })
        // 주기를 매년으로 바꿨으므로 다음 예정일은 한 달 뒤가 아니라 1년 뒤여야 한다.
        assertEquals(due.plusYears(1), scheduled.minByOrNull { it.sequence }!!.dueDate)
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
