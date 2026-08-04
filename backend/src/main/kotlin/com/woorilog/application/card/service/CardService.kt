package com.woorilog.application.card.service

import com.woorilog.application.card.command.SaveCardCommand
import com.woorilog.application.card.result.CardResult
import com.woorilog.application.card.result.toResult
import com.woorilog.domain.card.entity.Card
import com.woorilog.domain.card.repository.CardRepository
import com.woorilog.domain.ledger.entity.Ledger
import com.woorilog.domain.ledger.repository.LedgerMemberRepository
import com.woorilog.domain.ledger.repository.LedgerRepository
import com.woorilog.domain.transaction.repository.TransactionRepository
import com.woorilog.common.exception.BadRequestException
import com.woorilog.common.exception.ForbiddenException
import com.woorilog.common.exception.NotFoundException
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
    fun getCards(userId: Long, ledgerId: Long): List<CardResult> {
        requireLedgerMember(userId, ledgerId)
        return cardRepository.findByLedgerIdOrderByNameAsc(ledgerId).map { it.toResult() }
    }

    fun createCard(userId: Long, ledgerId: Long, command: SaveCardCommand): CardResult {
        val ledger = requireLedgerMember(userId, ledgerId)
        val name = validate(command, ledgerId)
        return cardRepository.save(Card(ledger, name, command.statementClosingDay)).toResult()
    }

    fun updateCard(userId: Long, cardId: Long, command: SaveCardCommand): CardResult {
        val card = cardRepository.findByIdOrNull(cardId) ?: throw NotFoundException("카드를 찾을 수 없습니다.")
        val ledgerId = card.ledger.id!!
        requireLedgerMember(userId, ledgerId)
        val name = validate(command, ledgerId, cardId)
        card.name = name
        card.statementClosingDay = command.statementClosingDay
        return card.toResult()
    }

    fun deleteCard(userId: Long, cardId: Long) {
        val card = cardRepository.findByIdOrNull(cardId) ?: throw NotFoundException("카드를 찾을 수 없습니다.")
        requireLedgerMember(userId, card.ledger.id!!)
        if (transactionRepository.existsByCardId(cardId)) {
            throw BadRequestException("거래에 사용된 카드는 삭제할 수 없습니다.")
        }
        cardRepository.delete(card)
    }

    private fun requireLedgerMember(userId: Long, ledgerId: Long): Ledger {
        val ledger = ledgerRepository.findByIdOrNull(ledgerId) ?: throw NotFoundException("가계부를 찾을 수 없습니다.")
        ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 가계부에 접근 권한이 없습니다.")
        return ledger
    }

    private fun validate(command: SaveCardCommand, ledgerId: Long, currentCardId: Long? = null): String {
        val name = command.name.trim()
        if (name.isBlank() || name.length > 100) {
            throw BadRequestException("카드 이름은 1자 이상 100자 이하여야 합니다.")
        }
        if (command.statementClosingDay !in 1..31) {
            throw BadRequestException("카드 결제금액 확정일은 1일에서 31일 사이여야 합니다.")
        }
        val duplicated = cardRepository.findByLedgerIdOrderByNameAsc(ledgerId)
            .any { it.id != currentCardId && it.name == name }
        if (duplicated) throw BadRequestException("같은 이름의 카드가 이미 등록되어 있습니다.")
        return name
    }
}
