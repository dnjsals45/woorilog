package com.woorilog.domain

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import java.time.LocalDate

class BudgetCyclePolicyTest {
    @Test
    fun `10일 시작 기간은 다음 달 9일에 끝난다`() {
        val policy = BudgetCyclePolicy(BudgetStartType.DAY_OF_MONTH, 10)

        assertEquals(
            BudgetDateRange(LocalDate.of(2026, 7, 10), LocalDate.of(2026, 8, 9)),
            policy.periodContaining(LocalDate.of(2026, 7, 31)),
        )
        assertEquals(
            BudgetDateRange(LocalDate.of(2026, 6, 10), LocalDate.of(2026, 7, 9)),
            policy.periodContaining(LocalDate.of(2026, 7, 9)),
        )
    }

    @Test
    fun `말일 시작 기간은 윤년의 2월 말일을 사용한다`() {
        val policy = BudgetCyclePolicy(BudgetStartType.LAST_DAY_OF_MONTH, null)

        assertEquals(
            BudgetDateRange(LocalDate.of(2024, 1, 31), LocalDate.of(2024, 2, 28)),
            policy.periodContaining(LocalDate.of(2024, 2, 28)),
        )
        assertEquals(
            BudgetDateRange(LocalDate.of(2024, 2, 29), LocalDate.of(2024, 3, 30)),
            policy.periodContaining(LocalDate.of(2024, 2, 29)),
        )
    }

    @Test
    fun `시작일은 1일부터 28일까지만 허용한다`() {
        assertThrows(IllegalArgumentException::class.java) {
            BudgetCyclePolicy(BudgetStartType.DAY_OF_MONTH, 29)
        }
        assertThrows(IllegalArgumentException::class.java) {
            BudgetCyclePolicy(BudgetStartType.LAST_DAY_OF_MONTH, 1)
        }
    }
}
