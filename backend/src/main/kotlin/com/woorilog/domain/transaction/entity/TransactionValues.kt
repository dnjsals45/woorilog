package com.woorilog.domain.transaction.entity

import com.woorilog.domain.transaction.policy.BudgetScopeType

// Shared value types wrapping domain enums. They are used both as request-body input (V1 transaction
// create/update, recurring plans, imports) and as parts of application results, so they live in domain
// rather than in a single layer's request/result package.

data class BudgetSource(val type: BudgetScopeType, val ownerUserId: Long?)
data class V1PaymentMethod(val type: PaymentMethod, val displayName: String? = null)
