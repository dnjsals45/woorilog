package com.woorilog.infrastructure.persistence.transactionimport

import com.woorilog.domain.transactionimport.entity.ImportSession
import com.woorilog.domain.transactionimport.repository.ImportSessionRepository
import org.springframework.stereotype.Repository

@Repository
class ImportSessionRepositoryImpl(
    private val jpaRepository: ImportSessionJpaRepository,
) : ImportSessionRepository {
    override fun findByIdOrNull(id: Long): ImportSession? = jpaRepository.findById(id).orElse(null)
    override fun save(importSession: ImportSession): ImportSession = jpaRepository.save(importSession)
}
