package com.woorilog.domain

import jakarta.persistence.*

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
    var ownerId: Long
) : BaseEntity()
