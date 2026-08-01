package com.woorilog.application.card.command

data class SaveCardCommand(
    val name: String,
    val statementClosingDay: Int,
)
