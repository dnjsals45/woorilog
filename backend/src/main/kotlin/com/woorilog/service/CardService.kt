package com.woorilog.service

import com.woorilog.domain.Card
import com.woorilog.domain.CardRepository
import com.woorilog.domain.Ledger
import com.woorilog.domain.LedgerMemberRepository
import com.woorilog.domain.LedgerRepository
import com.woorilog.domain.TransactionRepository
import com.woorilog.exception.BadRequestException
import com.woorilog.exception.ForbiddenException
import com.woorilog.exception.NotFoundException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class CardService(
    private val ledgerRepository: LedgerRepository,
    private val ledgerMemberRepository: LedgerMemberRepository,
    private val cardRepository: CardRepository,
    private val transactionRepository: TransactionRepository,
) {
    @Transactional(readOnly = true)
    fun getCards(userId: Long, ledgerId: Long): List<CardResponse> {
        requireLedgerMember(userId, ledgerId)
        return cardRepository.findByLedgerIdOrderByNameAsc(ledgerId).map { it.toResponse() }
    }

    fun createCard(userId: Long, ledgerId: Long, request: SaveCardRequest): CardResponse {
        val ledger = requireLedgerMember(userId, ledgerId)
        val name = validate(request, ledgerId)
        return cardRepository.save(Card(ledger, name, request.statementClosingDay)).toResponse()
    }

    fun updateCard(userId: Long, cardId: Long, request: SaveCardRequest): CardResponse {
        val card = cardRepository.findById(cardId).orElseThrow { NotFoundException("카드를 찾을 수 없습니다.") }
        val ledgerId = card.ledger.id!!
        requireLedgerMember(userId, ledgerId)
        val name = validate(request, ledgerId, cardId)
        card.name = name
        card.statementClosingDay = request.statementClosingDay
        return card.toResponse()
    }

    fun deleteCard(userId: Long, cardId: Long) {
        val card = cardRepository.findById(cardId).orElseThrow { NotFoundException("카드를 찾을 수 없습니다.") }
        requireLedgerMember(userId, card.ledger.id!!)
        if (transactionRepository.existsByCardId(cardId)) {
            throw BadRequestException("거래에 사용된 카드는 삭제할 수 없습니다.")
        }
        cardRepository.delete(card)
    }

    private fun requireLedgerMember(userId: Long, ledgerId: Long): Ledger {
        val ledger = ledgerRepository.findById(ledgerId).orElseThrow { NotFoundException("장부를 찾을 수 없습니다.") }
        ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")
        return ledger
    }

    private fun validate(request: SaveCardRequest, ledgerId: Long, currentCardId: Long? = null): String {
        val name = request.name.trim()
        if (name.isBlank() || name.length > 100) {
            throw BadRequestException("카드 이름은 1자 이상 100자 이하여야 합니다.")
        }
        if (request.statementClosingDay !in 1..31) {
            throw BadRequestException("카드 결제금액 확정일은 1일에서 31일 사이여야 합니다.")
        }
        val duplicated = cardRepository.findByLedgerIdOrderByNameAsc(ledgerId)
            .any { it.id != currentCardId && it.name == name }
        if (duplicated) throw BadRequestException("같은 이름의 카드가 이미 등록되어 있습니다.")
        return name
    }
}

data class SaveCardRequest(
    val name: String,
    val statementClosingDay: Int,
)

data class CardResponse(
    val id: Long,
    val ledgerId: Long,
    val name: String,
    val statementClosingDay: Int,
)

fun Card.toResponse() = CardResponse(
    id = id!!,
    ledgerId = ledger.id!!,
    name = name,
    statementClosingDay = statementClosingDay,
)
