package com.woorilog.service

import org.springframework.stereotype.Service
import java.nio.file.Files
import java.nio.file.Path
import java.time.LocalDate
import javax.imageio.ImageIO

@Service
internal class ServerTesseractTransactionImageOcr(
    private val tesseractOcrRunner: TesseractOcrRunner,
) : TransactionImageOcr {

    override fun recognize(input: TransactionImageInput, fallbackDate: LocalDate): TransactionImageOcrResult {
        validateInput(input)
        val variants = TransactionImagePreprocessor.prepare(input.bytes)
        val tempDirectory = Files.createTempDirectory("woorilog-ocr-")
        return try {
            val attempts = variants.take(PRIMARY_VARIANT_COUNT).mapNotNull { variant ->
                recognizeVariant(variant, tempDirectory, fallbackDate)
            }.toMutableList()
            if (shouldTryBinary(attempts)) {
                variants.drop(PRIMARY_VARIANT_COUNT).firstOrNull()?.let { binary ->
                    recognizeVariant(binary, tempDirectory, fallbackDate)?.let(attempts::add)
                }
            }
            if (attempts.any { containsPaymentMetadata(it.text) }) {
                recognizeSparseLayout(variants.first(), tempDirectory, fallbackDate)?.let(attempts::add)
            }
            val selected = attempts.maxByOrNull { it.score }
                ?: throw OcrProcessingException()
            val mergedCandidates = mergeCandidates(selected, attempts)
            val resultText = if (mergedCandidates == selected.parseResult.candidates) {
                selected.text
            } else {
                mergedCandidates.joinToString("\n") { candidate ->
                    "${candidate.transactionDate} ${candidate.memo} ${candidate.amount}원"
                }
            }
            TransactionImageOcrResult(
                text = resultText,
                engine = "tesseract-5-server",
            )
        } finally {
            deleteRecursively(tempDirectory)
        }
    }

    private fun recognizeVariant(
        variant: OcrImageVariant,
        tempDirectory: Path,
        fallbackDate: LocalDate,
    ): OcrAttempt? {
        val imagePath = tempDirectory.resolve("${variant.name}.png")
        if (!ImageIO.write(variant.image, "png", imagePath.toFile())) {
            throw OcrProcessingException()
        }
        val text = tesseractOcrRunner.recognize(imagePath)
        if (text.isBlank()) return null
        val parseResult = TransactionImportTextParser.parse(text, fallbackDate)
        return OcrAttempt(
            text = text,
            parseResult = parseResult,
            score = score(parseResult),
        )
    }

    private fun recognizeSparseLayout(
        variant: OcrImageVariant,
        tempDirectory: Path,
        fallbackDate: LocalDate,
    ): OcrAttempt? {
        val imagePath = tempDirectory.resolve("${variant.name}-sparse.png")
        if (!ImageIO.write(variant.image, "png", imagePath.toFile())) {
            throw OcrProcessingException()
        }
        val text = tesseractOcrRunner.recognizeSparseLayout(imagePath)
        if (text.isBlank()) return null
        val parseResult = TransactionImportTextParser.parse(text, fallbackDate)
        return OcrAttempt(
            text = text,
            parseResult = parseResult,
            score = score(parseResult),
        )
    }

    private fun containsPaymentMetadata(text: String): Boolean = text.lineSequence()
        .any { line -> Regex("""^\s*\d{1,2}\s*:\s*\d{2}\b.*#\s*[가-힣A-Za-z]""").containsMatchIn(line) }

    private fun shouldTryBinary(attempts: List<OcrAttempt>): Boolean {
        if (attempts.isEmpty()) return true
        val candidateCounts = attempts.map { it.parseResult.candidates.size }.toSet()
        return candidateCounts.size > 1 || candidateCounts.single() == 0
    }

    private fun mergeCandidates(selected: OcrAttempt, attempts: List<OcrAttempt>): List<ParsedTransactionImportLine> {
        var merged = selected.parseResult.candidates
        attempts.filter { it !== selected }.forEach { attempt ->
            merged = mergeCandidateSequences(merged, attempt.parseResult.candidates)
        }
        return merged
    }

    private fun mergeCandidateSequences(
        base: List<ParsedTransactionImportLine>,
        incoming: List<ParsedTransactionImportLine>,
    ): List<ParsedTransactionImportLine> {
        if (base.isEmpty()) return incoming.filter(::isPlausibleCandidate)
        if (incoming.isEmpty()) return base

        val matches = amountSequenceMatches(base, incoming)
        val merged = mutableListOf<ParsedTransactionImportLine>()
        var baseIndex = 0
        var incomingIndex = 0
        matches.forEach { (matchedBaseIndex, matchedIncomingIndex) ->
            merged += base.subList(baseIndex, matchedBaseIndex)
            merged += incoming.subList(incomingIndex, matchedIncomingIndex).filter(::isPlausibleCandidate)

            val peers = listOf(base[matchedBaseIndex], incoming[matchedIncomingIndex])
            merged += peers.maxBy { merchantScore(it, peers) }
            baseIndex = matchedBaseIndex + 1
            incomingIndex = matchedIncomingIndex + 1
        }
        merged += base.subList(baseIndex, base.size)
        merged += incoming.subList(incomingIndex, incoming.size).filter(::isPlausibleCandidate)
        return merged
    }

    private fun amountSequenceMatches(
        base: List<ParsedTransactionImportLine>,
        incoming: List<ParsedTransactionImportLine>,
    ): List<Pair<Int, Int>> {
        val lengths = Array(base.size + 1) { IntArray(incoming.size + 1) }
        for (baseIndex in base.indices.reversed()) {
            for (incomingIndex in incoming.indices.reversed()) {
                lengths[baseIndex][incomingIndex] = if (base[baseIndex].amount == incoming[incomingIndex].amount) {
                    lengths[baseIndex + 1][incomingIndex + 1] + 1
                } else {
                    maxOf(lengths[baseIndex + 1][incomingIndex], lengths[baseIndex][incomingIndex + 1])
                }
            }
        }

        val matches = mutableListOf<Pair<Int, Int>>()
        var baseIndex = 0
        var incomingIndex = 0
        while (baseIndex < base.size && incomingIndex < incoming.size) {
            when {
                base[baseIndex].amount == incoming[incomingIndex].amount -> {
                    matches += baseIndex to incomingIndex
                    baseIndex++
                    incomingIndex++
                }
                lengths[baseIndex + 1][incomingIndex] >= lengths[baseIndex][incomingIndex + 1] -> baseIndex++
                else -> incomingIndex++
            }
        }
        return matches
    }

    private fun isPlausibleCandidate(candidate: ParsedTransactionImportLine): Boolean =
        candidate.amount > 0 && candidate.memo.count { it.isLetter() } >= 2

    private fun validateInput(input: TransactionImageInput) {
        if (input.bytes.isEmpty()) {
            throw InvalidTransactionImageException("이미지 파일은 필수입니다.")
        }
        if (input.bytes.size > MAX_IMAGE_BYTES) {
            throw InvalidTransactionImageException("이미지 파일은 10MB 이하여야 합니다.")
        }
        if (input.contentType !in SUPPORTED_CONTENT_TYPES) {
            throw InvalidTransactionImageException("PNG 또는 JPEG 이미지 파일을 선택해주세요.")
        }
    }

    private fun score(parseResult: TransactionImportParseResult): Int {
        return parseResult.candidates.size * 1_000 + parseResult.candidates.sumOf { candidate ->
            val koreanCount = candidate.memo.count { it in '\uAC00'..'\uD7A3' }
            val letterCount = candidate.memo.count { it.isLetter() }
            val digitCount = candidate.memo.count { it.isDigit() }
            koreanCount * 5 + letterCount * 2 - digitCount * 3
        }
    }

    private fun merchantScore(
        candidate: ParsedTransactionImportLine,
        peers: List<ParsedTransactionImportLine>,
    ): Int {
        val memo = candidate.memo
        val koreanCount = memo.count { it in '\uAC00'..'\uD7A3' }
        val letterCount = memo.count { it.isLetter() }
        val digitCount = memo.count { it.isDigit() }
        val symbolCount = memo.count { !it.isLetterOrDigit() && !it.isWhitespace() && it !in setOf('(', ')') }
        val unsupportedSingleSyllableSuffix = peers.any { peer ->
            memo.length == peer.memo.length + 1 &&
                memo.startsWith(peer.memo) &&
                !hasWrappedContinuation(candidate, memo.takeLast(1))
        }
        return koreanCount * 5 + letterCount * 2 - digitCount * 8 - symbolCount * 4 -
            if (unsupportedSingleSyllableSuffix) 20 else 0
    }

    private fun hasWrappedContinuation(candidate: ParsedTransactionImportLine, suffix: String): Boolean =
        candidate.rawText.lineSequence()
            .drop(1)
            .map { line -> line.trim().replace(Regex("""^[\p{P}\p{S}\s]+"""), "") }
            .any { line -> line.startsWith(suffix) }

    private fun deleteRecursively(root: Path) {
        if (!Files.exists(root)) return
        Files.walk(root).use { paths ->
            paths.sorted(Comparator.reverseOrder()).forEach(Files::deleteIfExists)
        }
    }

    private data class OcrAttempt(
        val text: String,
        val parseResult: TransactionImportParseResult,
        val score: Int,
    )

    private companion object {
        const val MAX_IMAGE_BYTES = 10 * 1024 * 1024
        const val PRIMARY_VARIANT_COUNT = 2
        val SUPPORTED_CONTENT_TYPES = setOf("image/png", "image/jpeg")
    }
}
