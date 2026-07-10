package com.woorilog.exception

import org.springframework.http.HttpStatus

open class WoorilogException(
    val code: String,
    override val message: String,
    val status: HttpStatus
) : RuntimeException(message)

class UnauthorizedException(message: String = "인증 정보가 유효하지 않습니다.") :
    WoorilogException("UNAUTHORIZED", message, HttpStatus.UNAUTHORIZED)

class ForbiddenException(message: String = "권한이 없습니다.") :
    WoorilogException("FORBIDDEN", message, HttpStatus.FORBIDDEN)

class NotFoundException(message: String = "리소스를 찾을 수 없습니다.") :
    WoorilogException("NOT_FOUND", message, HttpStatus.NOT_FOUND)

class BadRequestException(message: String = "잘못된 요청입니다.") :
    WoorilogException("BAD_REQUEST", message, HttpStatus.BAD_REQUEST)
