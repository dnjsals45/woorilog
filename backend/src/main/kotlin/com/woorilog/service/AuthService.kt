package com.woorilog.service

import com.woorilog.domain.*
import com.woorilog.exception.ForbiddenException
import com.woorilog.security.JwtTokenProvider
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class AuthService(
    private val userRepository: UserRepository,
    private val ledgerRepository: LedgerRepository,
    private val ledgerMemberRepository: LedgerMemberRepository,
    private val jwtTokenProvider: JwtTokenProvider,
    private val ledgerCategorySeedingService: LedgerCategorySeedingService,
    private val kakaoOAuthClient: KakaoOAuthClient,
    @Value("\${app.auth.dev-login-enabled}") private val devLoginEnabled: Boolean,
    @Value("\${app.jwt.access-token-ttl-seconds}") private val accessTokenTtlSeconds: Long
) {

    fun devLogin(email: String, nickname: String): DevLoginResponse {
        if (!devLoginEnabled) {
            throw ForbiddenException("개발자 로그인이 활성화되어 있지 않습니다.")
        }

        // 1. Upsert a DEV provider user
        var user = userRepository.findByProviderAndProviderUserId("DEV", email)
        if (user == null) {
            user = User(
                provider = "DEV",
                providerUserId = email,
                email = email,
                nickname = nickname
            )
            user = userRepository.save(user)
        } else {
            // Update nickname or email if they changed
            user.nickname = nickname
            user.email = email
            user = userRepository.save(user)
        }

        // 2. Ensure default personal ledger exists
        val currentLedger = resolveCurrentLedger(user)

        // 3. Set fallback last used ledger
        if (user.lastUsedLedgerId == null) {
            user.lastUsedLedgerId = currentLedger.id
            userRepository.save(user)
        }

        // 4. Generate access token
        val token = jwtTokenProvider.generateToken(user.id!!)

        return DevLoginResponse(
            accessToken = token,
            expiresInSeconds = accessTokenTtlSeconds,
            user = UserDto.from(user),
            currentLedger = LedgerDto.from(currentLedger)
        )
    }

    fun getMe(userId: Long): MeResponse {
        val user = userRepository.findById(userId).orElseThrow {
            ForbiddenException("사용자를 찾을 수 없습니다.")
        }
        val currentLedger = resolveCurrentLedger(user)
        return MeResponse(
            user = UserDto.from(user),
            currentLedger = LedgerDto.from(currentLedger)
        )
    }

    fun kakaoAuthorizationUrl(): String = kakaoOAuthClient.authorizationUrl()

    fun kakaoLogin(code: String): DevLoginResponse {
        val kakaoUser = kakaoOAuthClient.getUser(code)
        var user = userRepository.findByProviderAndProviderUserId("KAKAO", kakaoUser.providerUserId)
        if (user == null) {
            user = userRepository.save(
                User(
                    provider = "KAKAO",
                    providerUserId = kakaoUser.providerUserId,
                    email = kakaoUser.email,
                    nickname = kakaoUser.nickname,
                )
            )
        } else {
            user.email = kakaoUser.email
            user.nickname = kakaoUser.nickname
            user = userRepository.save(user)
        }

        val currentLedger = resolveCurrentLedger(user)
        return DevLoginResponse(
            accessToken = jwtTokenProvider.generateToken(user.id!!),
            expiresInSeconds = accessTokenTtlSeconds,
            user = UserDto.from(user),
            currentLedger = LedgerDto.from(currentLedger),
        )
    }

    fun resolveCurrentLedger(user: User): Ledger {
        val lastUsedId = user.lastUsedLedgerId
        if (lastUsedId != null) {
            val member = ledgerMemberRepository.findByLedgerIdAndUserId(lastUsedId, user.id!!)
            if (member != null) {
                return member.ledger
            }
        }

        // Fallback or create default personal ledger
        val defaultLedger = ensureDefaultPersonalLedger(user)
        if (user.lastUsedLedgerId != defaultLedger.id) {
            user.lastUsedLedgerId = defaultLedger.id
            userRepository.save(user)
        }
        return defaultLedger
    }

    private fun ensureDefaultPersonalLedger(user: User): Ledger {
        val members = ledgerMemberRepository.findByUser(user)
        if (members.isNotEmpty()) {
            val personalLedger = members.map { it.ledger }.firstOrNull { it.type == LedgerType.PERSONAL }
            if (personalLedger != null) {
                return personalLedger
            }
            return members.first().ledger
        }

        // No ledger exists, create one
        val ledger = Ledger(
            name = "${user.nickname}의 개인 장부",
            type = LedgerType.PERSONAL,
            ownerId = user.id!!
        )
        val savedLedger = ledgerRepository.save(ledger)

        val member = LedgerMember(
            ledger = savedLedger,
            user = user,
            role = LedgerRole.OWNER
        )
        ledgerMemberRepository.save(member)

        ledgerCategorySeedingService.seedDefaultCategories(savedLedger)

        return savedLedger
    }
}

data class DevLoginResponse(
    val accessToken: String,
    val expiresInSeconds: Long,
    val user: UserDto,
    val currentLedger: LedgerDto
)

data class MeResponse(
    val user: UserDto,
    val currentLedger: LedgerDto
)

data class UserDto(
    val id: Long,
    val email: String?,
    val nickname: String,
    val lastUsedLedgerId: Long?
) {
    companion object {
        fun from(user: User) = UserDto(
            id = user.id!!,
            email = user.email,
            nickname = user.nickname,
            lastUsedLedgerId = user.lastUsedLedgerId
        )
    }
}

data class LedgerDto(
    val id: Long,
    val name: String,
    val type: LedgerType,
    val ownerId: Long
) {
    companion object {
        fun from(ledger: Ledger) = LedgerDto(
            id = ledger.id!!,
            name = ledger.name,
            type = ledger.type,
            ownerId = ledger.ownerId
        )
    }
}
