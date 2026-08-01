package com.woorilog.controller.transaction.request

data class BulkClassifyRequest(val transactionIds: List<Long>, val categoryId: Long)
