package com.woorilog.security

import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.time.Clock
import java.util.Date
import javax.crypto.SecretKey

@Component
class JwtTokenProvider(
    @Value("\${app.jwt.secret}") private val jwtSecret: String,
    @Value("\${app.jwt.access-token-ttl-seconds}") private val accessTokenTtlSeconds: Long,
    private val clock: Clock
) {
    private val key: SecretKey by lazy {
        val secretBytes = jwtSecret.toByteArray(Charsets.UTF_8)
        if (secretBytes.size < 32) {
            Keys.hmacShaKeyFor(jwtSecret.padEnd(32, 'a').toByteArray(Charsets.UTF_8))
        } else {
            Keys.hmacShaKeyFor(secretBytes)
        }
    }

    fun generateToken(userId: Long): String {
        val now = clock.instant()
        val expiryDate = now.plusSeconds(accessTokenTtlSeconds)
        return Jwts.builder()
            .subject(userId.toString())
            .issuedAt(Date.from(now))
            .expiration(Date.from(expiryDate))
            .signWith(key)
            .compact()
    }

    fun getUserIdFromToken(token: String): Long? {
        return try {
            val claims = Jwts.parser()
                .verifyWith(key)
                .clock { Date.from(clock.instant()) }
                .build()
                .parseSignedClaims(token)
                .payload
            claims.subject?.toLongOrNull()
        } catch (e: Exception) {
            null
        }
    }
}
