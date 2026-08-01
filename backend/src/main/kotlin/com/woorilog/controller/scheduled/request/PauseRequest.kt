package com.woorilog.controller.scheduled.request

import com.woorilog.domain.scheduled.entity.ScheduledPauseReason

data class PauseRequest(val reason: ScheduledPauseReason?)
