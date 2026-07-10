package com.woorilog.controller

import com.woorilog.security.UserPrincipal
import com.woorilog.service.DashboardService
import com.woorilog.service.MonthlyStatisticsResponse
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/ledgers/{ledgerId}/statistics")
class StatisticsController(
    private val dashboardService: DashboardService
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
