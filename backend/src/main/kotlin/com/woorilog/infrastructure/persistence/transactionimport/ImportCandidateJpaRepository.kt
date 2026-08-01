package com.woorilog.infrastructure.persistence.transactionimport

import com.woorilog.domain.transactionimport.entity.ImportCandidate
import org.springframework.data.jpa.repository.JpaRepository

interface ImportCandidateJpaRepository : JpaRepository<ImportCandidate, Long> {
    fun findByImportSessionIdOrderById(importSessionId: Long): List<ImportCandidate>
}
