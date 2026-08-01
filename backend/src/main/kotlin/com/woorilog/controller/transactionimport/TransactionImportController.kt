package com.woorilog.controller.transactionimport

import com.woorilog.common.security.UserPrincipal
import com.woorilog.infrastructure.external.TransactionImageInput
import com.woorilog.application.transaction.command.CreateTransactionCommand
import com.woorilog.application.transactionimport.command.SaveImportCandidateCommand
import com.woorilog.application.transactionimport.command.SaveImportSessionCommand
import com.woorilog.application.transactionimport.service.TransactionImportService
import com.woorilog.application.transactionimport.service.V1TransactionImportService
import com.woorilog.controller.transactionimport.request.LegacyTransactionImportSaveApiRequest
import com.woorilog.controller.transactionimport.request.TransactionImportPreviewApiRequest
import com.woorilog.controller.transactionimport.request.TransactionImportSaveApiRequest
import com.woorilog.controller.transactionimport.response.ImportPreviewResponse
import com.woorilog.controller.transactionimport.response.SaveImportSessionResponse
import com.woorilog.controller.transactionimport.response.TransactionImportImagePreviewResponse
import com.woorilog.controller.transactionimport.response.TransactionImportPreviewResponse
import com.woorilog.controller.transactionimport.response.toResponse
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import jakarta.validation.Valid
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile
import java.time.LocalDate
import com.woorilog.controller.transaction.response.toResponse
import com.woorilog.domain.transaction.entity.BudgetSource
import com.woorilog.domain.transaction.entity.PaymentMethod
import com.woorilog.domain.transaction.entity.V1PaymentMethod
import com.woorilog.domain.transaction.policy.BudgetScopeType

@RestController
class TransactionImportController(
    private val transactionImportService: TransactionImportService,
    private val v1TransactionImportService: V1TransactionImportService,
    private val objectMapper: ObjectMapper,
) {

    @PostMapping(
        "/api/ledgers/{ledgerId}/transaction-imports/previews",
        consumes = [MediaType.MULTIPART_FORM_DATA_VALUE],
    )
    fun previewV1Images(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @RequestParam sourceType: String,
        @RequestPart("images") images: List<MultipartFile>,
    ): ImportPreviewResponse = v1TransactionImportService.preview(
        userId = principal.userId,
        ledgerId = ledgerId,
        sourceType = sourceType,
        images = images.map { TransactionImageInput(it.bytes, it.contentType) },
    ).toResponse()

    @PostMapping("/api/ledgers/{ledgerId}/transaction-imports/preview")
    fun preview(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @Valid @RequestBody request: TransactionImportPreviewApiRequest
    ): TransactionImportPreviewResponse {
        return transactionImportService.preview(
            principal.userId,
            ledgerId,
            request.toCommand(),
        ).toResponse()
    }

    @PostMapping(
        "/api/ledgers/{ledgerId}/transaction-imports/ocr-preview",
        consumes = [MediaType.MULTIPART_FORM_DATA_VALUE],
    )
    fun previewImages(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @RequestPart("image") images: List<MultipartFile>,
        @RequestParam(required = false)
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        transactionDate: LocalDate?,
    ): TransactionImportImagePreviewResponse {
        return transactionImportService.previewImages(
            userId = principal.userId,
            ledgerId = ledgerId,
            inputs = images.map { image ->
                TransactionImageInput(
                    bytes = image.bytes,
                    contentType = image.contentType,
                )
            },
            transactionDate = transactionDate,
        ).toResponse()
    }

    @PostMapping("/api/ledgers/{ledgerId}/transaction-imports")
    fun saveCandidates(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @RequestBody request: JsonNode,
    ): org.springframework.http.ResponseEntity<Any> {
        if (!request.has("sessionId")) {
            val legacy = objectMapper.treeToValue(request, LegacyTransactionImportSaveApiRequest::class.java)
            return org.springframework.http.ResponseEntity.ok(transactionImportService.saveCandidates(
                userId = principal.userId,
                ledgerId = ledgerId,
                candidates = legacy.candidates.map { candidate ->
                    CreateTransactionCommand(
                        type = candidate.type,
                        amount = candidate.amount,
                        transactionDate = candidate.transactionDate,
                        categoryId = candidate.categoryId,
                        memo = candidate.memo,
                        payerUserId = null,
                        installmentMonths = null,
                        paymentMethod = null,
                        cardId = null,
                    )
                },
            ).map { it.toResponse() })
        }
        val v1 = objectMapper.treeToValue(request, TransactionImportSaveApiRequest::class.java)
        val response: SaveImportSessionResponse = v1TransactionImportService.save(
            userId = principal.userId,
            ledgerId = ledgerId,
            request = SaveImportSessionCommand(
            sessionId = v1.sessionId,
            candidates = v1.candidates.map { candidate ->
                SaveImportCandidateCommand(
                    candidateId = candidate.candidateId,
                    amount = candidate.amount,
                    occurredOn = candidate.occurredOn,
                    merchant = candidate.merchant,
                    categoryId = candidate.categoryId,
                    budgetSource = candidate.budgetSource?.let { BudgetSource(BudgetScopeType.valueOf(it.type), it.ownerUserId) },
                    selected = candidate.selected,
                    paymentMethod = candidate.paymentMethod?.let { V1PaymentMethod(PaymentMethod.valueOf(it.type), it.displayName) },
                    sharedWithPartner = candidate.sharedWithPartner,
                )
            },
        ),
        ).toResponse()
        return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.CREATED).body(response)
    }
}
