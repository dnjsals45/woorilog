package com.woorilog.infrastructure.persistence.auth

import com.woorilog.domain.auth.entity.RefreshToken
import com.woorilog.domain.auth.repository.RefreshTokenRepository
import org.springframework.stereotype.Repository

@Repository
class RefreshTokenRepositoryImpl(
    private val jpaRepository: RefreshTokenJpaRepository,
) : RefreshTokenRepository {
    override fun findByTokenHash(tokenHash: String): RefreshToken? = jpaRepository.findByTokenHash(tokenHash)
    override fun save(refreshToken: RefreshToken): RefreshToken = jpaRepository.save(refreshToken)
}
