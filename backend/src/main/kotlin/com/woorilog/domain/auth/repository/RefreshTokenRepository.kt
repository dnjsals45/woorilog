package com.woorilog.domain.auth.repository

import com.woorilog.domain.auth.entity.RefreshToken

interface RefreshTokenRepository {
    fun findByTokenHash(tokenHash: String): RefreshToken?
    fun save(refreshToken: RefreshToken): RefreshToken
}
