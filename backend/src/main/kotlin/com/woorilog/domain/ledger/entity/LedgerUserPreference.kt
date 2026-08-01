package com.woorilog.domain.ledger.entity

import com.woorilog.common.entity.BaseEntity
import com.woorilog.domain.auth.entity.User
import com.woorilog.domain.budget.entity.BudgetAllocationScope

import jakarta.persistence.*

@Entity
@Table(
    name = "ledger_user_preferences",
    uniqueConstraints = [UniqueConstraint(columnNames = ["ledger_id", "user_id"])]
)
class LedgerUserPreference(
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "ledger_id", nullable = false)
    var ledger: Ledger,
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false)
    var user: User,
    @Enumerated(EnumType.STRING) @Column(name = "last_budget_scope")
    var lastBudgetScope: BudgetAllocationScope? = null,
    @Column(name = "last_budget_owner_user_id")
    var lastBudgetOwnerUserId: Long? = null,
    @Column(name = "share_new_personal_transactions", nullable = false)
    var shareNewPersonalTransactions: Boolean = false,
) : BaseEntity()
