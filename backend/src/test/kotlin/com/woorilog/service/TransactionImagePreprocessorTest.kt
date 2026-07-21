package com.woorilog.service

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.awt.Color
import java.awt.image.BufferedImage
import java.io.ByteArrayOutputStream
import javax.imageio.ImageIO

class TransactionImagePreprocessorTest {

    @Test
    fun should_InvertDarkBackground_When_PreparingEnhancedVariant() {
        val image = BufferedImage(200, 200, BufferedImage.TYPE_INT_RGB)
        val graphics = image.createGraphics()
        graphics.color = Color(45, 45, 45)
        graphics.fillRect(0, 0, 200, 200)
        graphics.color = Color.WHITE
        graphics.fillRect(70, 70, 60, 60)
        graphics.dispose()

        val variants = TransactionImagePreprocessor.prepare(image.toPngBytes())

        assertEquals(listOf("original", "enhanced", "binary"), variants.map { it.name })
        val enhanced = variants.first { it.name == "enhanced" }.image
        assertTrue(gray(enhanced.getRGB(10, 10)) > gray(enhanced.getRGB(100, 100)))
    }

    @Test
    fun should_RejectInput_When_BytesAreNotAnImage() {
        assertThrows(InvalidTransactionImageException::class.java) {
            TransactionImagePreprocessor.prepare("not-an-image".toByteArray())
        }
    }

    private fun BufferedImage.toPngBytes(): ByteArray = ByteArrayOutputStream().use { output ->
        ImageIO.write(this, "png", output)
        output.toByteArray()
    }

    private fun gray(rgb: Int): Int = rgb and 0xff
}
