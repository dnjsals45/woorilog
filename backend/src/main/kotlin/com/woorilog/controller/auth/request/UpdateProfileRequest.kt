package com.woorilog.controller.auth.request

import jakarta.validation.constraints.NotBlank

data class UpdateProfileRequest(
    @field:NotBlank(message = "닉네임은 필수 입력값입니다.")
    val nickname: String,

    @field:NotBlank(message = "시간대는 필수 입력값입니다.")
    val timezone: String,
)
