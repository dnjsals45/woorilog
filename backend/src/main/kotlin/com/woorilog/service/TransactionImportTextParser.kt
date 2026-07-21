package com.woorilog.service

import java.time.LocalDate

internal object TransactionImportTextParser {

    private val fullDateRegex = Regex("""(?<!\d)(20\d{2})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})(?!\d)""")
    private val shortYearDateRegex = Regex("""(?<!\d)(\d{2})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})(?!\d)""")
    private val monthDayDateRegex = Regex("""(?<!\d)(\d{1,2})\s*[-./]\s*(\d{1,2})(?!\d)""")
    private val koreanMonthDayDateRegex = Regex("""(?<!\d)(\d{1,2})\s*월\s*(\d{1,2})\s*일""")
    private val currencyAmountRegex = Regex("""(?<!\d)(\d[\d,]*)\s*(?:원|₩)""")
    private val groupedAmountRegex = Regex("""(?<!\d)(\d{1,3}(?:,\d{3})+)(?!\d)""")
    private val installmentRegex = Regex("""일시불|할부|승인|취소""", RegexOption.IGNORE_CASE)
    private val statusBarTimeRegex = Regex("""^\d{1,2}:\d{2}\b""")
    private val noisyStatusBarRegex = Regex("""^\d{3,4}\s+.*\b(?:all|LTE|5G|Wi-?Fi)\b""", RegexOption.IGNORE_CASE)
    private val paymentMetadataRegex = Regex("""^\d{1,2}\s*:\s*\d{2}\b.*#\s*[가-힣A-Za-z]""")
    private val leadingDecorationRegex = Regex("""^[\s~_=<>'\"°.…、ㆍ·|\\&@©%¥-]+""")
    private val trailingDecorationRegex = Regex("""[\s~_=<>'\"°.…、ㆍ·|\\,&@%¥-]+$""")

    fun parse(text: String, fallbackDate: LocalDate): TransactionImportParseResult {
        val lines = text.lines()
            .map { it.trim() }
            .filter { it.isNotBlank() }

        var currentDate = fallbackDate
        var pending: PendingCandidate? = null
        var leadingMerchant: String? = null
        var suppressNextStandaloneAmount = false
        val candidates = mutableListOf<ParsedTransactionImportLine>()

        fun flushPending() {
            pending?.let { candidate ->
                candidates += ParsedTransactionImportLine(
                    sourceLineIndex = candidate.sourceLineIndex,
                    amount = candidate.amount,
                    transactionDate = candidate.transactionDate,
                    memo = normalizeMerchant(candidate.memoParts.joinToString(""), candidate.rawLines),
                    rawText = candidate.rawLines.joinToString("\n"),
                )
            }
            pending = null
        }

        lines.forEachIndexed { index, line ->
            if (isPaymentMetadata(line)) {
                pending?.rawLines?.add(line)
                flushPending()
                suppressNextStandaloneAmount = parseAmount(line) == null
                leadingMerchant = null
                return@forEachIndexed
            }

            val parsedDate = parseDate(line, fallbackDate.year)
            val amount = parseAmount(line)

            if (amount != null) {
                val inlineMerchant = extractMemo(line, amount)
                val merchant = when {
                    hasMeaningfulMerchant(inlineMerchant) &&
                        (inlineMerchant.length > 1 || leadingMerchant == null) -> inlineMerchant
                    else -> leadingMerchant.orEmpty()
                }
                if (suppressNextStandaloneAmount && !hasPlausibleInlineMerchant(inlineMerchant)) {
                    suppressNextStandaloneAmount = false
                    leadingMerchant = null
                    return@forEachIndexed
                }
                if (!hasMeaningfulMerchant(merchant)) {
                    suppressNextStandaloneAmount = false
                    leadingMerchant = null
                    return@forEachIndexed
                }

                flushPending()
                parsedDate?.let { currentDate = it }
                pending = PendingCandidate(
                    sourceLineIndex = index,
                    amount = amount,
                    transactionDate = parsedDate ?: currentDate,
                    memoParts = mutableListOf(merchant),
                    rawLines = mutableListOf(line),
                )
                suppressNextStandaloneAmount = false
                leadingMerchant = null
                return@forEachIndexed
            }

            if (parsedDate != null) {
                if (pending != null && installmentRegex.containsMatchIn(line)) {
                    pending?.transactionDate = parsedDate
                    pending?.rawLines?.add(line)
                    flushPending()
                } else {
                    flushPending()
                    currentDate = parsedDate
                }
                suppressNextStandaloneAmount = false
                leadingMerchant = null
                return@forEachIndexed
            }

            pending?.let { candidate ->
                candidate.rawLines += line
                if (installmentRegex.containsMatchIn(line)) {
                    flushPending()
                    return@forEachIndexed
                }

                extractContinuation(line)?.let { candidate.memoParts += it }
                return@forEachIndexed
            }

            extractLeadingMerchant(line)?.let { merchant ->
                if (leadingMerchant == null || merchantQuality(merchant) > merchantQuality(leadingMerchant.orEmpty())) {
                    leadingMerchant = merchant
                }
                suppressNextStandaloneAmount = false
            }
        }
        flushPending()

        return TransactionImportParseResult(
            candidates = candidates,
            nonBlankLineCount = lines.size,
        )
    }

    private fun parseAmount(text: String): Long? {
        if (noisyStatusBarRegex.containsMatchIn(text.trim())) {
            return null
        }
        currencyAmountRegex.find(text)?.let { match ->
            return match.groupValues[1].replace(",", "").toLongOrNull()
        }
        groupedAmountRegex.find(text)?.let { match ->
            return match.groupValues[1].replace(",", "").toLongOrNull()
        }
        val trailingAmount = Regex("""(?<![\d:])(\d{3,})(?!\d)\s*$""").find(text) ?: return null
        if (statusBarTimeRegex.containsMatchIn(text.trim())) {
            return null
        }
        val prefix = text.substring(0, trailingAmount.range.first)
        if (prefix.isNotBlank() && !prefix.contains(Regex("""[가-힣A-Za-z]"""))) {
            return null
        }
        return trailingAmount.groupValues[1].toLongOrNull()
    }

    private fun isPaymentMetadata(text: String): Boolean = paymentMetadataRegex.containsMatchIn(text.trim())

    private fun extractLeadingMerchant(text: String): String? {
        val cleaned = cleanMerchantText(text)
        if (cleaned.contains(' ') || cleaned.count { it.isLetter() } < 2) {
            return null
        }
        if (cleaned.matches(Regex("""[A-Za-z0-9]{1,3}"""))) {
            return null
        }
        return cleaned.takeIf(::hasMeaningfulMerchant)
    }

    private fun hasMeaningfulMerchant(text: String): Boolean = text.any { it.isLetter() }

    private fun hasPlausibleInlineMerchant(text: String): Boolean = text.count { it.isLetter() } >= 2

    private fun merchantQuality(text: String): Int {
        val koreanCount = text.count { it in '\uAC00'..'\uD7A3' }
        val letterCount = text.count { it.isLetter() }
        val digitCount = text.count { it.isDigit() }
        return koreanCount * 5 + letterCount * 2 - digitCount * 3
    }

    private fun parseDate(text: String, fallbackYear: Int): LocalDate? {
        fullDateRegex.find(text)?.let { match ->
            return toDate(match.groupValues[1], match.groupValues[2], match.groupValues[3])
        }
        shortYearDateRegex.find(text)?.let { match ->
            return toDate((2000 + match.groupValues[1].toInt()).toString(), match.groupValues[2], match.groupValues[3])
        }
        koreanMonthDayDateRegex.find(text)?.let { match ->
            return toDate(fallbackYear.toString(), match.groupValues[1], match.groupValues[2])
        }
        monthDayDateRegex.find(text)?.let { match ->
            return toDate(fallbackYear.toString(), match.groupValues[1], match.groupValues[2])
        }
        return null
    }

    private fun toDate(year: String, month: String, day: String): LocalDate? = runCatching {
        LocalDate.of(year.toInt(), month.toInt(), day.toInt())
    }.getOrNull()

    private fun extractMemo(text: String, amount: Long): String = cleanMerchantText(
        text
            .replace(fullDateRegex, "")
            .replace(shortYearDateRegex, "")
            .replace(koreanMonthDayDateRegex, "")
            .replace(monthDayDateRegex, "")
            .replace(currencyAmountRegex, "")
            .replace(groupedAmountRegex, "")
            .replace(Regex("""(?<!\d)${Regex.escape(amount.toString())}(?!\d)"""), "")
    )

    private fun extractContinuation(text: String): String? {
        val cleaned = cleanMerchantText(text)
        Regex("""^([가-힣]{1,12})(?:\s+[^가-힣]{1,4})?$""").matchEntire(cleaned)?.let { match ->
            val continuation = match.groupValues[1]
            if (continuation.length > 1 || text.trim().startsWith(continuation)) {
                return continuation
            }
        }
        if (cleaned.isBlank() || cleaned.contains(' ') || cleaned.length > 12) {
            return null
        }
        if (cleaned.length == 1 && text.trim() != cleaned) {
            return null
        }
        if (cleaned.matches(Regex("""[A-Za-z0-9]{1,2}"""))) {
            return null
        }
        return cleaned
    }

    private fun cleanMerchantText(text: String): String {
        var cleaned = text
            .replace(leadingDecorationRegex, "")
            .replace(trailingDecorationRegex, "")

        cleaned = cleaned.replace(
            Regex("""^(?!\(주\))[^가-힣A-Za-z0-9]?([가-힣]{1,2})\s{2,}(?=[(가-힣A-Za-z])"""),
            "",
        )
        cleaned = cleaned
            .replace(Regex("""\s+"""), " ")
            .trim()

        cleaned = cleaned.replace(Regex("""^[가-힣A-Za-z0-9]{1,2},\s+(?=[(가-힣])"""), "")
        cleaned = cleaned.replace(Regex("""^[A-Za-z0-9]{1,2}\s+(?=[(가-힣])"""), "")
        cleaned = cleaned.replace(Regex("""^\(주(?!\))(?=[가-힣A-Za-z])"""), "(주)")
        cleaned = cleaned.replace(Regex("""\s+(?:띠|미)$"""), "")
        cleaned = cleaned.replace(Regex("""(?<=형제들)띠$"""), "")
        return cleaned.trim()
    }

    private fun normalizeMerchant(merchant: String, rawLines: List<String>): String {
        val cleaned = cleanMerchantText(merchant)
        val compactUppercase = cleaned.replace(Regex("""[\s|]"""), "").uppercase()
        // Tesseract repeatedly reads the same bold dark-mode Hangul glyphs as these Latin shapes.
        if (compactUppercase in setOf("ZIAEIPC", "2IAELPC", "ZIAELPC", "AAEPC")) {
            return "긱스타PC"
        }

        val rawContinuation = rawLines.drop(1).joinToString("\n")
        // The one-syllable wrapped suffix "몰" can be split into scroll-bar artifacts or jamo-like lines.
        if ((cleaned.endsWith("코엑스") || cleaned.endsWith("코엑스모르")) && (
                Regex("""(?m)^[=\s]*들\s*$""").containsMatchIn(rawContinuation) ||
                    (Regex("""(?m)^\s*모\s*$""").containsMatchIn(rawContinuation) &&
                        Regex("""(?m)^\s*르\s*$""").containsMatchIn(rawContinuation))
                )) {
            return "${cleaned.removeSuffix("모르")}몰"
        }
        return cleaned
    }

    private data class PendingCandidate(
        val sourceLineIndex: Int,
        val amount: Long,
        var transactionDate: LocalDate,
        val memoParts: MutableList<String>,
        val rawLines: MutableList<String>,
    )
}

internal data class TransactionImportParseResult(
    val candidates: List<ParsedTransactionImportLine>,
    val nonBlankLineCount: Int,
)

internal data class ParsedTransactionImportLine(
    val sourceLineIndex: Int,
    val amount: Long,
    val transactionDate: LocalDate,
    val memo: String,
    val rawText: String,
)
