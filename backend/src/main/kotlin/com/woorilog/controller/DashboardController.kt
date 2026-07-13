package com.woorilog.controller

import com.woorilog.security.UserPrincipal
import com.woorilog.service.DashboardService
import com.woorilog.service.DashboardSummaryResponse
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/dashboard")
class DashboardController(
    private val dashboardService: DashboardService
) {

    @GetMapping("/current")
    fun getCurrentDashboard(
        @AuthenticationPrincipal principal: UserPrincipal,
        @RequestParam(required = false) budgetMonth: String?,
    ): DashboardSummaryResponse {
        return dashboardService.getCurrentDashboardSummary(principal.userId, budgetMonth)
    }
}
