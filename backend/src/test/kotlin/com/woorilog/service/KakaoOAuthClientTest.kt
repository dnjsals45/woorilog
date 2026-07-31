package com.woorilog.service

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

class KakaoOAuthClientTest {

    @Test
    fun should_ExtractOnlySafeKakaoErrorFields_When_ResponseContainsSensitiveDescription() {
        val error = parseKakaoApiError(
            """{"error":"invalid_grant","error_description":"authorization code=secret-code","error_code":"KOE320"}""",
        )

        assertEquals("invalid_grant", error.error)
        assertEquals("KOE320", error.errorCode)
    }

    @Test
    fun should_ReturnEmptyError_When_KakaoResponseIsNotJson() {
        val error = parseKakaoApiError("upstream gateway error")

        assertNull(error.error)
        assertNull(error.errorCode)
    }
}
