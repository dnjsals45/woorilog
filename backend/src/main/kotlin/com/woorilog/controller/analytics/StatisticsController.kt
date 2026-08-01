package com.woorilog.controller.analytics

import com.woorilog.common.security.UserPrincipal
import com.woorilog.application.analytics.service.DashboardService
import com.woorilog.application.analytics.service.V1InsightsService
import com.woorilog.controller.analytics.response.MonthlyStatisticsResponse
import com.woorilog.controller.analytics.response.toResponse
import com.woorilog.domain.transaction.policy.AnalyticsScope
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
        return dashboardService.getMonthlyStatistics(principal.userId, ledgerId, from, to).map { it.toResponse() }
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
