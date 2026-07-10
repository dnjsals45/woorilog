package com.woorilog.controller

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

@RestController
class HealthController {

    @GetMapping("/health")
    fun getHealth(): HealthResponse {
        return HealthResponse(status = "UP", service = "woorilog-backend")
    }
}

data class HealthResponse(
    val status: String,
    val service: String
)
