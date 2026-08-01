package com.woorilog.application.transactionimport.service

import com.woorilog.domain.category.entity.CategoryType
import com.woorilog.domain.category.repository.LedgerCategoryRepository
import com.woorilog.domain.ledger.repository.LedgerMemberRepository
import com.woorilog.domain.ledger.repository.LedgerRepository
import com.woorilog.common.exception.ForbiddenException
import com.woorilog.common.exception.NotFoundException
import com.woorilog.common.exception.WoorilogException
import com.woorilog.infrastructure.external.InvalidTransactionImageException
import com.woorilog.infrastructure.external.OcrEngineUnavailableException
import com.woorilog.infrastructure.external.OcrProcessingException
import com.woorilog.infrastructure.external.TransactionImageInput
import com.woorilog.infrastructure.external.TransactionImageOcr
import com.woorilog.infrastructure.external.TransactionImageOcrResult
import com.woorilog.application.transaction.service.TransactionService
import com.woorilog.application.transaction.command.CreateTransactionCommand
import com.woorilog.application.transaction.result.TransactionResult
import com.woorilog.application.transactionimport.command.TransactionImportPreviewCommand
import com.woorilog.application.transactionimport.result.TransactionImportCandidateResult
import com.woorilog.application.transactionimport.result.TransactionImportImagePreviewResult
import com.woorilog.application.transactionimport.result.TransactionImportPreviewResult
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDate

@Service
@Transactional(readOnly = true)
class TransactionImportService(
    private val ledgerRepository: LedgerRepository,
    private val ledgerMemberRepository: LedgerMemberRepository,
    private val ledgerCategoryRepository: LedgerCategoryRepository,
    private val transactionImageOcr: TransactionImageOcr,
    private val transactionService: TransactionService,
    private val clock: Clock,
) {

    fun preview(userId: Long, ledgerId: Long, request: TransactionImportPreviewCommand): TransactionImportPreviewResult {
        ensureLedgerAccess(userId, ledgerId)

        if (request.text.isBlank()) {
            throw WoorilogException("INVALID_REQUEST", "가져올 텍스트는 필수입니다.", HttpStatus.BAD_REQUEST)
        }

        return createPreview(ledgerId, request.text, request.transactionDate ?: LocalDate.now(clock))
    }

    fun previewImages(
        userId: Long,
        ledgerId: Long,
        inputs: List<TransactionImageInput>,
        transactionDate: LocalDate?,
    ): TransactionImportImagePreviewResult {
        ensureLedgerAccess(userId, ledgerId)
        if (inputs.isEmpty()) {
            throw WoorilogException("INVALID_OCR_IMAGE", "이미지 파일은 필수입니다.", HttpStatus.BAD_REQUEST)
        }
        if (inputs.size > MAX_OCR_IMAGE_COUNT) {
            throw WoorilogException(
                "INVALID_OCR_IMAGE",
                "이미지는 최대 ${MAX_OCR_IMAGE_COUNT}장까지 첨부할 수 있습니다.",
                HttpStatus.BAD_REQUEST,
            )
        }

        val fallbackDate = transactionDate ?: LocalDate.now(clock)
        val extractedTexts = mutableListOf<String>()
        val candidates = mutableListOf<TransactionImportCandidateResult>()
        var rejectedLines = 0
        var ocrEngine: String? = null

        inputs.forEachIndexed { imageIndex, input ->
            val ocrResult = recognizeImage(input, fallbackDate)
            val preview = createPreview(ledgerId, ocrResult.text, fallbackDate)
            extractedTexts += ocrResult.text
            ocrEngine = ocrEngine ?: ocrResult.engine
            rejectedLines += preview.rejectedLines
            candidates += preview.candidates.map { candidate ->
                if (inputs.size == 1) {
                    candidate
                } else {
                    candidate.copy(id = "image-${imageIndex + 1}-${candidate.id}")
                }
            }
        }

        return TransactionImportImagePreviewResult(
            extractedText = extractedTexts.joinToString("\n\n"),
            ocrEngine = ocrEngine ?: "tesseract-5-server",
            candidates = candidates,
            rejectedLines = rejectedLines,
        )
    }

    @Transactional
    fun saveCandidates(
        userId: Long,
        ledgerId: Long,
        candidates: List<CreateTransactionCommand>,
    ): List<TransactionResult> {
        if (candidates.isEmpty()) {
            throw WoorilogException("INVALID_REQUEST", "저장할 거래 후보는 하나 이상이어야 합니다.", HttpStatus.BAD_REQUEST)
        }

        return candidates.map { candidate ->
            transactionService.createTransaction(userId, ledgerId, candidate)
        }
    }

    private fun recognizeImage(input: TransactionImageInput, fallbackDate: LocalDate): TransactionImageOcrResult = try {
        transactionImageOcr.recognize(input, fallbackDate)
    } catch (exception: InvalidTransactionImageException) {
        throw WoorilogException("INVALID_OCR_IMAGE", exception.message ?: "이미지 파일이 유효하지 않습니다.", HttpStatus.BAD_REQUEST)
    } catch (exception: OcrEngineUnavailableException) {
        throw WoorilogException("OCR_UNAVAILABLE", "이미지 문자 인식 기능을 사용할 수 없습니다.", HttpStatus.SERVICE_UNAVAILABLE)
    } catch (exception: OcrProcessingException) {
        throw WoorilogException("OCR_PROCESSING_FAILED", "이미지에서 거래 내역을 읽지 못했습니다.", HttpStatus.UNPROCESSABLE_ENTITY)
    }

    private fun ensureLedgerAccess(userId: Long, ledgerId: Long) {
        ledgerRepository.findByIdOrNull(ledgerId) ?: throw NotFoundException("장부를 찾을 수 없습니다.")
        ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")
    }

    private fun createPreview(ledgerId: Long, text: String, fallbackDate: LocalDate): TransactionImportPreviewResult {
        val categories = ledgerCategoryRepository.findByLedgerIdOrderBySortOrderAsc(ledgerId)
        val parseResult = TransactionImportTextParser.parse(text, fallbackDate)
        val candidates = parseResult.candidates.map { parsedLine ->
            val type = inferType(parsedLine.rawText)
            val category = categories.firstOrNull {
                it.type == type && parsedLine.rawText.contains(it.name, ignoreCase = true)
            } ?: categories.firstOrNull { it.type == type }

            TransactionImportCandidateResult(
                id = "candidate-${parsedLine.sourceLineIndex + 1}",
                type = type,
                amount = parsedLine.amount,
                transactionDate = parsedLine.transactionDate,
                categoryId = category?.id,
                categoryName = category?.name,
                memo = parsedLine.memo,
                rawText = parsedLine.rawText,
                confidence = if (category != null) 0.82 else 0.68
            )
        }

        return TransactionImportPreviewResult(
            candidates = candidates,
            rejectedLines = parseResult.nonBlankLineCount - candidates.size
        )
    }

    private fun inferType(text: String): CategoryType {
        val incomeHints = listOf("급여", "입금", "수입", "환급", "이자", "bonus", "salary")
        return if (incomeHints.any { text.contains(it, ignoreCase = true) }) {
            CategoryType.INCOME
        } else {
            CategoryType.EXPENSE
        }
    }

    private companion object {
        const val MAX_OCR_IMAGE_COUNT = 10
    }
}
