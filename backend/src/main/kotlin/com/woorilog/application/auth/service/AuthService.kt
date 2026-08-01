package com.woorilog.application.auth.service

import com.woorilog.domain.auth.entity.RefreshToken
import com.woorilog.domain.auth.entity.User
import com.woorilog.domain.auth.repository.RefreshTokenRepository
import com.woorilog.domain.auth.repository.UserRepository
import com.woorilog.domain.ledger.entity.Ledger
import com.woorilog.domain.ledger.entity.LedgerMember
import com.woorilog.domain.ledger.entity.LedgerRole
import com.woorilog.domain.ledger.entity.LedgerType
import com.woorilog.domain.ledger.repository.LedgerMemberRepository
import com.woorilog.domain.ledger.repository.LedgerRepository
import com.woorilog.common.exception.ForbiddenException
import com.woorilog.common.security.JwtTokenProvider
import com.woorilog.infrastructure.external.KakaoOAuthClient
import com.woorilog.application.budget.service.BudgetPeriodService
import com.woorilog.application.category.service.LedgerCategorySeedingService
import com.woorilog.application.auth.result.DevLoginResult
import com.woorilog.application.auth.result.LedgerDto
import com.woorilog.application.auth.result.MeResult
import com.woorilog.application.auth.result.UserDto
import com.woorilog.common.exception.WoorilogException
import org.springframework.http.HttpStatus
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.Clock
import java.time.DateTimeException
import java.time.ZoneId
import java.util.Base64

@Service
@Transactional
class AuthService(
    private val userRepository: UserRepository,
    private val ledgerRepository: LedgerRepository,
    private val ledgerMemberRepository: LedgerMemberRepository,
    private val jwtTokenProvider: JwtTokenProvider,
    private val ledgerCategorySeedingService: LedgerCategorySeedingService,
    private val kakaoOAuthClient: KakaoOAuthClient,
    private val refreshTokenRepository: RefreshTokenRepository,
    private val budgetPeriodService: BudgetPeriodService,
    private val clock: Clock,
    @Value("\${app.auth.dev-login-enabled}") private val devLoginEnabled: Boolean,
    @Value("\${app.jwt.access-token-ttl-seconds}") private val accessTokenTtlSeconds: Long,
    @Value("\${app.jwt.refresh-token-ttl-seconds}") private val refreshTokenTtlSeconds: Long,
) {
    private val secureRandom = SecureRandom()

    fun devLogin(email: String, nickname: String): DevLoginResult {
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
                nickname = nickname,
                nicknameConfirmedAt = clock.instant(),
            )
            user = userRepository.save(user)
        } else {
            // Update nickname or email if they changed
            user.nickname = nickname
            user.email = email
            user.nicknameConfirmedAt = clock.instant()
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

        return issueSession(user, currentLedger, token)
    }

    fun getMe(userId: Long): MeResult {
        val user = userRepository.findByIdOrNull(userId) ?: throw ForbiddenException("사용자를 찾을 수 없습니다.")
        val currentLedger = resolveCurrentLedger(user)
        return MeResult(
            user = UserDto.from(user),
            currentLedger = LedgerDto.from(currentLedger)
        )
    }

    fun kakaoAuthorizationUrl(): String = kakaoOAuthClient.authorizationUrl()

    fun kakaoLogin(code: String): DevLoginResult {
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
            if (user.nicknameConfirmedAt == null) {
                user.nickname = kakaoUser.nickname
            }
            user = userRepository.save(user)
        }

        val currentLedger = resolveCurrentLedger(user)
        return issueSession(user, currentLedger)
    }

    fun refresh(rawRefreshToken: String): DevLoginResult {
        val now = clock.instant()
        val storedToken = refreshTokenRepository.findByTokenHash(hashToken(rawRefreshToken))
            ?: throw WoorilogException("INVALID_REFRESH_TOKEN", "세션을 갱신할 수 없습니다.", HttpStatus.UNAUTHORIZED)
        if (!storedToken.isActive(now)) {
            throw WoorilogException("INVALID_REFRESH_TOKEN", "세션이 만료되었거나 이미 사용되었습니다.", HttpStatus.UNAUTHORIZED)
        }
        storedToken.revokedAt = now
        refreshTokenRepository.save(storedToken)
        return issueSession(storedToken.user, resolveCurrentLedger(storedToken.user))
    }

    fun updateProfile(userId: Long, nickname: String, timezone: String): UserDto {
        val normalizedNickname = nickname.trim()
        if (normalizedNickname.length !in 1..20) {
            throw WoorilogException("INVALID_REQUEST", "닉네임은 공백을 제외하고 1자에서 20자 사이여야 합니다.", HttpStatus.BAD_REQUEST)
        }

        val normalizedTimezone = try {
            ZoneId.of(timezone).id
        } catch (_: DateTimeException) {
            throw WoorilogException("INVALID_REQUEST", "올바른 시간대 형식이 아닙니다.", HttpStatus.BAD_REQUEST)
        }

        val user = userRepository.findByIdOrNull(userId) ?: throw ForbiddenException("사용자를 찾을 수 없습니다.")
        user.nickname = normalizedNickname
        user.timezone = normalizedTimezone
        user.nicknameConfirmedAt = clock.instant()
        return UserDto.from(userRepository.save(user))
    }

    fun logout(rawRefreshToken: String?) {
        if (rawRefreshToken.isNullOrBlank()) return
        val storedToken = refreshTokenRepository.findByTokenHash(hashToken(rawRefreshToken)) ?: return
        if (storedToken.revokedAt == null) {
            storedToken.revokedAt = clock.instant()
            refreshTokenRepository.save(storedToken)
        }
    }

    private fun issueSession(
        user: User,
        currentLedger: Ledger,
        accessToken: String = jwtTokenProvider.generateToken(user.id!!),
    ): DevLoginResult {
        val refreshToken = generateRefreshToken()
        refreshTokenRepository.save(
            RefreshToken(
                user = user,
                tokenHash = hashToken(refreshToken),
                expiresAt = clock.instant().plusSeconds(refreshTokenTtlSeconds),
            )
        )
        return DevLoginResult(
            accessToken = accessToken,
            expiresInSeconds = accessTokenTtlSeconds,
            user = UserDto.from(user),
            currentLedger = LedgerDto.from(currentLedger),
            refreshToken = refreshToken,
        )
    }

    private fun generateRefreshToken(): String {
        val bytes = ByteArray(48)
        secureRandom.nextBytes(bytes)
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
    }

    private fun hashToken(token: String): String = MessageDigest.getInstance("SHA-256")
        .digest(token.toByteArray(Charsets.UTF_8))
        .joinToString("") { "%02x".format(it) }

    fun resolveCurrentLedger(user: User): Ledger {
        val lastUsedId = user.lastUsedLedgerId
        if (lastUsedId != null) {
            val member = ledgerMemberRepository.findByLedgerIdAndUserId(lastUsedId, user.id!!)
            if (member != null) {
                if (!member.ledger.archived) return member.ledger
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
        val members = ledgerMemberRepository.findByUser(user).filter { !it.ledger.archived }
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
            role = LedgerRole.OWNER,
            joinedAt = clock.instant(),
        )
        ledgerMemberRepository.save(member)

        ledgerCategorySeedingService.seedDefaultCategories(savedLedger)
        budgetPeriodService.createInitialPeriod(
            ledger = savedLedger,
            totalBudget = savedLedger.defaultTotalBudgetAmount,
            owner = user,
            preparePersonal = true,
        )

        return savedLedger
    }
}
