package com.woorilog.domain.transactionimport.entity

import com.woorilog.common.entity.BaseEntity
import com.woorilog.domain.budget.entity.BudgetAllocation
import com.woorilog.domain.category.entity.LedgerCategory
import com.woorilog.domain.transaction.entity.Transaction

import jakarta.persistence.*
import java.time.LocalDate

@Entity
@Table(name = "import_candidates")
class ImportCandidate(
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "import_session_id", nullable = false)
    var importSession: ImportSession,
    @Column(name = "occurred_on", nullable = false)
    var occurredOn: LocalDate,
    @Column(nullable = false)
    var amount: Long,
    @Column(nullable = false)
    var merchant: String,
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "suggested_category_id")
    var suggestedCategory: LedgerCategory? = null,
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "suggested_allocation_id")
    var suggestedAllocation: BudgetAllocation? = null,
    @Column(name = "duplicate_suspected", nullable = false)
    var duplicateSuspected: Boolean = false,
    @Column(name = "duplicate_reason")
    var duplicateReason: String? = null,
    @Column(name = "selected_by_default", nullable = false)
    var selectedByDefault: Boolean = true,
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "generated_transaction_id")
    var generatedTransaction: Transaction? = null,
) : BaseEntity()
