package com.woorilog.controller

import com.woorilog.domain.UserRepository
import com.woorilog.security.JwtAuthenticationFilter
import com.woorilog.security.JwtTokenProvider
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.junit.jupiter.api.Test
import org.mockito.Mockito.mock
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.context.annotation.Bean
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.content
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

import com.woorilog.security.SecurityConfig
import org.springframework.context.annotation.Import

@WebMvcTest(HealthController::class)
@Import(SecurityConfig::class)
class HealthControllerTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Test
    fun should_ReturnHealthStatus_When_GetHealth() {
        mockMvc.perform(get("/health")
            .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk)
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.status").value("UP"))
            .andExpect(jsonPath("$.service").value("woorilog-backend"))
    }

    @TestConfiguration
    class TestConfig {
        @Bean
        fun jwtAuthenticationFilter(): JwtAuthenticationFilter {
            return object : JwtAuthenticationFilter(
                mock(JwtTokenProvider::class.java),
                mock(UserRepository::class.java)
            ) {
                override fun doFilterInternal(
                    request: HttpServletRequest,
                    response: HttpServletResponse,
                    filterChain: FilterChain
                ) {
                    filterChain.doFilter(request, response)
                }
            }
        }
    }
}
