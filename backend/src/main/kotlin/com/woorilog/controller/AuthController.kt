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
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api")
class AuthController(
    private val authService: AuthService
) {

    @PostMapping("/auth/dev-login")
    fun devLogin(@Valid @RequestBody request: DevLoginRequest): DevLoginResponse {
        return authService.devLogin(request.email, request.nickname)
    }

    @GetMapping("/me")
    fun getMe(@AuthenticationPrincipal principal: UserPrincipal): MeResponse {
        return authService.getMe(principal.userId)
    }

    @PostMapping("/auth/logout")
    fun logout(): ResponseEntity<Void> {
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/auth/refresh")
    fun refresh(): ResponseEntity<Void> {
        throw WoorilogException("NOT_IMPLEMENTED", "토큰 재발급 기능은 아직 지원하지 않습니다.", HttpStatus.NOT_IMPLEMENTED)
    }

    @GetMapping("/auth/kakao/login-url")
    fun getKakaoLoginUrl(): KakaoLoginUrlResponse {
        return KakaoLoginUrlResponse(authService.kakaoAuthorizationUrl())
    }

    @PostMapping("/auth/kakao/callback")
    fun kakaoCallback(@Valid @RequestBody request: KakaoCallbackRequest): DevLoginResponse {
        return authService.kakaoLogin(request.code)
    }
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
