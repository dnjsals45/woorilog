package com.woorilog.domain

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import java.time.LocalDate

class ScheduledTransactionPolicyTest {
    @Test
    fun `할부 원금 나머지 1원은 앞 회차부터 배분한다`() {
        val principals = (1..3).map { InstallmentPolicy.principalForSequence(10, 3, it) }

        assertEquals(listOf(4L, 3L, 3L), principals)
        assertEquals(10, principals.sum())
    }

    @Test
    fun `월 이자는 각 회차 원금에 더한다`() {
        assertEquals(104, InstallmentPolicy.amountForSequence(10, 3, 1, 100))
        assertEquals(103, InstallmentPolicy.amountForSequence(10, 3, 2, 100))
    }

    @Test
    fun `31일 월 반복은 다음 달 말일로 보정한다`() {
        assertEquals(
            LocalDate.of(2024, 2, 29),
            ScheduleDatePolicy.nextDate(
                LocalDate.of(2024, 1, 31),
                ScheduleFrequency.MONTHLY,
                anchorDay = 31,
            ),
        )
        assertEquals(
            LocalDate.of(2024, 3, 31),
            ScheduleDatePolicy.nextDate(
                LocalDate.of(2024, 2, 29),
                ScheduleFrequency.MONTHLY,
                anchorDay = 31,
            ),
        )
    }

    @Test
    fun `윤일 연 반복은 평년에 2월 말일로 보정한다`() {
        assertEquals(
            LocalDate.of(2025, 2, 28),
            ScheduleDatePolicy.nextDate(
                LocalDate.of(2024, 2, 29),
                ScheduleFrequency.YEARLY,
                anchorDay = 29,
            ),
        )
    }
}
