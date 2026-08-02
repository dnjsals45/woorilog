package com.woorilog.application.auth.result

import com.woorilog.domain.auth.entity.User
import com.woorilog.domain.budget.policy.BudgetStartType
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
    /* 응답 계층은 이 둘을 BudgetCycleResponse 로 묶어 내보낸다(LedgerResponse.budgetCycle).
     * 여기에 기본값을 두는 이유는 평평한 형태로 직렬화된 적 없는 페이로드를 역직렬화할 때
     * 생성자 파라미터 누락으로 실패하지 않게 하기 위함이다. from(ledger) 는 항상 실제 값을 채운다. */
    val budgetStartType: String = BudgetStartType.DAY_OF_MONTH.name,
    val budgetStartDay: Int? = 1,
) {
    companion object {
        fun from(ledger: Ledger) = LedgerDto(
            id = ledger.id!!,
            name = ledger.name,
            type = ledger.type,
            ownerId = ledger.ownerId,
            recurringSummaryClosingDay = ledger.recurringSummaryClosingDay,
            budgetStartType = ledger.budgetStartType.name,
            budgetStartDay = ledger.budgetStartDay,
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
