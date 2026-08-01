package com.woorilog.controller.auth.request

import jakarta.validation.constraints.NotBlank

data class KakaoCallbackRequest(
    @field:NotBlank(message = "카카오 인증 코드는 필수입니다.")
    val code: String,
)
