package com.woorilog.service

import com.woorilog.domain.*
import com.woorilog.exception.ForbiddenException
import com.woorilog.exception.NotFoundException
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
        val ledgers = members.map { LedgerDto.from(it.ledger) }
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

        val member = ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")

        user.lastUsedLedgerId = ledger.id
        userRepository.save(user)

        return LedgerDto.from(ledger)
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
