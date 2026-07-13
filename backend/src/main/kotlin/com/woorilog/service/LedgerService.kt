package com.woorilog.service

import com.woorilog.domain.*
import com.woorilog.exception.ForbiddenException
import com.woorilog.exception.NotFoundException
import com.woorilog.exception.BadRequestException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class LedgerService(
    private val userRepository: UserRepository,
    private val ledgerRepository: LedgerRepository,
    private val ledgerMemberRepository: LedgerMemberRepository,
    private val authService: AuthService,
    private val ledgerCategorySeedingService: LedgerCategorySeedingService
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
        ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")

        return ledgerMemberRepository.findByLedgerId(ledgerId)
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
            role = LedgerRole.OWNER
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
            role = LedgerRole.OWNER
        )
        ledgerMemberRepository.save(member)

        ledgerCategorySeedingService.seedDefaultCategories(savedLedger)

        // Optionally update lastUsedLedgerId to the new one
        user.lastUsedLedgerId = savedLedger.id
        userRepository.save(user)

        return LedgerDto.from(savedLedger)
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

    fun renameLedger(userId: Long, ledgerId: Long, name: String): LedgerDto {
        val ledger = requireOwner(userId, ledgerId)
        val trimmedName = name.trim()
        if (trimmedName.isBlank()) throw BadRequestException("장부 이름은 비어 있을 수 없습니다.")
        ledger.name = trimmedName
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
        val ledger = requireOwner(userId, ledgerId)
        if (ledger.ownerId == targetUserId) throw BadRequestException("장부 소유자는 내보낼 수 없습니다.")
        val member = ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, targetUserId)
            ?: throw NotFoundException("장부 멤버를 찾을 수 없습니다.")
        ledgerMemberRepository.delete(member)
        clearLastUsedLedger(targetUserId, ledgerId)
    }

    fun leaveLedger(userId: Long, ledgerId: Long) {
        val ledger = ledgerRepository.findById(ledgerId).orElseThrow { NotFoundException("장부를 찾을 수 없습니다.") }
        if (ledger.ownerId == userId) throw BadRequestException("장부 소유자는 장부를 나갈 수 없습니다. 먼저 장부를 보관해주세요.")
        val member = ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")
        ledgerMemberRepository.delete(member)
        clearLastUsedLedger(userId, ledgerId)
    }

    private fun requireOwner(userId: Long, ledgerId: Long): Ledger {
        val ledger = ledgerRepository.findById(ledgerId).orElseThrow { NotFoundException("장부를 찾을 수 없습니다.") }
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
}

data class LedgerListResponse(
    val ledgers: List<LedgerDto>,
    val currentLedgerId: Long
)

data class LedgerMemberResponse(
    val userId: Long,
    val nickname: String,
    val role: LedgerRole
) {
    companion object {
        fun from(member: LedgerMember) = LedgerMemberResponse(
            userId = member.user.id!!,
            nickname = member.user.nickname,
            role = member.role
        )
    }
}
