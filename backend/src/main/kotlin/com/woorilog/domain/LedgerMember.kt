package com.woorilog.domain

import jakarta.persistence.*

enum class LedgerRole {
    OWNER, MEMBER
}

@Entity
@Table(
    name = "ledger_members",
    uniqueConstraints = [
        UniqueConstraint(columnNames = ["ledger_id", "user_id"])
    ]
)
class LedgerMember(
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ledger_id", nullable = false)
    var ledger: Ledger,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    var user: User,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var role: LedgerRole
) : BaseEntity()
