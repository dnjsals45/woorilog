package com.woorilog.infrastructure.persistence.card

import com.woorilog.domain.card.entity.Card
import com.woorilog.domain.card.repository.CardRepository
import org.springframework.stereotype.Repository

@Repository
class CardRepositoryImpl(
    private val jpaRepository: CardJpaRepository,
) : CardRepository {
    override fun findByIdOrNull(id: Long): Card? = jpaRepository.findById(id).orElse(null)
    override fun findByLedgerIdOrderByNameAsc(ledgerId: Long) = jpaRepository.findByLedgerIdOrderByNameAsc(ledgerId)
    override fun save(card: Card): Card = jpaRepository.save(card)
    override fun delete(card: Card) = jpaRepository.delete(card)
}
