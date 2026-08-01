package com.woorilog.domain.scheduled.entity

enum class ScheduledPlanType { RECURRING_EXPENSE, INSTALLMENT }
enum class ScheduledPlanStatus { ACTIVE, PAUSED, CANCELLED }
enum class ScheduledPauseReason { USER_REQUEST, MEMBERSHIP_CHANGED }
enum class ScheduledOccurrenceStatus { SCHEDULED, GENERATED, SKIPPED, CANCELLED }
