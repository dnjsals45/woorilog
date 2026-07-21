package com.woorilog.service

import java.time.LocalDate

fun interface TransactionImageOcr {
    fun recognize(input: TransactionImageInput, fallbackDate: LocalDate): TransactionImageOcrResult
}

data class TransactionImageInput(
    val bytes: ByteArray,
    val contentType: String?,
)

data class TransactionImageOcrResult(
    val text: String,
    val engine: String,
)

internal class InvalidTransactionImageException(message: String) : RuntimeException(message)

internal class OcrEngineUnavailableException(cause: Throwable? = null) :
    RuntimeException("Native Tesseract OCR을 실행할 수 없습니다.", cause)

internal class OcrProcessingException(cause: Throwable? = null) :
    RuntimeException("이미지 OCR 처리에 실패했습니다.", cause)
