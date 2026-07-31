package com.woorilog.controller

import com.woorilog.security.UserPrincipal
import com.woorilog.service.DashboardService
import com.woorilog.service.MonthlyStatisticsResponse
import com.woorilog.service.AnalyticsScope
import com.woorilog.service.V1InsightsService
import java.time.LocalDate
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/ledgers/{ledgerId}/statistics")
class StatisticsController(
    private val dashboardService: DashboardService,
    private val insightsService: V1InsightsService,
) {

    @GetMapping("/monthly")
    fun getMonthlyStatistics(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @RequestParam from: String,
        @RequestParam to: String
    ): List<MonthlyStatisticsResponse> {
        return dashboardService.getMonthlyStatistics(principal.userId, ledgerId, from, to)
    }
}

@RestController
class AnalyticsController(private val insightsService: V1InsightsService) {
    @GetMapping("/api/ledgers/{ledgerId}/analytics")
    fun analytics(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @RequestParam(required = false) periodStart: LocalDate?,
        @RequestParam(defaultValue = "ALL") scope: AnalyticsScope,
    ) = insightsService.analytics(principal.userId, ledgerId, periodStart, scope)
}
