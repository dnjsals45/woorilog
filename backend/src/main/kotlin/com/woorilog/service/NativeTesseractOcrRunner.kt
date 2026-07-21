package com.woorilog.service

import org.springframework.stereotype.Component
import java.io.IOException
import java.nio.file.Files
import java.nio.file.Path
import java.util.concurrent.TimeUnit

internal fun interface TesseractOcrRunner {
    fun recognize(imagePath: Path): String

    fun recognizeSparseLayout(imagePath: Path): String = recognize(imagePath)
}

@Component
internal class NativeTesseractOcrRunner : TesseractOcrRunner {

    override fun recognize(imagePath: Path): String {
        return recognize(imagePath, DEFAULT_PAGE_SEGMENTATION_MODE)
    }

    override fun recognizeSparseLayout(imagePath: Path): String {
        return recognize(imagePath, SPARSE_PAGE_SEGMENTATION_MODE)
    }

    private fun recognize(imagePath: Path, pageSegmentationMode: Int): String {
        val stdout = Files.createTempFile(imagePath.parent, "tesseract-stdout-", ".txt")
        val stderr = Files.createTempFile(imagePath.parent, "tesseract-stderr-", ".txt")
        try {
            val process = try {
                ProcessBuilder(
                    "tesseract",
                    imagePath.toString(),
                    "stdout",
                    "-l",
                    "kor+eng",
                    "--psm",
                    pageSegmentationMode.toString(),
                    "-c",
                    "preserve_interword_spaces=1",
                )
                    .redirectOutput(stdout.toFile())
                    .redirectError(stderr.toFile())
                    .start()
            } catch (exception: IOException) {
                throw OcrEngineUnavailableException(exception)
            }

            if (!process.waitFor(TESSERACT_TIMEOUT_SECONDS, TimeUnit.SECONDS)) {
                process.destroyForcibly()
                throw OcrProcessingException()
            }
            if (process.exitValue() != 0) {
                throw OcrProcessingException()
            }
            return Files.readString(stdout).trim()
        } finally {
            Files.deleteIfExists(stdout)
            Files.deleteIfExists(stderr)
        }
    }

    private companion object {
        const val TESSERACT_TIMEOUT_SECONDS = 20L
        const val DEFAULT_PAGE_SEGMENTATION_MODE = 6
        const val SPARSE_PAGE_SEGMENTATION_MODE = 11
    }
}
