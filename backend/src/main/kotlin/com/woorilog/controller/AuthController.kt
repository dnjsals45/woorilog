package com.woorilog.controller

import com.woorilog.exception.WoorilogException
import com.woorilog.security.UserPrincipal
import com.woorilog.service.AuthService
import com.woorilog.service.DevLoginResponse
import com.woorilog.service.MeResponse
import jakarta.validation.Valid
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import org.springframework.http.HttpStatus
import org.springframework.http.HttpHeaders
import org.springframework.http.ResponseCookie
import org.springframework.http.ResponseEntity
import org.springframework.beans.factory.annotation.Value
import java.time.Duration
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api")
class AuthController(
    private val authService: AuthService,
    @Value("\${app.auth.refresh-cookie-name:woorilog.refreshToken}") private val refreshCookieName: String,
    @Value("\${app.auth.refresh-cookie-secure:false}") private val refreshCookieSecure: Boolean,
    @Value("\${app.jwt.refresh-token-ttl-seconds}") private val refreshTokenTtlSeconds: Long,
) {

    @PostMapping("/auth/dev-login")
    fun devLogin(@Valid @RequestBody request: DevLoginRequest): ResponseEntity<DevLoginResponse> {
        return sessionResponse(authService.devLogin(request.email, request.nickname))
    }

    @GetMapping("/me")
    fun getMe(@AuthenticationPrincipal principal: UserPrincipal): MeResponse {
        return authService.getMe(principal.userId)
    }

    @PostMapping("/auth/logout")
    fun logout(
        @CookieValue(name = "\${app.auth.refresh-cookie-name:woorilog.refreshToken}", required = false) refreshToken: String?,
    ): ResponseEntity<Void> {
        authService.logout(refreshToken)
        return ResponseEntity.noContent()
            .header(HttpHeaders.SET_COOKIE, expiredRefreshCookie().toString())
            .build()
    }

    @PostMapping("/auth/refresh")
    fun refresh(
        @CookieValue(name = "\${app.auth.refresh-cookie-name:woorilog.refreshToken}", required = false) refreshToken: String?,
    ): ResponseEntity<DevLoginResponse> {
        if (refreshToken.isNullOrBlank()) {
            throw WoorilogException("REFRESH_TOKEN_REQUIRED", "세션 갱신 정보가 없습니다.", HttpStatus.UNAUTHORIZED)
        }
        return sessionResponse(authService.refresh(refreshToken))
    }

    @GetMapping("/auth/kakao/login-url")
    fun getKakaoLoginUrl(): KakaoLoginUrlResponse {
        return KakaoLoginUrlResponse(authService.kakaoAuthorizationUrl())
    }

    @PostMapping("/auth/kakao/callback")
    fun kakaoCallback(@Valid @RequestBody request: KakaoCallbackRequest): ResponseEntity<DevLoginResponse> {
        return sessionResponse(authService.kakaoLogin(request.code))
    }

    private fun sessionResponse(session: DevLoginResponse): ResponseEntity<DevLoginResponse> =
        ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, refreshCookie(session.refreshToken).toString())
            .body(session)

    private fun refreshCookie(token: String): ResponseCookie = ResponseCookie
        .from(refreshCookieName, token)
        .httpOnly(true)
        .secure(refreshCookieSecure)
        .sameSite("Lax")
        .path("/api/auth")
        .maxAge(Duration.ofSeconds(refreshTokenTtlSeconds))
        .build()

    private fun expiredRefreshCookie(): ResponseCookie = ResponseCookie
        .from(refreshCookieName, "")
        .httpOnly(true)
        .secure(refreshCookieSecure)
        .sameSite("Lax")
        .path("/api/auth")
        .maxAge(Duration.ZERO)
        .build()
}

data class KakaoLoginUrlResponse(val loginUrl: String)

data class KakaoCallbackRequest(
    @field:NotBlank(message = "카카오 인증 코드는 필수입니다.")
    val code: String,
)

data class DevLoginRequest(
    @field:NotBlank(message = "이메일은 필수 입력값입니다.")
    @field:Email(message = "이메일 형식이 올바르지 않습니다.")
    val email: String,

    @field:NotBlank(message = "닉네임은 필수 입력값입니다.")
    val nickname: String
)
