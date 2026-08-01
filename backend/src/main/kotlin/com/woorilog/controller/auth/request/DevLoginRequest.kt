package com.woorilog.controller.auth.request

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank

data class DevLoginRequest(
    @field:NotBlank(message = "이메일은 필수 입력값입니다.")
    @field:Email(message = "이메일 형식이 올바르지 않습니다.")
    val email: String,

    @field:NotBlank(message = "닉네임은 필수 입력값입니다.")
    val nickname: String
)
