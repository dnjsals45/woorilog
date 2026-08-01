package com.woorilog.infrastructure.persistence.auth

import com.woorilog.domain.auth.entity.User
import org.springframework.data.jpa.repository.JpaRepository

interface UserJpaRepository : JpaRepository<User, Long> {
    fun findByProviderAndProviderUserId(provider: String, providerUserId: String): User?
    fun findByEmail(email: String): User?
}
