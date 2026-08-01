package com.woorilog.domain.budget.entity

import com.woorilog.common.entity.BaseEntity
import com.woorilog.domain.ledger.entity.Ledger

import jakarta.persistence.*
import java.time.Instant
import java.time.LocalDate

@Entity
@Table(name = "budget_periods", uniqueConstraints = [UniqueConstraint(columnNames = ["ledger_id", "start_date"])])
class BudgetPeriod(
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "ledger_id", nullable = false)
    var ledger: Ledger,
    @Column(name = "start_date", nullable = false)
    var startDate: LocalDate,
    @Column(name = "end_date", nullable = false)
    var endDate: LocalDate,
    @Column(name = "total_budget_amount", nullable = false)
    var totalBudgetAmount: Long,
    @Column(name = "prepared_at")
    var preparedAt: Instant? = null,
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "source_period_id")
    var sourcePeriod: BudgetPeriod? = null,
) : BaseEntity()
