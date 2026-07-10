package com.woorilog.service

import com.woorilog.domain.*
import com.woorilog.exception.ForbiddenException
import com.woorilog.exception.NotFoundException
import com.woorilog.exception.WoorilogException
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeParseException

@Service
@Transactional
class TransactionService(
    private val ledgerRepository: LedgerRepository,
    private val ledgerMemberRepository: LedgerMemberRepository,
    private val ledgerCategoryRepository: LedgerCategoryRepository,
    private val userRepository: UserRepository,
    private val transactionRepository: TransactionRepository
) {

    fun createTransaction(userId: Long, ledgerId: Long, request: CreateTransactionRequest): TransactionResponse {
        val ledger = ledgerRepository.findById(ledgerId).orElseThrow {
            NotFoundException("장부를 찾을 수 없습니다.")
        }
        // Verify user is a member
        ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")

        // Validate amount
        if (request.amount <= 0) {
            throw WoorilogException("INVALID_REQUEST", "금액은 양수여야 합니다.", HttpStatus.BAD_REQUEST)
        }

        // Resolve payer
        val payerUser = if (request.payerUserId != null) {
            userRepository.findById(request.payerUserId).orElseThrow {
                NotFoundException("결제자를 찾을 수 없습니다.")
            }
        } else {
            userRepository.findById(userId).orElseThrow {
                ForbiddenException("사용자를 찾을 수 없습니다.")
            }
        }
        ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, payerUser.id!!)
            ?: throw ForbiddenException("결제자가 장부의 멤버가 아닙니다.")

        // Resolve category
        val category = if (request.categoryId != null) {
            val cat = ledgerCategoryRepository.findById(request.categoryId).orElseThrow {
                NotFoundException("카테고리를 찾을 수 없습니다.")
            }
            if (cat.ledger.id != ledgerId) {
                throw NotFoundException("카테고리를 찾을 수 없습니다.")
            }
            cat
        } else {
            null
        }

        // Validate type/category type match
        if (category != null && category.type != request.type) {
            throw WoorilogException("INVALID_REQUEST", "거래 유형과 카테고리 유형이 일치하지 않습니다.", HttpStatus.BAD_REQUEST)
        }

        val transaction = Transaction(
            ledger = ledger,
            category = category,
            payer = payerUser,
            type = request.type,
            amount = request.amount,
            transactionDate = request.transactionDate,
            memo = request.memo
        )
        val saved = transactionRepository.save(transaction)
        return saved.toResponse()
    }

    fun quickTransaction(userId: Long, ledgerId: Long, request: QuickTransactionRequest): TransactionResponse {
        val ledger = ledgerRepository.findById(ledgerId).orElseThrow {
            NotFoundException("장부를 찾을 수 없습니다.")
        }
        // Verify user is a member
        ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")

        val amount = parseAmountFromText(request.text)

        val payerUser = userRepository.findById(userId).orElseThrow {
            ForbiddenException("사용자를 찾을 수 없습니다.")
        }

        val expenseCategories = ledgerCategoryRepository.findByLedgerIdOrderBySortOrderAsc(ledgerId)
            .filter { it.type == CategoryType.EXPENSE }
        val category = expenseCategories.firstOrNull()

        val transactionDate = request.transactionDate ?: LocalDate.now()

        val transaction = Transaction(
            ledger = ledger,
            category = category,
            payer = payerUser,
            type = CategoryType.EXPENSE,
            amount = amount,
            transactionDate = transactionDate,
            memo = request.text
        )
        val saved = transactionRepository.save(transaction)
        return saved.toResponse()
    }

    @Transactional(readOnly = true)
    fun getMonthTransactions(userId: Long, ledgerId: Long, budgetMonth: String): List<TransactionResponse> {
        val ledger = ledgerRepository.findById(ledgerId).orElseThrow {
            NotFoundException("장부를 찾을 수 없습니다.")
        }
        // Verify user is a member
        ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")

        val yearMonth = parseBudgetMonth(budgetMonth)
        val startDate = yearMonth.atDay(1)
        val endDate = yearMonth.atEndOfMonth()

        val transactions = transactionRepository.findByLedgerIdAndTransactionDateBetweenOrderByTransactionDateDescIdDesc(
            ledgerId, startDate, endDate
        )
        return transactions.map { it.toResponse() }
    }

    @Transactional(readOnly = true)
    fun getTransaction(userId: Long, transactionId: Long): TransactionResponse {
        val transaction = transactionRepository.findById(transactionId).orElseThrow {
            NotFoundException("거래를 찾을 수 없습니다.")
        }
        // Verify user is member of transaction's ledger
        ledgerMemberRepository.findByLedgerIdAndUserId(transaction.ledger.id!!, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")

        return transaction.toResponse()
    }

    fun updateTransaction(userId: Long, transactionId: Long, request: UpdateTransactionRequest): TransactionResponse {
        val transaction = transactionRepository.findById(transactionId).orElseThrow {
            NotFoundException("거래를 찾을 수 없습니다.")
        }
        val ledgerId = transaction.ledger.id!!
        // Verify user is member of transaction's ledger
        ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")

        // Validate amount
        if (request.amount <= 0) {
            throw WoorilogException("INVALID_REQUEST", "금액은 양수여야 합니다.", HttpStatus.BAD_REQUEST)
        }

        // Resolve payer
        val payerUser = request.payerUserId?.let { payerUserId ->
            userRepository.findById(payerUserId).orElseThrow {
                NotFoundException("결제자를 찾을 수 없습니다.")
            }
        } ?: transaction.payer
        ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, payerUser.id!!)
            ?: throw ForbiddenException("결제자가 장부의 멤버가 아닙니다.")

        // Resolve category
        val category = if (request.categoryId != null) {
            val cat = ledgerCategoryRepository.findById(request.categoryId).orElseThrow {
                NotFoundException("카테고리를 찾을 수 없습니다.")
            }
            if (cat.ledger.id != ledgerId) {
                throw NotFoundException("카테고리를 찾을 수 없습니다.")
            }
            cat
        } else {
            null
        }

        // Validate type/category type match
        if (category != null && category.type != request.type) {
            throw WoorilogException("INVALID_REQUEST", "거래 유형과 카테고리 유형이 일치하지 않습니다.", HttpStatus.BAD_REQUEST)
        }

        transaction.type = request.type
        transaction.amount = request.amount
        transaction.transactionDate = request.transactionDate
        transaction.category = category
        transaction.payer = payerUser
        transaction.memo = request.memo

        val saved = transactionRepository.save(transaction)
        return saved.toResponse()
    }

    private fun parseAmountFromText(text: String): Long {
        // 1. Try to match with "원" or "₩" suffix
        val wonRegex = Regex("""(\d[\d,]*)\s*(?:원|₩)""")
        val wonMatch = wonRegex.find(text)
        if (wonMatch != null) {
            val numberStr = wonMatch.groupValues[1].replace(",", "")
            return numberStr.toLongOrNull() ?: throw WoorilogException("INVALID_REQUEST", "금액을 파싱할 수 없습니다.", HttpStatus.BAD_REQUEST)
        }

        // 2. Find all number sequences (removing commas first)
        // Replace commas only if they are between digits (like 12,000)
        val cleanedText = text.replace(Regex("""(?<=\d),(?=\d)"""), "")
        val numberRegex = Regex("""\d+""")
        val numbers = numberRegex.findAll(cleanedText).map { it.value.toLong() }.toList()

        if (numbers.isEmpty()) {
            throw WoorilogException("INVALID_REQUEST", "금액을 찾을 수 없습니다.", HttpStatus.BAD_REQUEST)
        }

        // If there is only one number, use it
        if (numbers.size == 1) {
            return numbers[0]
        }

        // If there are multiple, filter out common date components (year 2020..2035, month 1..12, day 1..31)
        val nonDateNumbers = numbers.filter { num ->
            !(num in 2020..2035 || num in 1..12 || num in 1..31)
        }
        if (nonDateNumbers.isNotEmpty()) {
            return nonDateNumbers.last()
        }

        // Fallback: just return the largest number
        return numbers.maxOrNull() ?: throw WoorilogException("INVALID_REQUEST", "금액을 찾을 수 없습니다.", HttpStatus.BAD_REQUEST)
    }

    private fun parseBudgetMonth(budgetMonth: String): YearMonth {
        return try {
            YearMonth.parse(budgetMonth)
        } catch (e: DateTimeParseException) {
            throw WoorilogException("INVALID_REQUEST", "올바르지 않은 예산 월 형식입니다. (YYYY-MM)", HttpStatus.BAD_REQUEST)
        }
    }
}

data class CreateTransactionRequest(
    val type: CategoryType,
    val amount: Long,
    val transactionDate: LocalDate,
    val categoryId: Long?,
    val memo: String?,
    val payerUserId: Long?
)

data class QuickTransactionRequest(
    val text: String,
    val transactionDate: LocalDate?
)

data class UpdateTransactionRequest(
    val type: CategoryType,
    val amount: Long,
    val transactionDate: LocalDate,
    val categoryId: Long?,
    val memo: String?,
    val payerUserId: Long?
)

data class TransactionResponse(
    val id: Long,
    val ledgerId: Long,
    val type: CategoryType,
    val amount: Long,
    val transactionDate: LocalDate,
    val category: CategorySummary?,
    val payer: PayerSummary,
    val memo: String?
)

data class CategorySummary(
    val id: Long,
    val name: String,
    val type: CategoryType
)

data class PayerSummary(
    val id: Long,
    val nickname: String
)

fun Transaction.toResponse() = TransactionResponse(
    id = this.id!!,
    ledgerId = this.ledger.id!!,
    type = this.type,
    amount = this.amount,
    transactionDate = this.transactionDate,
    category = this.category?.let { CategorySummary(it.id!!, it.name, it.type) },
    payer = PayerSummary(this.payer.id!!, this.payer.nickname),
    memo = this.memo
)
