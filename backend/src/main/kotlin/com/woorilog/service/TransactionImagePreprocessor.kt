package com.woorilog.service

import java.awt.Color
import java.awt.RenderingHints
import java.awt.image.BufferedImage
import java.io.ByteArrayInputStream
import javax.imageio.ImageIO
import kotlin.math.roundToInt

internal object TransactionImagePreprocessor {

    private const val MAX_DIMENSION = 8_000
    private const val MAX_PIXELS = 24_000_000L
    private const val MIN_DIMENSION = 100

    fun prepare(bytes: ByteArray): List<OcrImageVariant> {
        val decoded = ImageIO.read(ByteArrayInputStream(bytes))
            ?: throw InvalidTransactionImageException("PNG 또는 JPEG 이미지 파일을 선택해주세요.")
        validateDimensions(decoded)

        val original = normalize(decoded)
        val enhanced = enhanceContrast(original)
        val binary = binarize(enhanced)
        return listOf(
            OcrImageVariant("original", original),
            OcrImageVariant("enhanced", enhanced),
            OcrImageVariant("binary", binary),
        )
    }

    private fun validateDimensions(image: BufferedImage) {
        if (image.width < MIN_DIMENSION || image.height < MIN_DIMENSION) {
            throw InvalidTransactionImageException("이미지 가로와 세로는 각각 ${MIN_DIMENSION}px 이상이어야 합니다.")
        }
        if (image.width > MAX_DIMENSION || image.height > MAX_DIMENSION ||
            image.width.toLong() * image.height > MAX_PIXELS
        ) {
            throw InvalidTransactionImageException("이미지 해상도가 너무 큽니다.")
        }
    }

    private fun normalize(source: BufferedImage): BufferedImage {
        val target = BufferedImage(source.width, source.height, BufferedImage.TYPE_INT_RGB)
        val graphics = target.createGraphics()
        graphics.color = Color.WHITE
        graphics.fillRect(0, 0, target.width, target.height)
        graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY)
        graphics.drawImage(source, 0, 0, null)
        graphics.dispose()
        return target
    }

    private fun enhanceContrast(source: BufferedImage): BufferedImage {
        val histogram = grayscaleHistogram(source)
        val pixelCount = source.width.toLong() * source.height
        val lower = percentile(histogram, pixelCount, 0.02)
        val upper = percentile(histogram, pixelCount, 0.98).coerceAtLeast(lower + 1)
        val darkBackground = averageLuminance(histogram, pixelCount) < 128
        val target = BufferedImage(source.width, source.height, BufferedImage.TYPE_BYTE_GRAY)

        for (y in 0 until source.height) {
            for (x in 0 until source.width) {
                val gray = luminance(source.getRGB(x, y))
                val stretched = ((gray - lower) * 255.0 / (upper - lower))
                    .roundToInt()
                    .coerceIn(0, 255)
                val normalized = if (darkBackground) 255 - stretched else stretched
                target.setRGB(x, y, Color(normalized, normalized, normalized).rgb)
            }
        }
        return target
    }

    private fun binarize(source: BufferedImage): BufferedImage {
        val histogram = grayscaleHistogram(source)
        val threshold = otsuThreshold(histogram, source.width.toLong() * source.height)
        val target = BufferedImage(source.width, source.height, BufferedImage.TYPE_BYTE_BINARY)
        for (y in 0 until source.height) {
            for (x in 0 until source.width) {
                val value = if (luminance(source.getRGB(x, y)) <= threshold) 0 else 255
                target.setRGB(x, y, Color(value, value, value).rgb)
            }
        }
        return target
    }

    private fun grayscaleHistogram(image: BufferedImage): IntArray {
        val histogram = IntArray(256)
        for (y in 0 until image.height) {
            for (x in 0 until image.width) {
                histogram[luminance(image.getRGB(x, y))]++
            }
        }
        return histogram
    }

    private fun luminance(rgb: Int): Int {
        val red = rgb shr 16 and 0xff
        val green = rgb shr 8 and 0xff
        val blue = rgb and 0xff
        return (red * 0.299 + green * 0.587 + blue * 0.114).roundToInt()
    }

    private fun percentile(histogram: IntArray, pixelCount: Long, ratio: Double): Int {
        val target = (pixelCount * ratio).roundToInt()
        var cumulative = 0
        histogram.forEachIndexed { value, count ->
            cumulative += count
            if (cumulative >= target) {
                return value
            }
        }
        return 255
    }

    private fun averageLuminance(histogram: IntArray, pixelCount: Long): Int {
        val total = histogram.indices.sumOf { value -> value.toLong() * histogram[value] }
        return (total / pixelCount).toInt()
    }

    private fun otsuThreshold(histogram: IntArray, pixelCount: Long): Int {
        val totalIntensity = histogram.indices.sumOf { value -> value.toLong() * histogram[value] }
        var backgroundWeight = 0L
        var backgroundIntensity = 0L
        var bestVariance = -1.0
        var bestThreshold = 0

        for (threshold in histogram.indices) {
            backgroundWeight += histogram[threshold]
            if (backgroundWeight == 0L) continue
            val foregroundWeight = pixelCount - backgroundWeight
            if (foregroundWeight == 0L) break

            backgroundIntensity += threshold.toLong() * histogram[threshold]
            val backgroundMean = backgroundIntensity.toDouble() / backgroundWeight
            val foregroundMean = (totalIntensity - backgroundIntensity).toDouble() / foregroundWeight
            val variance = backgroundWeight.toDouble() * foregroundWeight *
                (backgroundMean - foregroundMean) * (backgroundMean - foregroundMean)
            if (variance > bestVariance) {
                bestVariance = variance
                bestThreshold = threshold
            }
        }
        return bestThreshold
    }
}

internal data class OcrImageVariant(
    val name: String,
    val image: BufferedImage,
)
