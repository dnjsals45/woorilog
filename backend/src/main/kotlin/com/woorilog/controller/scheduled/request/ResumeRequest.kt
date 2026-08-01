package com.woorilog.controller.scheduled.request

import jakarta.validation.constraints.NotNull
import java.time.LocalDate

data class ResumeRequest(@field:NotNull val nextDueDate: LocalDate)
