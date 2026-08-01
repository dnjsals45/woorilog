package com.woorilog.controller.analytics

import com.woorilog.common.security.UserPrincipal
import com.woorilog.application.analytics.service.DashboardService
import com.woorilog.controller.analytics.response.DashboardSummaryResponse
import com.woorilog.controller.analytics.response.toResponse
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDate

@RestController
@RequestMapping("/api/dashboard")
class DashboardController(
    private val dashboardService: DashboardService
) {

    @GetMapping("/current")
    fun getCurrentDashboard(
        @AuthenticationPrincipal principal: UserPrincipal,
        @RequestParam(required = false) budgetMonth: String?,
        @RequestParam(required = false) ledgerId: Long?,
        @RequestParam(required = false) periodStart: LocalDate?,
    ): DashboardSummaryResponse {
        return dashboardService.getCurrentDashboardSummary(principal.userId, budgetMonth, ledgerId, periodStart).toResponse()
    }
}
