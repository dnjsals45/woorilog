package com.woorilog.controller.card

import com.woorilog.common.security.UserPrincipal
import com.woorilog.application.card.service.CardService
import com.woorilog.controller.card.request.CardApiRequest
import com.woorilog.controller.card.response.CardResponse
import com.woorilog.controller.card.response.toResponse
import jakarta.validation.Valid
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
    ): List<CardResponse> = cardService.getCards(principal.userId, ledgerId).map { it.toResponse() }

    @PostMapping("/api/ledgers/{ledgerId}/cards")
    fun createCard(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable ledgerId: Long,
        @Valid @RequestBody request: CardApiRequest,
    ): CardResponse = cardService.createCard(principal.userId, ledgerId, request.toCommand()).toResponse()

    @PutMapping("/api/cards/{cardId}")
    fun updateCard(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable cardId: Long,
        @Valid @RequestBody request: CardApiRequest,
    ): CardResponse = cardService.updateCard(principal.userId, cardId, request.toCommand()).toResponse()

    @DeleteMapping("/api/cards/{cardId}")
    fun deleteCard(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable cardId: Long,
    ): ResponseEntity<Void> {
        cardService.deleteCard(principal.userId, cardId)
        return ResponseEntity.noContent().build()
    }
}
