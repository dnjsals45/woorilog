package com.woorilog.application.auth.result

import com.woorilog.domain.auth.entity.User
import com.woorilog.domain.ledger.entity.Ledger
import com.woorilog.domain.ledger.entity.LedgerType

data class UserDto(
    val id: Long,
    val nickname: String,
    val nicknameConfirmed: Boolean,
    val timezone: String,
) {
    companion object {
        fun from(user: User) = UserDto(
            id = user.id!!,
            nickname = user.nickname,
            nicknameConfirmed = user.nicknameConfirmedAt != null,
            timezone = user.timezone,
        )
    }
}

data class LedgerDto(
    val id: Long,
    val name: String,
    val type: LedgerType,
    val ownerId: Long,
    val recurringSummaryClosingDay: Int,
) {
    companion object {
        fun from(ledger: Ledger) = LedgerDto(
            id = ledger.id!!,
            name = ledger.name,
            type = ledger.type,
            ownerId = ledger.ownerId,
            recurringSummaryClosingDay = ledger.recurringSummaryClosingDay,
        )
    }
}

data class MeResult(
    val user: UserDto,
    val currentLedger: LedgerDto,
)

data class DevLoginResult(
    val accessToken: String,
    val expiresInSeconds: Long,
    val user: UserDto,
    val currentLedger: LedgerDto,
    val refreshToken: String = "",
)
