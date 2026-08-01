package com.woorilog.infrastructure.persistence.auth

import com.woorilog.domain.auth.entity.User
import com.woorilog.domain.auth.repository.UserRepository
import org.springframework.stereotype.Repository

@Repository
class UserRepositoryImpl(
    private val jpaRepository: UserJpaRepository,
) : UserRepository {
    override fun findByIdOrNull(id: Long): User? = jpaRepository.findById(id).orElse(null)
    override fun findByProviderAndProviderUserId(provider: String, providerUserId: String): User? =
        jpaRepository.findByProviderAndProviderUserId(provider, providerUserId)
    override fun findByEmail(email: String): User? = jpaRepository.findByEmail(email)
    override fun save(user: User): User = jpaRepository.save(user)
}
