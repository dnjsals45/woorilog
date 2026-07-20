package com.woorilog.controller

import com.woorilog.security.UserPrincipal
import com.woorilog.service.CardResponse
import com.woorilog.service.CardService
import com.woorilog.service.SaveCardRequest
import jakarta.validation.Valid
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

@RestController
class CardController(
    private val cardService: CardService,
) {
    @GetMapping("/api/ledgers/{ledgerId}/cards")
    fun getCards(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
    ): List<CardResponse> = cardService.getCards(principal.userId, ledgerId)

    @PostMapping("/api/ledgers/{ledgerId}/cards")
    fun createCard(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @Valid @RequestBody request: CardApiRequest,
    ): CardResponse = cardService.createCard(principal.userId, ledgerId, request.toServiceRequest())

    @PutMapping("/api/cards/{cardId}")
    fun updateCard(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable cardId: Long,
        @Valid @RequestBody request: CardApiRequest,
    ): CardResponse = cardService.updateCard(principal.userId, cardId, request.toServiceRequest())

    @DeleteMapping("/api/cards/{cardId}")
    fun deleteCard(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable cardId: Long,
    ): ResponseEntity<Void> {
        cardService.deleteCard(principal.userId, cardId)
        return ResponseEntity.noContent().build()
    }
}

data class CardApiRequest(
    @field:NotBlank(message = "카드 이름은 필수입니다.")
    val name: String,
    @field:Min(value = 1, message = "결제금액 확정일은 1일 이상이어야 합니다.")
    @field:Max(value = 31, message = "결제금액 확정일은 31일 이하여야 합니다.")
    val statementClosingDay: Int,
) {
    fun toServiceRequest() = SaveCardRequest(name, statementClosingDay)
}
