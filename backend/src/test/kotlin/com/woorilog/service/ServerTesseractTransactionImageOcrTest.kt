package com.woorilog.service

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import java.awt.Color
import java.awt.image.BufferedImage
import java.io.ByteArrayOutputStream
import java.nio.file.Path
import java.time.LocalDate
import javax.imageio.ImageIO

class ServerTesseractTransactionImageOcrTest {

    @Test
    fun should_SelectVariantWithMoreTransactionCandidates_When_RecognizingImage() {
        val visitedDirectories = mutableListOf<Path>()
        val runner = TesseractOcrRunner { path ->
            visitedDirectories.add(path.parent)
            when (path.fileName.toString()) {
                "original.png" -> "바오 25,000원"
                "enhanced.png" -> "바오 25,000원\n쿠우쿠우화정점 95,700원"
                else -> ""
            }
        }
        val imageOcr = ServerTesseractTransactionImageOcr(runner)

        val result = imageOcr.recognize(
            TransactionImageInput(sampleImageBytes(), "image/png"),
            LocalDate.of(2026, 7, 21),
        )

        assertEquals("바오 25,000원\n쿠우쿠우화정점 95,700원", result.text)
        assertEquals("tesseract-5-server", result.engine)
        assertFalse(visitedDirectories.first().toFile().exists())
    }

    @Test
    fun should_MergeBetterMerchantNamesAcrossOriginalAndEnhancedVariants() {
        val runner = TesseractOcrRunner { path ->
            when (path.fileName.toString()) {
                "original.png" -> """
                    (주)신세계프라퍼티 코엑스 194,000원
                    26.07.18 14:16 일시불
                    지에스 더프레시 신촌숲아이 39,280원
                    파크점 -』
                    26.07.17 19:31 일시불
                """.trimIndent()
                "enhanced.png" -> """
                    (주)신세계프라퍼티 코엑스 194,000원
                    몰 “a
                    26.07.18 14:16 일시불
                    지에스 더프레시 신촌숲아이 39,280원
                    26.07.17 19:31 일시불
                """.trimIndent()
                else -> ""
            }
        }
        val imageOcr = ServerTesseractTransactionImageOcr(runner)

        val result = imageOcr.recognize(
            TransactionImageInput(sampleImageBytes(), "image/png"),
            LocalDate.of(2026, 7, 21),
        )

        assertEquals(
            """
                2026-07-18 (주)신세계프라퍼티 코엑스몰 194000원
                2026-07-17 지에스 더프레시 신촌숲아이파크점 39280원
            """.trimIndent(),
            result.text,
        )
    }

    @Test
    fun should_MergeSparseLayoutCandidate_When_DefaultVariantsHaveFewerCandidates() {
        val runner = object : TesseractOcrRunner {
            override fun recognize(imagePath: Path): String = """
                삼성카드 -34,508원
                18:28 #자동이체 0원
                아이파크몰(주) -8,500원
                17:28 #체크카드 34,508원
                07.18
                (주)신세계프라퍼티 코엑스몰 -8,900원
                13:28 #체크카드 161,788원
            """.trimIndent()

            override fun recognizeSparseLayout(imagePath: Path): String = """
                삼성카드
                -34,508%
                18:28 #자동이체
                0원
                아이파크몰(주)
                -8,500%
                17:28 #체크카드
                34,508%
                07.18
                (주)신세계프라퍼티
                -8,900
                13:28 #체크카드
                161,788원
                으
                아성다이소
                맨 위로
                -8,200
                12:54 #체크카드
                170,688원
            """.trimIndent()
        }
        val imageOcr = ServerTesseractTransactionImageOcr(runner)

        val result = imageOcr.recognize(
            TransactionImageInput(sampleImageBytes(), "image/png"),
            LocalDate.of(2026, 7, 21),
        )

        assertEquals(
            """
                2026-07-21 삼성카드 34508원
                2026-07-21 아이파크몰(주) 8500원
                2026-07-18 (주)신세계프라퍼티 코엑스몰 8900원
                2026-07-18 아성다이소 8200원
            """.trimIndent(),
            result.text,
        )
    }

    @Test
    fun should_PreserveConsecutiveTransactions_When_MerchantAndAmountAreTheSame() {
        val runner = TesseractOcrRunner {
            """
                카페 5,000원
                일시불
                카페 5,000원
                일시불
            """.trimIndent()
        }
        val imageOcr = ServerTesseractTransactionImageOcr(runner)

        val result = imageOcr.recognize(
            TransactionImageInput(sampleImageBytes(), "image/png"),
            LocalDate.of(2026, 7, 21),
        )

        val parsed = TransactionImportTextParser.parse(result.text, LocalDate.of(2026, 7, 21))
        assertEquals(2, parsed.candidates.size)
        assertEquals(listOf(5_000L, 5_000L), parsed.candidates.map { it.amount })
    }

    @Test
    fun should_RejectInput_When_ContentTypeIsUnsupported() {
        val imageOcr = ServerTesseractTransactionImageOcr { "" }

        assertThrows(InvalidTransactionImageException::class.java) {
            imageOcr.recognize(
                TransactionImageInput(sampleImageBytes(), "image/gif"),
                LocalDate.of(2026, 7, 21),
            )
        }
    }

    private fun sampleImageBytes(): ByteArray {
        val image = BufferedImage(200, 200, BufferedImage.TYPE_INT_RGB)
        val graphics = image.createGraphics()
        graphics.color = Color.WHITE
        graphics.fillRect(0, 0, 200, 200)
        graphics.color = Color.BLACK
        graphics.fillRect(50, 50, 100, 30)
        graphics.dispose()
        return ByteArrayOutputStream().use { output ->
            ImageIO.write(image, "png", output)
            output.toByteArray()
        }
    }
}
