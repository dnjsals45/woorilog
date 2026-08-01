package com.woorilog.controller.transaction.request

import com.woorilog.application.transaction.command.UpdateTransactionCommand
import com.woorilog.domain.category.entity.CategoryType
import com.woorilog.domain.transaction.entity.PaymentMethod
import jakarta.validation.constraints.NotNull
import java.time.LocalDate

data class UpdateTransactionApiRequest(
    @field:NotNull(message = "거래 유형은 필수입니다.")
    val type: CategoryType,

    @field:NotNull(message = "금액은 필수입니다.")
    val amount: Long,

    @field:NotNull(message = "거래 일자는 필수입니다.")
    val transactionDate: LocalDate,

    val categoryId: Long?,

    val memo: String?,

    val payerUserId: Long?,

    val paymentMethod: PaymentMethod?,

    val cardId: Long?,
) {
    fun toCommand() = UpdateTransactionCommand(
        type = type,
        amount = amount,
        transactionDate = transactionDate,
        categoryId = categoryId,
        memo = memo,
        payerUserId = payerUserId,
        paymentMethod = paymentMethod,
        cardId = cardId,
    )
}
