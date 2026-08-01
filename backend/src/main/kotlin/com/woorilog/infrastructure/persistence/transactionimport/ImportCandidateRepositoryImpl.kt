package com.woorilog.infrastructure.persistence.transactionimport

import com.woorilog.domain.transactionimport.entity.ImportCandidate
import com.woorilog.domain.transactionimport.repository.ImportCandidateRepository
import org.springframework.stereotype.Repository

@Repository
class ImportCandidateRepositoryImpl(
    private val jpaRepository: ImportCandidateJpaRepository,
) : ImportCandidateRepository {
    override fun findByImportSessionIdOrderById(importSessionId: Long) = jpaRepository.findByImportSessionIdOrderById(importSessionId)
    override fun save(importCandidate: ImportCandidate): ImportCandidate = jpaRepository.save(importCandidate)
}
