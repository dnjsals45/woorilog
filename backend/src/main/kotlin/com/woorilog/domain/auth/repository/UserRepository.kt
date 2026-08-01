package com.woorilog.domain.auth.repository

import com.woorilog.domain.auth.entity.User

interface UserRepository {
    fun findByIdOrNull(id: Long): User?
    fun findByProviderAndProviderUserId(provider: String, providerUserId: String): User?
    fun findByEmail(email: String): User?
    fun save(user: User): User
}
