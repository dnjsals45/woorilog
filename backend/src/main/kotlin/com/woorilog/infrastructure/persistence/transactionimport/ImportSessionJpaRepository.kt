package com.woorilog.infrastructure.persistence.transactionimport

import com.woorilog.domain.transactionimport.entity.ImportSession
import org.springframework.data.jpa.repository.JpaRepository

interface ImportSessionJpaRepository : JpaRepository<ImportSession, Long>
