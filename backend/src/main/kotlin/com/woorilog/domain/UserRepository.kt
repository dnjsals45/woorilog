package com.woorilog.domain

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface UserRepository : JpaRepository<User, Long> {
    fun findByProviderAndProviderUserId(provider: String, providerUserId: String): User?
    fun findByEmail(email: String): User?
}
