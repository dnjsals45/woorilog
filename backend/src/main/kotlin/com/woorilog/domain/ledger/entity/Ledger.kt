package com.woorilog.domain.ledger.entity

import com.woorilog.common.entity.BaseEntity

import jakarta.persistence.*
import java.time.Instant
import com.woorilog.domain.budget.policy.BudgetStartType

enum class LedgerType {
    PERSONAL, GROUP
}

@Entity
@Table(name = "ledgers")
class Ledger(
    @Column(nullable = false)
    var name: String,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var type: LedgerType,

    @Column(name = "owner_id", nullable = false)
    var ownerId: Long,

    @Column(nullable = false)
    var archived: Boolean = false,

    @Column(name = "recurring_summary_closing_day", nullable = false)
    var recurringSummaryClosingDay: Int = 31,

    @Enumerated(EnumType.STRING)
    @Column(name = "budget_start_type", nullable = false)
    var budgetStartType: BudgetStartType = BudgetStartType.DAY_OF_MONTH,

    @Column(name = "budget_start_day")
    var budgetStartDay: Int? = 1,

    @Column(name = "default_total_budget_amount", nullable = false)
    var defaultTotalBudgetAmount: Long = 0,

    /* 삭제된 장부. archived 와 따로 두는 이유는 초대 링크를 클릭했을 때 "보관됨"이 아니라
     * "삭제됨"을 정확히 알려주기 위해서다. 삭제 시 archived 도 함께 true 로 둔다. */
    @Column(name = "deleted_at")
    var deletedAt: Instant? = null,
) : BaseEntity()
