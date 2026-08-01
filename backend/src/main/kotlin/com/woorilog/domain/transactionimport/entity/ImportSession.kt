package com.woorilog.domain.transactionimport.entity

import com.woorilog.common.entity.BaseEntity
import com.woorilog.domain.auth.entity.User
import com.woorilog.domain.ledger.entity.Ledger

import jakarta.persistence.*
import java.time.Instant

@Entity
@Table(name = "import_sessions")
class ImportSession(
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "ledger_id", nullable = false)
    var ledger: Ledger,
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "uploaded_by_user_id", nullable = false)
    var uploadedBy: User,
    @Enumerated(EnumType.STRING) @Column(name = "source_type", nullable = false)
    var sourceType: ImportSourceType,
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    var status: ImportSessionStatus = ImportSessionStatus.PREVIEWED,
    @Column(name = "expires_at", nullable = false)
    var expiresAt: Instant,
    @Column(name = "omitted_count", nullable = false)
    var omittedCount: Int = 0,
) : BaseEntity()
