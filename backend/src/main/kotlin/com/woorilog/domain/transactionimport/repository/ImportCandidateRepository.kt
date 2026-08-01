package com.woorilog.domain.transactionimport.repository

import com.woorilog.domain.transactionimport.entity.ImportCandidate

interface ImportCandidateRepository {
    fun findByImportSessionIdOrderById(importSessionId: Long): List<ImportCandidate>
    fun save(importCandidate: ImportCandidate): ImportCandidate
}
