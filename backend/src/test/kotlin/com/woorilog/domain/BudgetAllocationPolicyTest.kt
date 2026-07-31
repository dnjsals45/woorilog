package com.woorilog.domain

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test

class BudgetAllocationPolicyTest {
    @Test
    fun `배분하지 않은 금액은 예비비가 된다`() {
        val decision = BudgetAllocationPolicy.decide(
            totalBudget = 1_000_000,
            allocationAmounts = listOf(200_000, 200_000, 500_000),
            approveTotalIncrease = false,
        )

        assertEquals(1_000_000, decision.totalBudget)
        assertEquals(100_000, decision.reserveAmount)
    }

    @Test
    fun `합계 초과는 명시적 승인 없이 저장할 수 없다`() {
        val error = assertThrows(BudgetAllocationIncreaseApprovalRequired::class.java) {
            BudgetAllocationPolicy.decide(
                totalBudget = 1_000,
                allocationAmounts = listOf(700, 500),
                approveTotalIncrease = false,
            )
        }

        assertEquals(1_200, error.requiredTotalBudget)
    }

    @Test
    fun `합계 초과를 승인하면 전체 예산을 높이고 예비비를 0으로 둔다`() {
        val decision = BudgetAllocationPolicy.decide(
            totalBudget = 1_000,
            allocationAmounts = listOf(700, 500),
            approveTotalIncrease = true,
        )

        assertEquals(1_200, decision.totalBudget)
        assertEquals(0, decision.reserveAmount)
    }
}
