package com.woorilog.service

import com.woorilog.domain.CategoryType
import com.woorilog.domain.LedgerCategoryRepository
import com.woorilog.domain.LedgerMemberRepository
import com.woorilog.domain.LedgerRepository
import com.woorilog.exception.ForbiddenException
import com.woorilog.exception.NotFoundException
import com.woorilog.exception.WoorilogException
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
    private val clock: Clock,
) {

    private val fullDateRegex = Regex("""(?<!\d)(20\d{2})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})(?!\d)""")
    private val shortYearDateRegex = Regex("""(?<!\d)(\d{2})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})(?!\d)""")
    private val monthDayDateRegex = Regex("""(?<!\d)(\d{1,2})\s*[-./]\s*(\d{1,2})(?!\d)""")

    fun preview(userId: Long, ledgerId: Long, request: TransactionImportPreviewRequest): TransactionImportPreviewResponse {
        ledgerRepository.findById(ledgerId).orElseThrow {
            NotFoundException("장부를 찾을 수 없습니다.")
        }
        ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")

        if (request.text.isBlank()) {
            throw WoorilogException("INVALID_REQUEST", "가져올 텍스트는 필수입니다.", HttpStatus.BAD_REQUEST)
        }

        val categories = ledgerCategoryRepository.findByLedgerIdOrderBySortOrderAsc(ledgerId)
        val fallbackDate = request.transactionDate ?: LocalDate.now(clock)
        val lines = request.text
            .lines()
            .map { it.trim() }
            .filter { it.isNotBlank() }

        var currentDate = fallbackDate
        val candidates = buildList {
            lines.forEachIndexed { index, line ->
                parseDate(line)?.let { currentDate = it }
                val amount = parseAmount(line) ?: return@forEachIndexed
                val type = inferType(line)
                val category = categories.firstOrNull {
                    it.type == type && line.contains(it.name, ignoreCase = true)
                } ?: categories.firstOrNull { it.type == type }

                add(TransactionImportCandidateResponse(
                    id = "candidate-${index + 1}",
                    type = type,
                    amount = amount,
                    transactionDate = currentDate,
                    categoryId = category?.id,
                    categoryName = category?.name,
                    memo = extractMemo(line),
                    rawText = line,
                    confidence = if (category != null) 0.82 else 0.68
                ))
            }
        }

        return TransactionImportPreviewResponse(
            candidates = candidates,
            rejectedLines = lines.size - candidates.size
        )
    }

    private fun parseAmount(text: String): Long? {
        val wonRegex = Regex("""(\d[\d,]*)\s*(?:원|₩)""")
        val wonMatch = wonRegex.find(text)
        if (wonMatch != null) {
            return wonMatch.groupValues[1].replace(",", "").toLongOrNull()
        }

        val cleanedText = text.replace(Regex("""(?<=\d),(?=\d)"""), "")
        return Regex("""\d+""")
            .findAll(cleanedText)
            .mapNotNull { it.value.toLongOrNull() }
            .filterNot { it in 1..31 || it in 2020..2035 }
            .lastOrNull()
    }

    private fun parseDate(text: String): LocalDate? {
        fullDateRegex.find(text)?.let { match ->
            return toDate(match.groupValues[1], match.groupValues[2], match.groupValues[3])
        }
        shortYearDateRegex.find(text)?.let { match ->
            return toDate((2000 + match.groupValues[1].toInt()).toString(), match.groupValues[2], match.groupValues[3])
        }
        monthDayDateRegex.find(text)?.let { match ->
            return toDate(LocalDate.now(clock).year.toString(), match.groupValues[1], match.groupValues[2])
        }
        return null
    }

    private fun toDate(year: String, month: String, day: String): LocalDate? = runCatching {
        LocalDate.of(year.toInt(), month.toInt(), day.toInt())
    }.getOrNull()

    private fun extractMemo(text: String): String = text
        .replace(fullDateRegex, "")
        .replace(shortYearDateRegex, "")
        .replace(monthDayDateRegex, "")
        .replace(Regex("""\d[\d,]*\s*(?:원|₩)?"""), "")
        .replace(Regex("""\s+"""), " ")
        .trim(' ', '·', 'ㆍ', '-')

    private fun inferType(text: String): CategoryType {
        val incomeHints = listOf("급여", "입금", "수입", "환급", "이자", "bonus", "salary")
        return if (incomeHints.any { text.contains(it, ignoreCase = true) }) {
            CategoryType.INCOME
        } else {
            CategoryType.EXPENSE
        }
    }
}

data class TransactionImportPreviewRequest(
    val text: String,
    val transactionDate: LocalDate?,
    val ocrEngine: String?,
    val sourceName: String?
)

data class TransactionImportPreviewResponse(
    val candidates: List<TransactionImportCandidateResponse>,
    val rejectedLines: Int
)

data class TransactionImportCandidateResponse(
    val id: String,
    val type: CategoryType,
    val amount: Long,
    val transactionDate: LocalDate,
    val categoryId: Long?,
    val categoryName: String?,
    val memo: String,
    val rawText: String,
    val confidence: Double
)
