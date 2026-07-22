package com.woorilog.exception

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.http.HttpStatus

class GlobalExceptionHandlerTest {

    @Test
    fun should_NotExposeExceptionMessage_When_UnexpectedErrorOccurs() {
        val response = GlobalExceptionHandler().handleGenericException(
            IllegalStateException("sensitive database detail"),
        )

        assertThat(response.statusCode).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR)
        assertThat(response.body?.code).isEqualTo("INTERNAL_SERVER_ERROR")
        assertThat(response.body?.message).isEqualTo("서버 내부 오류가 발생했습니다.")
        assertThat(response.body?.message).doesNotContain("sensitive database detail")
    }
}
