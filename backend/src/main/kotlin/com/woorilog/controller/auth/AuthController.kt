package com.woorilog.controller.auth

import com.woorilog.common.exception.WoorilogException
import com.woorilog.common.security.UserPrincipal
import com.woorilog.application.auth.service.AuthService
import com.woorilog.controller.auth.request.DevLoginRequest
import com.woorilog.controller.auth.request.KakaoCallbackRequest
import com.woorilog.controller.auth.request.UpdateProfileRequest
import com.woorilog.controller.auth.response.DevLoginResponse
import com.woorilog.controller.auth.response.KakaoLoginUrlResponse
import com.woorilog.controller.auth.response.MeResponse
import com.woorilog.controller.auth.response.UserResponse
import com.woorilog.controller.auth.response.toResponse
import jakarta.validation.Valid
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
        return sessionResponse(authService.devLogin(request.email, request.nickname).toResponse())
    }

    @GetMapping("/me")
    fun getMe(@AuthenticationPrincipal principal: UserPrincipal): MeResponse {
        return authService.getMe(principal.userId).toResponse()
    }

    @PatchMapping("/me/profile")
    fun updateProfile(
        @AuthenticationPrincipal principal: UserPrincipal,
        @Valid @RequestBody request: UpdateProfileRequest,
    ): UserResponse = authService.updateProfile(principal.userId, request.nickname, request.timezone).toResponse()

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
        return sessionResponse(authService.refresh(refreshToken).toResponse())
    }

    @GetMapping("/auth/kakao/login-url")
    fun getKakaoLoginUrl(): KakaoLoginUrlResponse {
        return KakaoLoginUrlResponse(authService.kakaoAuthorizationUrl())
    }

    @PostMapping("/auth/kakao/callback")
    fun kakaoCallback(@Valid @RequestBody request: KakaoCallbackRequest): ResponseEntity<DevLoginResponse> {
        return sessionResponse(authService.kakaoLogin(request.code).toResponse())
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
