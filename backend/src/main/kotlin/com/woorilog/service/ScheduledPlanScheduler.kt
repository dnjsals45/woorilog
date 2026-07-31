package com.woorilog.service

import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.time.Clock
import java.time.LocalDate

@Component
class ScheduledPlanScheduler(private val scheduledPlanService: ScheduledPlanService, private val clock: Clock) {
    @Scheduled(fixedDelayString = "\${app.scheduled-plans.poll-delay-ms:60000}")
    fun generateDuePlans() { scheduledPlanService.generateDue(LocalDate.now(clock)) }
}
