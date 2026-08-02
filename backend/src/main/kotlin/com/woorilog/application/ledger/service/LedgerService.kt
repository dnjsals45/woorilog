package com.woorilog.application.ledger.service

import com.woorilog.domain.auth.repository.UserRepository
import com.woorilog.domain.budget.policy.BudgetCyclePolicy
import com.woorilog.domain.budget.policy.BudgetStartType
import com.woorilog.domain.ledger.entity.Ledger
import com.woorilog.domain.ledger.entity.LedgerMember
import com.woorilog.domain.ledger.entity.LedgerRole
import com.woorilog.domain.invitation.entity.InvitationStatus
import com.woorilog.domain.invitation.entity.InvitationType
import com.woorilog.domain.invitation.repository.InvitationRepository
import com.woorilog.domain.ledger.entity.LedgerType
import com.woorilog.domain.ledger.repository.LedgerMemberRepository
import com.woorilog.domain.ledger.repository.LedgerRepository
import com.woorilog.domain.notification.entity.NotificationType
import com.woorilog.application.auth.service.AuthService
import com.woorilog.application.auth.result.LedgerDto
import com.woorilog.application.category.service.LedgerCategorySeedingService
import com.woorilog.application.budget.service.BudgetPeriodService
import com.woorilog.application.budget.result.BudgetPeriodDetailResponse
import com.woorilog.application.budget.result.UserSummaryResponse
import com.woorilog.application.scheduled.service.ScheduledPlanService
import com.woorilog.application.notification.service.NotificationService
import com.woorilog.application.ledger.result.BudgetCycleResult
import com.woorilog.application.ledger.result.CreateSharedLedgerResult
import com.woorilog.application.ledger.result.LedgerListResult
import com.woorilog.application.ledger.result.LedgerMemberResult
import com.woorilog.application.ledger.result.LedgerSummaryResult
import com.woorilog.application.ledger.result.toResult
import com.woorilog.common.exception.ForbiddenException
import com.woorilog.common.exception.NotFoundException
import com.woorilog.common.exception.WoorilogException
import org.springframework.http.HttpStatus
import com.woorilog.common.exception.BadRequestException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock

@Service
@Transactional
class LedgerService(
    private val userRepository: UserRepository,
    private val ledgerRepository: LedgerRepository,
    private val ledgerMemberRepository: LedgerMemberRepository,
    private val authService: AuthService,
    private val ledgerCategorySeedingService: LedgerCategorySeedingService,
    private val budgetPeriodService: BudgetPeriodService,
    private val scheduledPlanService: ScheduledPlanService,
    private val notificationService: NotificationService,
    private val invitationRepository: InvitationRepository,
    private val clock: Clock,
) {

    @Transactional(readOnly = true)
    fun getLedgers(userId: Long): LedgerListResult {
        val user = userRepository.findByIdOrNull(userId) ?: throw ForbiddenException("사용자를 찾을 수 없습니다.")
        val members = ledgerMemberRepository.findByUserId(userId)
        val ledgers = members.map { it.ledger }.filter { !it.archived }.map { LedgerDto.from(it) }
        val currentLedger = authService.resolveCurrentLedger(user)

        return LedgerListResult(
            ledgers = ledgers,
            currentLedgerId = currentLedger.id!!
        )
    }

    @Transactional(readOnly = true)
    fun getLedgerMembers(userId: Long, ledgerId: Long): List<LedgerMemberResult> {
        ledgerRepository.findByIdOrNull(ledgerId) ?: throw NotFoundException("장부를 찾을 수 없습니다.")
        val viewerMemberships = ledgerMemberRepository.findByUserId(userId).filter { it.ledger.id == ledgerId }
        if (viewerMemberships.isEmpty()) throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")

        val viewerActive = viewerMemberships.any { it.leftAt == null }
        return ledgerMemberRepository.findByLedgerId(ledgerId)
            .filter { viewerActive || it.user.id == userId }
            .map { it.toResult() }
    }

    fun createPersonalLedger(userId: Long, name: String): LedgerDto {
        val user = userRepository.findByIdOrNull(userId) ?: throw ForbiddenException("사용자를 찾을 수 없습니다.")

        val ledger = Ledger(
            name = name,
            type = LedgerType.PERSONAL,
            ownerId = user.id!!
        )
        val savedLedger = ledgerRepository.save(ledger)

        val member = LedgerMember(
            ledger = savedLedger,
            user = user,
            role = LedgerRole.OWNER,
            joinedAt = clock.instant(),
        )
        ledgerMemberRepository.save(member)

        ledgerCategorySeedingService.seedDefaultCategories(savedLedger)

        // Optionally update lastUsedLedgerId to the new one
        user.lastUsedLedgerId = savedLedger.id
        userRepository.save(user)

        return LedgerDto.from(savedLedger)
    }

    fun createGroupLedger(userId: Long, name: String): LedgerDto {
        val user = userRepository.findByIdOrNull(userId) ?: throw ForbiddenException("사용자를 찾을 수 없습니다.")

        val ledger = Ledger(
            name = name,
            type = LedgerType.GROUP,
            ownerId = user.id!!
        )
        val savedLedger = ledgerRepository.save(ledger)

        val member = LedgerMember(
            ledger = savedLedger,
            user = user,
            role = LedgerRole.OWNER,
            joinedAt = clock.instant(),
        )
        ledgerMemberRepository.save(member)

        ledgerCategorySeedingService.seedDefaultCategories(savedLedger)

        // Optionally update lastUsedLedgerId to the new one
        user.lastUsedLedgerId = savedLedger.id
        userRepository.save(user)

        return LedgerDto.from(savedLedger)
    }

    fun createSharedLedger(
        userId: Long,
        name: String,
        totalBudget: Long,
        startType: BudgetStartType,
        startDay: Int?,
    ): CreateSharedLedgerResult {
        val user = userRepository.findByIdOrNull(userId) ?: throw ForbiddenException("사용자를 찾을 수 없습니다.")
        if (user.nicknameConfirmedAt == null) {
            throw com.woorilog.common.exception.WoorilogException(
                "NICKNAME_CONFIRMATION_REQUIRED",
                "서비스 닉네임을 먼저 확정해주세요.",
                org.springframework.http.HttpStatus.CONFLICT,
            )
        }
        val normalizedName = name.trim()
        if (normalizedName.length !in 1..30 || totalBudget < 0) {
            throw BadRequestException("장부 이름과 전체 예산을 확인해주세요.")
        }
        BudgetCyclePolicy(startType, startDay)

        val ledger = ledgerRepository.save(
            Ledger(
                name = normalizedName,
                type = LedgerType.GROUP,
                ownerId = user.id!!,
                budgetStartType = startType,
                budgetStartDay = startDay,
                defaultTotalBudgetAmount = totalBudget,
            )
        )
        ledgerMemberRepository.save(
            LedgerMember(
                ledger = ledger,
                user = user,
                role = LedgerRole.OWNER,
                joinedAt = clock.instant(),
            )
        )
        ledgerCategorySeedingService.seedDefaultCategories(ledger)
        user.lastUsedLedgerId = ledger.id
        userRepository.save(user)
        budgetPeriodService.createInitialPeriod(ledger, totalBudget, user, preparePersonal = false)

        return CreateSharedLedgerResult(
            ledger = toSummary(ledger, userId),
            currentBudgetPeriod = budgetPeriodService.getCurrent(userId, ledger.id!!, null),
        )
    }

    fun useLedger(userId: Long, ledgerId: Long): LedgerDto {
        val user = userRepository.findByIdOrNull(userId) ?: throw ForbiddenException("사용자를 찾을 수 없습니다.")

        val ledger = ledgerRepository.findByIdOrNull(ledgerId) ?: throw NotFoundException("장부를 찾을 수 없습니다.")
        if (ledger.archived) throw BadRequestException("보관된 장부는 사용할 수 없습니다.")

        val member = ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")

        user.lastUsedLedgerId = ledger.id
        userRepository.save(user)

        return LedgerDto.from(ledger)
    }

    fun updateLedger(
        userId: Long,
        ledgerId: Long,
        name: String?,
        recurringSummaryClosingDay: Int?,
        budgetStartType: BudgetStartType? = null,
        budgetStartDay: Int? = null,
    ): LedgerDto {
        val ledger = requireOwner(userId, ledgerId)
        if (name != null) {
            val trimmedName = name.trim()
            if (trimmedName.isBlank()) throw BadRequestException("장부 이름은 비어 있을 수 없습니다.")
            ledger.name = trimmedName
        }
        if (recurringSummaryClosingDay != null) {
            ledger.recurringSummaryClosingDay = recurringSummaryClosingDay
        }
        if (budgetStartType != null) {
            BudgetCyclePolicy(budgetStartType, budgetStartDay)
            ledger.budgetStartType = budgetStartType
            ledger.budgetStartDay = budgetStartDay
        }
        if (name == null && recurringSummaryClosingDay == null && budgetStartType == null) {
            throw BadRequestException("변경할 장부 정보가 없습니다.")
        }
        return LedgerDto.from(ledgerRepository.save(ledger))
    }

    fun archiveLedger(userId: Long, ledgerId: Long): LedgerDto {
        val ledger = requireOwner(userId, ledgerId)
        ledger.archived = true
        ledgerRepository.save(ledger)
        val owner = userRepository.findByIdOrNull(userId) ?: throw ForbiddenException("사용자를 찾을 수 없습니다.")
        if (owner.lastUsedLedgerId == ledgerId) {
            owner.lastUsedLedgerId = null
            userRepository.save(owner)
            authService.resolveCurrentLedger(owner)
        }
        return LedgerDto.from(ledger)
    }

    fun removeMember(userId: Long, ledgerId: Long, targetUserId: Long) {
        val ledger = requireOwnerForUpdate(userId, ledgerId)
        if (ledger.ownerId == targetUserId) throw BadRequestException("장부 소유자는 내보낼 수 없습니다.")
        val member = ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, targetUserId)
            ?: throw com.woorilog.common.exception.WoorilogException("MEMBER_NOT_ACTIVE", "활성 장부 멤버가 아닙니다.", org.springframework.http.HttpStatus.CONFLICT)
        scheduledPlanService.pauseForMembershipChange(ledgerId)
        member.leftAt = clock.instant()
        member.leaveReason = "REMOVED"
        ledgerMemberRepository.save(member)
        clearLastUsedLedger(targetUserId, ledgerId)
        notificationService.notifyUser(
            targetUserId,
            NotificationType.SYSTEM,
            "공동 장부에서 내보내졌습니다.",
            "${ledger.name} 장부는 참여 기간 동안 읽기 전용으로 볼 수 있습니다.",
            "/ledgers/$ledgerId",
            "member-removed-$ledgerId-${member.id}",
        )
    }

    /* 장부 삭제는 "나가기"와 다르다. 나가기는 상대에게 장부를 넘기고 빠지는 것이고,
     * 삭제는 장부 자체를 없애는 것이라 현재 나 말고 활성 멤버가 없을 때만 할 수 있다.
     * 과거에 함께 쓴 사람이 있으면 그 사람의 읽기 전용 접근도 함께 사라지므로,
     * 화면에서 그 사실을 알리고 장부 이름을 입력받은 뒤 호출한다. */
    fun deleteLedger(userId: Long, ledgerId: Long) {
        val ledger = requireOwnerForUpdate(userId, ledgerId)
        if (ledger.deletedAt != null) throw NotFoundException("장부를 찾을 수 없습니다.")
        if (ledger.type != LedgerType.GROUP) {
            throw WoorilogException("PERSONAL_LEDGER_NOT_DELETABLE", "개인 장부는 삭제할 수 없습니다.", HttpStatus.CONFLICT)
        }
        val otherActiveMembers = ledgerMemberRepository.findByLedgerIdAndLeftAtIsNullOrderById(ledgerId)
            .filter { it.user.id != userId }
        if (otherActiveMembers.isNotEmpty()) {
            throw WoorilogException(
                "LEDGER_HAS_ACTIVE_MEMBER",
                "함께 쓰는 사람이 있는 장부는 삭제할 수 없습니다.",
                HttpStatus.CONFLICT,
            )
        }
        scheduledPlanService.pauseForMembershipChange(ledgerId)
        invitationRepository.findByLedgerIdAndTypeAndStatus(ledgerId, InvitationType.LINK, InvitationStatus.PENDING)
            .forEach { it.status = InvitationStatus.CANCELLED }
        ledger.deletedAt = clock.instant()
        ledger.archived = true
        ledgerRepository.save(ledger)
        clearLastUsedLedger(userId, ledgerId)
    }

    fun leaveLedger(userId: Long, ledgerId: Long) {
        val ledger = ledgerRepository.findByIdForUpdate(ledgerId) ?: throw NotFoundException("장부를 찾을 수 없습니다.")
        if (ledger.ownerId == userId) throw com.woorilog.common.exception.WoorilogException("OWNER_TRANSFER_REQUIRED", "소유권 이전 후 장부를 나갈 수 있습니다.", org.springframework.http.HttpStatus.CONFLICT)
        val member = ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")
        scheduledPlanService.pauseForMembershipChange(ledgerId)
        member.leftAt = clock.instant()
        member.leaveReason = "LEFT"
        ledgerMemberRepository.save(member)
        clearLastUsedLedger(userId, ledgerId)
    }

    fun transferOwnership(userId: Long, ledgerId: Long, newOwnerUserId: Long): List<LedgerMemberResult> {
        val ledger = requireOwnerForUpdate(userId, ledgerId)
        if (newOwnerUserId == userId) {
            throw com.woorilog.common.exception.WoorilogException("ALREADY_OWNER", "이미 장부 소유자입니다.", org.springframework.http.HttpStatus.CONFLICT)
        }
        val currentOwner = ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("장부 소유자 정보를 찾을 수 없습니다.")
        val newOwner = ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, newOwnerUserId)
            ?: throw com.woorilog.common.exception.WoorilogException("ACTIVE_MEMBER_REQUIRED", "활성 멤버에게만 소유권을 이전할 수 있습니다.", org.springframework.http.HttpStatus.CONFLICT)
        currentOwner.role = LedgerRole.MEMBER
        newOwner.role = LedgerRole.OWNER
        ledger.ownerId = newOwnerUserId
        ledgerRepository.save(ledger)
        return ledgerMemberRepository.findByLedgerIdAndLeftAtIsNullOrderById(ledgerId).map { it.toResult() }
    }

    private fun requireOwner(userId: Long, ledgerId: Long): Ledger {
        val ledger = ledgerRepository.findByIdOrNull(ledgerId) ?: throw NotFoundException("장부를 찾을 수 없습니다.")
        val member = ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")
        if (member.role != LedgerRole.OWNER) throw ForbiddenException("장부 소유자만 변경할 수 있습니다.")
        return ledger
    }

    private fun requireOwnerForUpdate(userId: Long, ledgerId: Long): Ledger {
        val ledger = ledgerRepository.findByIdForUpdate(ledgerId) ?: throw NotFoundException("장부를 찾을 수 없습니다.")
        val member = ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")
        if (member.role != LedgerRole.OWNER) throw ForbiddenException("장부 소유자만 변경할 수 있습니다.")
        return ledger
    }

    private fun clearLastUsedLedger(userId: Long, ledgerId: Long) {
        val user = userRepository.findByIdOrNull(userId) ?: return
        if (user.lastUsedLedgerId == ledgerId) {
            user.lastUsedLedgerId = null
            userRepository.save(user)
        }
    }

    private fun toSummary(ledger: Ledger, viewerUserId: Long): LedgerSummaryResult {
        val activeMembers = ledgerMemberRepository.findByLedgerIdAndLeftAtIsNullOrderById(ledger.id!!)
        val viewer = activeMembers.firstOrNull { it.user.id == viewerUserId }
            ?: ledgerMemberRepository.findByUserId(viewerUserId)
                .filter { it.ledger.id == ledger.id }
                .maxByOrNull { it.joinedAt }
            ?: throw ForbiddenException("장부를 조회할 수 없습니다.")
        val partner = activeMembers.firstOrNull { it.user.id != viewerUserId }?.user
        return LedgerSummaryResult(
            id = ledger.id!!,
            name = ledger.name,
            type = if (ledger.type == LedgerType.PERSONAL) "PERSONAL" else "SHARED",
            role = viewer.role.name,
            accessState = if (viewer.leftAt == null) "ACTIVE" else "FORMER_READ_ONLY",
            partner = partner?.let { UserSummaryResponse(it.id!!, it.nickname) },
            budgetCycle = BudgetCycleResult(ledger.budgetStartType.name, ledger.budgetStartDay),
        )
    }
}
