package com.woorilog.service

import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

@Component
class RecurringTransactionScheduler(
    private val recurringTransactionService: RecurringTransactionService,
) {
    @Scheduled(cron = "0 0 * * * *", zone = "Asia/Seoul")
    fun generateDueTransactions() {
        recurringTransactionService.generateDueTransactions()
    }
}
