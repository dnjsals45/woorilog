package com.woorilog.infrastructure.persistence.auth

import com.woorilog.domain.auth.entity.RefreshToken
import org.springframework.data.jpa.repository.JpaRepository

interface RefreshTokenJpaRepository : JpaRepository<RefreshToken, Long> {
    fun findByTokenHash(tokenHash: String): RefreshToken?
}
