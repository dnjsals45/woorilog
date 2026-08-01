package com.woorilog.domain.transaction.policy

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import com.woorilog.domain.transaction.policy.LedgerTransactionType
import com.woorilog.domain.transaction.policy.TransactionAggregationEffect
import com.woorilog.domain.transaction.policy.TransactionPolicy
import com.woorilog.domain.transaction.policy.TransferType

class TransactionPolicyTest {
    @Test
    fun `내 계좌 간 이체는 예산과 수입 지출 집계에서 제외한다`() {
        assertEquals(
            TransactionAggregationEffect.EXCLUDED,
            TransactionPolicy.aggregationEffect(LedgerTransactionType.TRANSFER, TransferType.OWN_ACCOUNTS),
        )
        assertFalse(
            TransactionPolicy.requiresBudgetAllocation(
                LedgerTransactionType.TRANSFER,
                TransferType.OWN_ACCOUNTS,
            ),
        )
    }

    @Test
    fun `외부 송금만 이체 중 예산을 차감한다`() {
        assertTrue(
            TransactionPolicy.requiresBudgetAllocation(
                LedgerTransactionType.TRANSFER,
                TransferType.OUTBOUND,
            ),
        )
        assertFalse(
            TransactionPolicy.requiresBudgetAllocation(
                LedgerTransactionType.TRANSFER,
                TransferType.INBOUND,
            ),
        )
    }

    @Test
    fun `이체는 하위 유형이 필수이고 일반 거래에는 허용하지 않는다`() {
        assertThrows(IllegalArgumentException::class.java) {
            TransactionPolicy.aggregationEffect(LedgerTransactionType.TRANSFER, null)
        }
        assertThrows(IllegalArgumentException::class.java) {
            TransactionPolicy.aggregationEffect(LedgerTransactionType.EXPENSE, TransferType.OUTBOUND)
        }
    }
}
