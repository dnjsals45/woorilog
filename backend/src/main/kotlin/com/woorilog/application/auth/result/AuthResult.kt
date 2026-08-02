package com.woorilog.application.auth.result

import com.woorilog.domain.auth.entity.User
import com.woorilog.application.ledger.result.BudgetCycleResult
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
    /* 장부 응답은 어느 엔드포인트에서든 같은 모양이어야 한다. LedgerDto 를 그대로 직렬화하는
     * /api/me·dev-login·refresh 와 LedgerResponse 로 변환하는 /api/ledgers 가 서로 다른 키를
     * 내보내면 프론트가 한쪽에서만 값을 읽게 된다. 기본값은 이 필드가 없는 페이로드를
     * 역직렬화할 때 생성자 파라미터 누락으로 실패하지 않게 하기 위함이다. */
    val budgetCycle: BudgetCycleResult = BudgetCycleResult(BudgetStartType.DAY_OF_MONTH.name, 1),
) {
    companion object {
        fun from(ledger: Ledger) = LedgerDto(
            id = ledger.id!!,
            name = ledger.name,
            type = ledger.type,
            ownerId = ledger.ownerId,
            recurringSummaryClosingDay = ledger.recurringSummaryClosingDay,
            budgetCycle = BudgetCycleResult(ledger.budgetStartType.name, ledger.budgetStartDay),
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
