package com.woorilog.exception

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.multipart.MaxUploadSizeExceededException
import org.springframework.web.multipart.support.MissingServletRequestPartException

@RestControllerAdvice
class GlobalExceptionHandler {

    @ExceptionHandler(WoorilogException::class)
    fun handleWoorilogException(e: WoorilogException): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(e.status)
            .body(ErrorResponse(code = e.code, message = e.message))
    }

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidationException(e: MethodArgumentNotValidException): ResponseEntity<ErrorResponse> {
        val errorMessage = e.bindingResult.fieldErrors
            .joinToString(", ") { "${it.field}: ${it.defaultMessage}" }
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(ErrorResponse(code = "INVALID_REQUEST", message = errorMessage))
    }

    @ExceptionHandler(MaxUploadSizeExceededException::class)
    fun handleMaxUploadSizeException(): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.PAYLOAD_TOO_LARGE)
            .body(ErrorResponse(code = "OCR_IMAGE_TOO_LARGE", message = "이미지 파일은 10MB 이하여야 합니다."))
    }

    @ExceptionHandler(MissingServletRequestPartException::class)
    fun handleMissingRequestPartException(e: MissingServletRequestPartException): ResponseEntity<ErrorResponse> {
        val message = if (e.requestPartName == "image") {
            "이미지 파일은 필수입니다."
        } else {
            "요청에 ${e.requestPartName} 항목이 필요합니다."
        }
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(ErrorResponse(code = "INVALID_OCR_IMAGE", message = message))
    }

    @ExceptionHandler(Exception::class)
    fun handleGenericException(e: Exception): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ErrorResponse(code = "INTERNAL_SERVER_ERROR", message = e.message ?: "서버 내부 오류가 발생했습니다."))
    }
}

data class ErrorResponse(
    val code: String,
    val message: String
)
