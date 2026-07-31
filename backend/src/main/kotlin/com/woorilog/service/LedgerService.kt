package com.woorilog.service

import com.woorilog.domain.*
import com.woorilog.exception.ForbiddenException
import com.woorilog.exception.NotFoundException
import com.woorilog.exception.BadRequestException
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
    private val clock: Clock,
) {

    @Transactional(readOnly = true)
    fun getLedgers(userId: Long): LedgerListResponse {
        val user = userRepository.findById(userId).orElseThrow {
            ForbiddenException("사용자를 찾을 수 없습니다.")
        }
        val members = ledgerMemberRepository.findByUserId(userId)
        val ledgers = members.map { it.ledger }.filter { !it.archived }.map { LedgerDto.from(it) }
        val currentLedger = authService.resolveCurrentLedger(user)

        return LedgerListResponse(
            ledgers = ledgers,
            currentLedgerId = currentLedger.id!!
        )
    }

    @Transactional(readOnly = true)
    fun getLedgerMembers(userId: Long, ledgerId: Long): List<LedgerMemberResponse> {
        ledgerRepository.findById(ledgerId).orElseThrow {
            NotFoundException("장부를 찾을 수 없습니다.")
        }
        val viewerMemberships = ledgerMemberRepository.findByUserId(userId).filter { it.ledger.id == ledgerId }
        if (viewerMemberships.isEmpty()) throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")

        val viewerActive = viewerMemberships.any { it.leftAt == null }
        return ledgerMemberRepository.findByLedgerId(ledgerId)
            .filter { viewerActive || it.user.id == userId }
            .map { LedgerMemberResponse.from(it) }
    }

    fun createPersonalLedger(userId: Long, name: String): LedgerDto {
        val user = userRepository.findById(userId).orElseThrow {
            ForbiddenException("사용자를 찾을 수 없습니다.")
        }

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
        val user = userRepository.findById(userId).orElseThrow {
            ForbiddenException("사용자를 찾을 수 없습니다.")
        }

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
    ): CreateSharedLedgerResponse {
        val user = userRepository.findById(userId).orElseThrow {
            ForbiddenException("사용자를 찾을 수 없습니다.")
        }
        if (user.nicknameConfirmedAt == null) {
            throw com.woorilog.exception.WoorilogException(
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

        return CreateSharedLedgerResponse(
            ledger = toSummary(ledger, userId),
            currentBudgetPeriod = budgetPeriodService.getCurrent(userId, ledger.id!!, null),
        )
    }

    fun useLedger(userId: Long, ledgerId: Long): LedgerDto {
        val user = userRepository.findById(userId).orElseThrow {
            ForbiddenException("사용자를 찾을 수 없습니다.")
        }

        val ledger = ledgerRepository.findById(ledgerId).orElseThrow {
            NotFoundException("장부를 찾을 수 없습니다.")
        }
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
        val owner = userRepository.findById(userId).orElseThrow { ForbiddenException("사용자를 찾을 수 없습니다.") }
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
            ?: throw com.woorilog.exception.WoorilogException("MEMBER_NOT_ACTIVE", "활성 장부 멤버가 아닙니다.", org.springframework.http.HttpStatus.CONFLICT)
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

    fun leaveLedger(userId: Long, ledgerId: Long) {
        val ledger = ledgerRepository.findByIdForUpdate(ledgerId) ?: throw NotFoundException("장부를 찾을 수 없습니다.")
        if (ledger.ownerId == userId) throw com.woorilog.exception.WoorilogException("OWNER_TRANSFER_REQUIRED", "소유권 이전 후 장부를 나갈 수 있습니다.", org.springframework.http.HttpStatus.CONFLICT)
        val member = ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")
        scheduledPlanService.pauseForMembershipChange(ledgerId)
        member.leftAt = clock.instant()
        member.leaveReason = "LEFT"
        ledgerMemberRepository.save(member)
        clearLastUsedLedger(userId, ledgerId)
    }

    fun transferOwnership(userId: Long, ledgerId: Long, newOwnerUserId: Long): List<LedgerMemberResponse> {
        val ledger = requireOwnerForUpdate(userId, ledgerId)
        if (newOwnerUserId == userId) {
            throw com.woorilog.exception.WoorilogException("ALREADY_OWNER", "이미 장부 소유자입니다.", org.springframework.http.HttpStatus.CONFLICT)
        }
        val currentOwner = ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("장부 소유자 정보를 찾을 수 없습니다.")
        val newOwner = ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, newOwnerUserId)
            ?: throw com.woorilog.exception.WoorilogException("ACTIVE_MEMBER_REQUIRED", "활성 멤버에게만 소유권을 이전할 수 있습니다.", org.springframework.http.HttpStatus.CONFLICT)
        currentOwner.role = LedgerRole.MEMBER
        newOwner.role = LedgerRole.OWNER
        ledger.ownerId = newOwnerUserId
        ledgerRepository.save(ledger)
        return ledgerMemberRepository.findByLedgerIdAndLeftAtIsNullOrderById(ledgerId).map { LedgerMemberResponse.from(it) }
    }

    private fun requireOwner(userId: Long, ledgerId: Long): Ledger {
        val ledger = ledgerRepository.findById(ledgerId).orElseThrow { NotFoundException("장부를 찾을 수 없습니다.") }
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
        val user = userRepository.findById(userId).orElse(null) ?: return
        if (user.lastUsedLedgerId == ledgerId) {
            user.lastUsedLedgerId = null
            userRepository.save(user)
        }
    }

    private fun toSummary(ledger: Ledger, viewerUserId: Long): LedgerSummaryResponse {
        val activeMembers = ledgerMemberRepository.findByLedgerIdAndLeftAtIsNullOrderById(ledger.id!!)
        val viewer = activeMembers.firstOrNull { it.user.id == viewerUserId }
            ?: ledgerMemberRepository.findByUserId(viewerUserId)
                .filter { it.ledger.id == ledger.id }
                .maxByOrNull { it.joinedAt }
            ?: throw ForbiddenException("장부를 조회할 수 없습니다.")
        val partner = activeMembers.firstOrNull { it.user.id != viewerUserId }?.user
        return LedgerSummaryResponse(
            id = ledger.id!!,
            name = ledger.name,
            type = if (ledger.type == LedgerType.PERSONAL) "PERSONAL" else "SHARED",
            role = viewer.role.name,
            accessState = if (viewer.leftAt == null) "ACTIVE" else "FORMER_READ_ONLY",
            partner = partner?.let { UserSummaryResponse(it.id!!, it.nickname) },
            budgetCycle = BudgetCycleResponse(ledger.budgetStartType.name, ledger.budgetStartDay),
        )
    }
}

data class LedgerListResponse(
    val ledgers: List<LedgerDto>,
    val currentLedgerId: Long,
    val items: List<LedgerDto> = ledgers,
)

data class BudgetCycleResponse(val startType: String, val startDay: Int?)
data class LedgerSummaryResponse(
    val id: Long,
    val name: String,
    val type: String,
    val role: String,
    val accessState: String,
    val partner: UserSummaryResponse?,
    val budgetCycle: BudgetCycleResponse,
)
data class CreateSharedLedgerResponse(
    val ledger: LedgerSummaryResponse,
    val currentBudgetPeriod: BudgetPeriodDetailResponse,
)

data class LedgerMemberResponse(
    val userId: Long,
    val nickname: String,
    val role: LedgerRole,
    val user: UserSummaryResponse,
    val status: String,
    val joinedAt: java.time.Instant,
    val leftAt: java.time.Instant?,
) {
    companion object {
        fun from(member: LedgerMember) = LedgerMemberResponse(
            userId = member.user.id!!,
            nickname = member.user.nickname,
            role = member.role,
            user = UserSummaryResponse(member.user.id!!, member.user.nickname),
            status = if (member.leftAt == null) "ACTIVE" else "FORMER",
            joinedAt = member.joinedAt,
            leftAt = member.leftAt,
        )
    }
}
