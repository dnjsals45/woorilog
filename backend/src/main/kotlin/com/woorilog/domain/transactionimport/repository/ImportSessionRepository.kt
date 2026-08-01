package com.woorilog.domain.transactionimport.repository

import com.woorilog.domain.transactionimport.entity.ImportSession

interface ImportSessionRepository {
    fun findByIdOrNull(id: Long): ImportSession?
    fun save(importSession: ImportSession): ImportSession
}
