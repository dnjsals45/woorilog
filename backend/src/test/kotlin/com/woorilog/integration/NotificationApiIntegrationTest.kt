package com.woorilog.integration

import com.fasterxml.jackson.databind.ObjectMapper
import com.woorilog.domain.NotificationType
import com.woorilog.service.DevLoginResponse
import com.woorilog.service.NotificationService
import org.hamcrest.Matchers.hasSize
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

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class NotificationApiIntegrationTest {
    @Autowired private lateinit var mockMvc: MockMvc
    @Autowired private lateinit var objectMapper: ObjectMapper
    @Autowired private lateinit var notificationService: NotificationService

    @Test
    fun should_ListReadAndConfigureNotificationsWithV1Contract() {
        val login = login("notification-api@example.com", "알림사용자")
        repeat(3) { index ->
            notificationService.notifyUser(login.user.id, NotificationType.SYSTEM, "알림 $index", "내용 $index", "/notifications", "notification-api-$index")
        }

        val firstPage = mockMvc.perform(get("/api/notifications")
            .header("Authorization", "Bearer ${login.accessToken}")
            .param("limit", "1"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.items", hasSize<Any>(1)))
            .andExpect(jsonPath("$.unreadCount").value(3))
            .andExpect(jsonPath("$.items[0].read").value(false))
            .andExpect(jsonPath("$.nextCursor").isNotEmpty)
            .andReturn()
        val first = objectMapper.readTree(firstPage.response.contentAsString)
        val notificationId = first.path("items")[0].path("id").asLong()

        mockMvc.perform(post("/api/notifications/$notificationId/read")
            .header("Authorization", "Bearer ${login.accessToken}"))
            .andExpect(status().isNoContent)
        mockMvc.perform(post("/api/notifications/$notificationId/read")
            .header("Authorization", "Bearer ${login.accessToken}"))
            .andExpect(status().isNoContent)

        mockMvc.perform(get("/api/notifications")
            .header("Authorization", "Bearer ${login.accessToken}")
            .param("unreadOnly", "true"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.unreadCount").value(2))
            .andExpect(jsonPath("$.items", hasSize<Any>(2)))

        mockMvc.perform(get("/api/notification-preferences")
            .header("Authorization", "Bearer ${login.accessToken}"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.budgetWarning80Enabled").value(true))
            .andExpect(jsonPath("$.weeklyGuideEnabled").value(true))

        mockMvc.perform(put("/api/notification-preferences")
            .header("Authorization", "Bearer ${login.accessToken}")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(mapOf("budgetWarning80Enabled" to false, "weeklyGuideEnabled" to false))))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.budgetWarning80Enabled").value(false))
            .andExpect(jsonPath("$.weeklyGuideEnabled").value(false))

        mockMvc.perform(post("/api/notifications/read-all")
            .header("Authorization", "Bearer ${login.accessToken}"))
            .andExpect(status().isNoContent)
        mockMvc.perform(get("/api/notifications")
            .header("Authorization", "Bearer ${login.accessToken}"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.unreadCount").value(0))
    }

    private fun login(email: String, nickname: String): DevLoginResponse {
        val result = mockMvc.perform(post("/api/auth/dev-login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(mapOf("email" to email, "nickname" to nickname))))
            .andExpect(status().isOk)
            .andReturn()
        return objectMapper.readValue(result.response.contentAsString, DevLoginResponse::class.java)
    }
}
