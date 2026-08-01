package com.woorilog.infrastructure.persistence.invitation

import com.woorilog.domain.invitation.entity.Invitation
import com.woorilog.domain.invitation.entity.InvitationStatus
import com.woorilog.domain.invitation.entity.InvitationType
import com.woorilog.domain.invitation.repository.InvitationRepository
import org.springframework.stereotype.Repository

@Repository
class InvitationRepositoryImpl(
    private val jpaRepository: InvitationJpaRepository,
) : InvitationRepository {
    override fun findByIdOrNull(id: Long): Invitation? = jpaRepository.findById(id).orElse(null)
    override fun findByLedgerIdOrderByIdDesc(ledgerId: Long) = jpaRepository.findByLedgerIdOrderByIdDesc(ledgerId)
    override fun findByInviteeIdAndTypeAndStatus(inviteeId: Long, type: InvitationType, status: InvitationStatus) =
        jpaRepository.findByInviteeIdAndTypeAndStatus(inviteeId, type, status)
    override fun findByLedgerIdAndInviteeIdAndTypeAndStatus(ledgerId: Long, inviteeId: Long, type: InvitationType, status: InvitationStatus) =
        jpaRepository.findByLedgerIdAndInviteeIdAndTypeAndStatus(ledgerId, inviteeId, type, status)
    override fun findByToken(token: String) = jpaRepository.findByToken(token)
    override fun findByTokenHash(tokenHash: String) = jpaRepository.findByTokenHash(tokenHash)
    override fun findLockedByTokenHash(tokenHash: String) = jpaRepository.findLockedByTokenHash(tokenHash)
    override fun findByLedgerIdAndTypeAndStatus(ledgerId: Long, type: InvitationType, status: InvitationStatus) =
        jpaRepository.findByLedgerIdAndTypeAndStatus(ledgerId, type, status)
    override fun save(invitation: Invitation): Invitation = jpaRepository.save(invitation)
    override fun saveAndFlush(invitation: Invitation): Invitation = jpaRepository.saveAndFlush(invitation)
}
