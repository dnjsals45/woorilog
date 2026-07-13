package com.woorilog.service

import com.woorilog.domain.*
import com.woorilog.exception.BadRequestException
import com.woorilog.exception.ForbiddenException
import com.woorilog.exception.NotFoundException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Duration
import java.time.Instant
import java.time.Clock
import java.util.UUID

@Service
@Transactional
class InvitationService(
    private val userRepository: UserRepository,
    private val ledgerRepository: LedgerRepository,
    private val ledgerMemberRepository: LedgerMemberRepository,
    private val invitationRepository: InvitationRepository,
    private val notificationService: NotificationService,
    private val clock: Clock,
) {

    @Transactional(readOnly = true)
    fun getInvitableUser(currentUserId: Long, ledgerId: Long, email: String): InvitableUserResponse {
        val ledger = ledgerRepository.findById(ledgerId).orElseThrow {
            NotFoundException("장부를 찾을 수 없습니다.")
        }
        val currentMember = ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, currentUserId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")
        if (currentMember.role != LedgerRole.OWNER) {
            throw ForbiddenException("장부 소유자만 초대 권한이 있습니다.")
        }
        if (ledger.type != LedgerType.GROUP) {
            throw BadRequestException("공동 장부만 초대가 가능합니다.")
        }

        val targetUser = userRepository.findByEmail(email)
            ?: throw NotFoundException("존재하지 않는 사용자입니다.")

        if (targetUser.id == currentUserId) {
            return InvitableUserResponse(
                user = UserDto.from(targetUser),
                invitable = false,
                reason = "SELF_INVITATION"
            )
        }

        if (ledgerMemberRepository.existsByLedgerIdAndUserId(ledgerId, targetUser.id!!)) {
            return InvitableUserResponse(
                user = UserDto.from(targetUser),
                invitable = false,
                reason = "ALREADY_MEMBER"
            )
        }

        val pendingInvitations = invitationRepository.findByLedgerIdAndInviteeIdAndTypeAndStatus(
            ledgerId, targetUser.id!!, InvitationType.DIRECT, InvitationStatus.PENDING
        )
        if (pendingInvitations.any { !it.isExpired(clock.instant()) }) {
            return InvitableUserResponse(
                user = UserDto.from(targetUser),
                invitable = false,
                reason = "PENDING_INVITATION"
            )
        }

        return InvitableUserResponse(
            user = UserDto.from(targetUser),
            invitable = true,
            reason = null
        )
    }

    fun inviteUser(currentUserId: Long, ledgerId: Long, targetUserId: Long): InvitationResponseDto {
        val ledger = ledgerRepository.findById(ledgerId).orElseThrow {
            NotFoundException("장부를 찾을 수 없습니다.")
        }
        val currentMember = ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, currentUserId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")
        if (currentMember.role != LedgerRole.OWNER) {
            throw ForbiddenException("장부 소유자만 초대 권한이 있습니다.")
        }
        if (ledger.type != LedgerType.GROUP) {
            throw BadRequestException("공동 장부만 초대가 가능합니다.")
        }

        val targetUser = userRepository.findById(targetUserId).orElseThrow {
            NotFoundException("존재하지 않는 사용자입니다.")
        }

        if (targetUser.id == currentUserId) {
            throw BadRequestException("본인은 초대할 수 없습니다.")
        }

        if (ledgerMemberRepository.existsByLedgerIdAndUserId(ledgerId, targetUserId)) {
            throw BadRequestException("이미 장부의 멤버입니다.")
        }

        val pendingInvitations = invitationRepository.findByLedgerIdAndInviteeIdAndTypeAndStatus(
            ledgerId, targetUserId, InvitationType.DIRECT, InvitationStatus.PENDING
        )
        if (pendingInvitations.any { !it.isExpired(clock.instant()) }) {
            throw BadRequestException("이미 대기 중인 초대가 있습니다.")
        }

        val currentUser = userRepository.findById(currentUserId).orElseThrow {
            ForbiddenException("사용자를 찾을 수 없습니다.")
        }

        val invitation = Invitation(
            ledger = ledger,
            inviter = currentUser,
            invitee = targetUser,
            type = InvitationType.DIRECT,
            status = InvitationStatus.PENDING,
            expiresAt = null
        )
        val saved = invitationRepository.save(invitation)
        notificationService.notifyUser(
            targetUserId,
            NotificationType.INVITATION,
            "새 장부 초대가 도착했습니다.",
            "${ledger.name} 장부에 참여해달라는 초대가 도착했습니다.",
            "/settings",
            "direct-invitation-${saved.id}",
        )
        return InvitationResponseDto.from(saved, clock.instant())
    }

    fun createInvitationLink(currentUserId: Long, ledgerId: Long, expiresInDays: Int?): InvitationResponseDto {
        val ledger = ledgerRepository.findById(ledgerId).orElseThrow {
            NotFoundException("장부를 찾을 수 없습니다.")
        }
        val currentMember = ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, currentUserId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")
        if (currentMember.role != LedgerRole.OWNER) {
            throw ForbiddenException("장부 소유자만 초대 권한이 있습니다.")
        }
        if (ledger.type != LedgerType.GROUP) {
            throw BadRequestException("공동 장부만 초대가 가능합니다.")
        }

        val days = expiresInDays ?: 7
        if (days <= 0) {
            throw BadRequestException("만료 기간은 양수여야 합니다.")
        }
        val finalDays = days.coerceIn(1, 30)

        val currentUser = userRepository.findById(currentUserId).orElseThrow {
            ForbiddenException("사용자를 찾을 수 없습니다.")
        }

        val token = UUID.randomUUID().toString().replace("-", "")
        val expiresAt = clock.instant().plus(Duration.ofDays(finalDays.toLong()))

        val invitation = Invitation(
            ledger = ledger,
            inviter = currentUser,
            invitee = null,
            type = InvitationType.LINK,
            status = InvitationStatus.PENDING,
            token = token,
            expiresAt = expiresAt
        )
        val saved = invitationRepository.save(invitation)
        return InvitationResponseDto.from(saved, clock.instant())
    }

    @Transactional(readOnly = true)
    fun getLedgerInvitations(currentUserId: Long, ledgerId: Long): List<InvitationResponseDto> {
        val ledger = ledgerRepository.findById(ledgerId).orElseThrow {
            NotFoundException("장부를 찾을 수 없습니다.")
        }
        val currentMember = ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, currentUserId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")
        if (currentMember.role != LedgerRole.OWNER) {
            throw ForbiddenException("장부 소유자만 초대 내역을 볼 수 있습니다.")
        }

        val list = invitationRepository.findByLedgerIdOrderByIdDesc(ledgerId)
        val now = clock.instant()
        return list.map { InvitationResponseDto.from(it, now) }
    }

    fun cancelInvitation(currentUserId: Long, ledgerId: Long, invitationId: Long) {
        val ledger = ledgerRepository.findById(ledgerId).orElseThrow {
            NotFoundException("장부를 찾을 수 없습니다.")
        }
        val currentMember = ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, currentUserId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")
        if (currentMember.role != LedgerRole.OWNER) {
            throw ForbiddenException("장부 소유자만 초대를 취소할 수 있습니다.")
        }

        val invitation = invitationRepository.findById(invitationId).orElseThrow {
            NotFoundException("초대를 찾을 수 없습니다.")
        }

        if (invitation.ledger.id != ledgerId) {
            throw BadRequestException("해당 장부의 초대가 아닙니다.")
        }

        if (invitation.status != InvitationStatus.PENDING || invitation.isExpired(clock.instant())) {
            throw BadRequestException("대기 중인 초대만 취소할 수 있습니다.")
        }

        invitation.status = InvitationStatus.CANCELLED
        invitationRepository.save(invitation)
    }

    @Transactional(readOnly = true)
    fun getPendingInvitations(currentUserId: Long): List<InvitationResponseDto> {
        val list = invitationRepository.findByInviteeIdAndTypeAndStatus(
            currentUserId, InvitationType.DIRECT, InvitationStatus.PENDING
        )
        val now = clock.instant()
        return list.filter { !it.isExpired(now) }.map { InvitationResponseDto.from(it, now) }
    }

    fun acceptInvitation(currentUserId: Long, invitationId: Long): InvitationResponseDto {
        val invitation = invitationRepository.findById(invitationId).orElseThrow {
            NotFoundException("초대를 찾을 수 없습니다.")
        }

        if (invitation.status != InvitationStatus.PENDING || invitation.isExpired(clock.instant())) {
            throw BadRequestException("대기 중이며 만료되지 않은 초대만 수락할 수 있습니다.")
        }

        if (invitation.type == InvitationType.DIRECT) {
            if (invitation.invitee?.id != currentUserId) {
                throw ForbiddenException("이 초대를 수락할 권한이 없습니다.")
            }
        } else if (invitation.type == InvitationType.LINK) {
            if (ledgerMemberRepository.existsByLedgerIdAndUserId(invitation.ledger.id!!, currentUserId)) {
                throw BadRequestException("이미 장부의 멤버입니다.")
            }
        }

        val user = userRepository.findById(currentUserId).orElseThrow {
            ForbiddenException("사용자를 찾을 수 없습니다.")
        }

        if (!ledgerMemberRepository.existsByLedgerIdAndUserId(invitation.ledger.id!!, currentUserId)) {
            val member = LedgerMember(
                ledger = invitation.ledger,
                user = user,
                role = LedgerRole.MEMBER
            )
            ledgerMemberRepository.save(member)
        }

        user.lastUsedLedgerId = invitation.ledger.id
        userRepository.save(user)

        invitation.status = InvitationStatus.ACCEPTED
        invitation.respondedAt = clock.instant()
        val saved = invitationRepository.save(invitation)
        return InvitationResponseDto.from(saved, clock.instant())
    }

    fun rejectInvitation(currentUserId: Long, invitationId: Long): InvitationResponseDto {
        val invitation = invitationRepository.findById(invitationId).orElseThrow {
            NotFoundException("초대를 찾을 수 없습니다.")
        }

        if (invitation.type != InvitationType.DIRECT) {
            throw BadRequestException("직접 초대만 거절할 수 있습니다.")
        }

        if (invitation.status != InvitationStatus.PENDING || invitation.isExpired(clock.instant())) {
            throw BadRequestException("대기 중이며 만료되지 않은 초대만 거절할 수 있습니다.")
        }

        if (invitation.invitee?.id != currentUserId) {
            throw ForbiddenException("이 초대를 거절할 권한이 없습니다.")
        }

        invitation.status = InvitationStatus.REJECTED
        invitation.respondedAt = clock.instant()
        val saved = invitationRepository.save(invitation)
        return InvitationResponseDto.from(saved, clock.instant())
    }

    @Transactional(readOnly = true)
    fun getLinkInvitationPreview(token: String): LinkInvitationPreviewResponse {
        val invitation = invitationRepository.findByToken(token)
            ?: throw NotFoundException("초대 링크를 찾을 수 없습니다.")

        return LinkInvitationPreviewResponse(
            ledgerId = invitation.ledger.id!!,
            ledgerName = invitation.ledger.name,
            ledgerType = invitation.ledger.type,
            inviterNickname = invitation.inviter.nickname,
            status = invitation.getEffectiveStatus(clock.instant()),
            expired = invitation.isExpired(clock.instant())
        )
    }

    fun acceptLinkInvitationByToken(currentUserId: Long, token: String): InvitationResponseDto {
        val invitation = invitationRepository.findByToken(token)
            ?: throw NotFoundException("초대 링크를 찾을 수 없습니다.")

        if (invitation.status != InvitationStatus.PENDING || invitation.isExpired(clock.instant())) {
            throw BadRequestException("대기 중이며 만료되지 않은 초대만 수락할 수 있습니다.")
        }

        if (ledgerMemberRepository.existsByLedgerIdAndUserId(invitation.ledger.id!!, currentUserId)) {
            throw BadRequestException("이미 장부의 멤버입니다.")
        }

        val user = userRepository.findById(currentUserId).orElseThrow {
            ForbiddenException("사용자를 찾을 수 없습니다.")
        }

        val member = LedgerMember(
            ledger = invitation.ledger,
            user = user,
            role = LedgerRole.MEMBER
        )
        ledgerMemberRepository.save(member)

        user.lastUsedLedgerId = invitation.ledger.id
        userRepository.save(user)

        invitation.status = InvitationStatus.ACCEPTED
        invitation.respondedAt = clock.instant()
        val saved = invitationRepository.save(invitation)
        return InvitationResponseDto.from(saved, clock.instant())
    }
}

data class InvitableUserResponse(
    val user: UserDto,
    val invitable: Boolean,
    val reason: String?
)

data class InvitationResponseDto(
    val id: Long,
    val ledgerId: Long,
    val ledgerName: String,
    val ledgerType: LedgerType,
    val inviter: UserDto,
    val invitee: UserDto?,
    val type: InvitationType,
    val status: InvitationStatus,
    val token: String?,
    val expiresAt: Instant?,
    val respondedAt: Instant?,
    val createdAt: Instant
) {
    companion object {
        fun from(invitation: Invitation, now: Instant) = InvitationResponseDto(
            id = invitation.id!!,
            ledgerId = invitation.ledger.id!!,
            ledgerName = invitation.ledger.name,
            ledgerType = invitation.ledger.type,
            inviter = UserDto.from(invitation.inviter),
            invitee = invitation.invitee?.let { UserDto.from(it) },
            type = invitation.type,
            status = invitation.getEffectiveStatus(now),
            token = invitation.token,
            expiresAt = invitation.expiresAt,
            respondedAt = invitation.respondedAt,
            createdAt = invitation.createdAt
        )
    }
}

data class LinkInvitationPreviewResponse(
    val ledgerId: Long,
    val ledgerName: String,
    val ledgerType: LedgerType,
    val inviterNickname: String,
    val status: InvitationStatus,
    val expired: Boolean
)
