package com.woorilog.service

import com.woorilog.domain.*
import com.woorilog.exception.ForbiddenException
import com.woorilog.exception.NotFoundException
import com.woorilog.exception.WoorilogException
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDate
import java.time.YearMonth

@Service
@Transactional
class RecurringTransactionService(
    private val ledgerRepository: LedgerRepository,
    private val ledgerMemberRepository: LedgerMemberRepository,
    private val ledgerCategoryRepository: LedgerCategoryRepository,
    private val userRepository: UserRepository,
    private val transactionRepository: TransactionRepository,
    private val templateRepository: RecurringTransactionTemplateRepository,
    private val generationRepository: RecurringTransactionGenerationRepository,
    private val ledgerMonthRepository: LedgerMonthRepository,
    private val clock: Clock,
) {

    fun createTemplate(userId: Long, ledgerId: Long, request: CreateRecurringTemplateRequest): RecurringTransactionTemplateResponse {
        val ledger = ledgerRepository.findById(ledgerId).orElseThrow {
            NotFoundException("장부를 찾을 수 없습니다.")
        }
        // Validate current user access
        ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")

        // Validate positive amount
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

        // Validate start/end date order
        if (request.endDate != null && request.startDate.isAfter(request.endDate)) {
            throw WoorilogException("INVALID_REQUEST", "시작일은 종료일보다 이전이어야 합니다.", HttpStatus.BAD_REQUEST)
        }

        val template = RecurringTransactionTemplate(
            ledger = ledger,
            payer = payerUser,
            category = category,
            type = request.type,
            amount = request.amount,
            memo = request.memo,
            frequency = request.frequency,
            startDate = request.startDate,
            nextDueDate = request.startDate, // nextDueDate derived from startDate on create
            endDate = request.endDate,
            paused = false
        )

        val saved = templateRepository.save(template)
        generateTransactionsForLedger(ledgerId, request.startDate)
        return saved.toResponse()
    }

    @Transactional(readOnly = true)
    fun getTemplates(userId: Long, ledgerId: Long): List<RecurringTransactionTemplateResponse> {
        val ledger = ledgerRepository.findById(ledgerId).orElseThrow {
            NotFoundException("장부를 찾을 수 없습니다.")
        }
        ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")

        return templateRepository.findByLedgerIdOrderByIdDesc(ledgerId).map { it.toResponse() }
    }

    fun updateTemplate(userId: Long, templateId: Long, request: UpdateRecurringTemplateRequest): RecurringTransactionTemplateResponse {
        val template = templateRepository.findById(templateId).orElseThrow {
            NotFoundException("반복 거래 템플릿을 찾을 수 없습니다.")
        }
        val ledgerId = template.ledger.id!!

        // Validate member access to template ledger
        ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")

        // Validate positive amount
        if (request.amount <= 0) {
            throw WoorilogException("INVALID_REQUEST", "금액은 양수여야 합니다.", HttpStatus.BAD_REQUEST)
        }

        // Resolve payer
        val payerUser = request.payerUserId?.let { payerUserId ->
            userRepository.findById(payerUserId).orElseThrow {
                NotFoundException("결제자를 찾을 수 없습니다.")
            }
        } ?: template.payer
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

        // Validate start/end date order
        if (request.endDate != null && request.startDate.isAfter(request.endDate)) {
            throw WoorilogException("INVALID_REQUEST", "시작일은 종료일보다 이전이어야 합니다.", HttpStatus.BAD_REQUEST)
        }

        // Reset nextDueDate to startDate if startDate or frequency changed
        if (template.startDate != request.startDate || template.frequency != request.frequency) {
            template.nextDueDate = request.startDate
        }

        template.type = request.type
        template.amount = request.amount
        template.category = category
        template.payer = payerUser
        template.memo = request.memo
        template.frequency = request.frequency
        template.startDate = request.startDate
        template.endDate = request.endDate

        val saved = templateRepository.save(template)
        return saved.toResponse()
    }

    fun deleteTemplate(userId: Long, templateId: Long) {
        val template = templateRepository.findById(templateId).orElseThrow {
            NotFoundException("반복 거래 템플릿을 찾을 수 없습니다.")
        }
        ledgerMemberRepository.findByLedgerIdAndUserId(template.ledger.id!!, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")

        generationRepository.deleteByTemplateId(templateId)
        templateRepository.delete(template)
    }

    fun pauseTemplate(userId: Long, templateId: Long): RecurringTransactionTemplateResponse {
        val template = templateRepository.findById(templateId).orElseThrow {
            NotFoundException("반복 거래 템플릿을 찾을 수 없습니다.")
        }
        ledgerMemberRepository.findByLedgerIdAndUserId(template.ledger.id!!, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")

        template.paused = true
        val saved = templateRepository.save(template)
        return saved.toResponse()
    }

    fun resumeTemplate(userId: Long, templateId: Long): RecurringTransactionTemplateResponse {
        val template = templateRepository.findById(templateId).orElseThrow {
            NotFoundException("반복 거래 템플릿을 찾을 수 없습니다.")
        }
        ledgerMemberRepository.findByLedgerIdAndUserId(template.ledger.id!!, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")

        template.paused = false
        val saved = templateRepository.save(template)
        return saved.toResponse()
    }

    @Transactional(readOnly = true)
    fun getDueTemplates(userId: Long, ledgerId: Long, asOf: LocalDate): List<RecurringTransactionDueResponse> {
        val ledger = ledgerRepository.findById(ledgerId).orElseThrow {
            NotFoundException("장부를 찾을 수 없습니다.")
        }
        ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")

        val activeTemplates = templateRepository.findByLedgerIdAndPausedFalse(ledgerId)
        val dueResponses = mutableListOf<RecurringTransactionDueResponse>()

        for (template in activeTemplates) {
            var currentDueDate = template.nextDueDate
            while (currentDueDate <= asOf && (template.endDate == null || currentDueDate <= template.endDate)) {
                dueResponses.add(RecurringTransactionDueResponse(template.toResponse(), currentDueDate))
                currentDueDate = when (template.frequency) {
                    RecurringFrequency.WEEKLY -> currentDueDate.plusWeeks(1)
                    RecurringFrequency.MONTHLY -> currentDueDate.plusMonths(1)
                }
            }
        }

        // Sort occurrences deterministically for query consistency
        dueResponses.sortWith(compareBy({ it.dueDate }, { it.template.id }))
        return dueResponses
    }

    fun generateTransactions(userId: Long, ledgerId: Long, asOf: LocalDate): List<TransactionResponse> {
        val ledger = ledgerRepository.findById(ledgerId).orElseThrow {
            NotFoundException("장부를 찾을 수 없습니다.")
        }
        ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")

        return generateTransactionsForLedger(ledgerId, asOf)
    }

    fun generateDueTransactions() {
        val asOf = LocalDate.now(clock)
        templateRepository.findByPausedFalse()
            .map { it.ledger.id!! }
            .distinct()
            .forEach { ledgerId -> generateTransactionsForLedger(ledgerId, asOf) }
    }

    private fun generateTransactionsForLedger(ledgerId: Long, asOf: LocalDate): List<TransactionResponse> {
        val activeTemplates = templateRepository.findByLedgerIdAndPausedFalse(ledgerId)
        val generatedResponses = mutableListOf<TransactionResponse>()

        for (template in activeTemplates) {
            var currentDueDate = template.nextDueDate
            val occurrencesToGenerate = mutableListOf<LocalDate>()
            while (currentDueDate <= asOf && (template.endDate == null || currentDueDate <= template.endDate)) {
                occurrencesToGenerate.add(currentDueDate)
                currentDueDate = when (template.frequency) {
                    RecurringFrequency.WEEKLY -> currentDueDate.plusWeeks(1)
                    RecurringFrequency.MONTHLY -> currentDueDate.plusMonths(1)
                }
            }

            if (occurrencesToGenerate.isNotEmpty()) {
                for (occurrence in occurrencesToGenerate) {
                    if (ledgerMonthRepository.findByLedgerIdAndBudgetMonth(ledgerId, YearMonth.from(occurrence).toString())?.closed == true) {
                        throw WoorilogException("MONTH_CLOSED", "마감된 월에는 반복 거래를 생성할 수 없습니다.", HttpStatus.CONFLICT)
                    }
                    val exists = generationRepository.existsByTemplateIdAndGeneratedDate(template.id!!, occurrence)
                    if (!exists) {
                        val transaction = Transaction(
                            ledger = template.ledger,
                            category = template.category,
                            payer = template.payer,
                            type = template.type,
                            amount = template.amount,
                            transactionDate = occurrence,
                            memo = template.memo
                        )
                        val savedTx = transactionRepository.save(transaction)

                        val generation = RecurringTransactionGeneration(
                            template = template,
                            generatedDate = occurrence,
                            transaction = savedTx
                        )
                        generationRepository.save(generation)

                        generatedResponses.add(savedTx.toResponse())
                    }
                }
                template.nextDueDate = currentDueDate
                templateRepository.save(template)
            }
        }

        return generatedResponses
    }
}

data class CreateRecurringTemplateRequest(
    val type: CategoryType,
    val amount: Long,
    val categoryId: Long?,
    val memo: String?,
    val payerUserId: Long?,
    val frequency: RecurringFrequency,
    val startDate: LocalDate,
    val endDate: LocalDate?
)

data class UpdateRecurringTemplateRequest(
    val type: CategoryType,
    val amount: Long,
    val categoryId: Long?,
    val memo: String?,
    val payerUserId: Long?,
    val frequency: RecurringFrequency,
    val startDate: LocalDate,
    val endDate: LocalDate?
)

data class RecurringTransactionTemplateResponse(
    val id: Long,
    val ledgerId: Long,
    val type: CategoryType,
    val amount: Long,
    val category: CategorySummary?,
    val payer: PayerSummary,
    val memo: String?,
    val frequency: RecurringFrequency,
    val startDate: LocalDate,
    val nextDueDate: LocalDate,
    val endDate: LocalDate?,
    val paused: Boolean
)

data class RecurringTransactionDueResponse(
    val template: RecurringTransactionTemplateResponse,
    val dueDate: LocalDate
)

fun RecurringTransactionTemplate.toResponse() = RecurringTransactionTemplateResponse(
    id = this.id!!,
    ledgerId = this.ledger.id!!,
    type = this.type,
    amount = this.amount,
    category = this.category?.let { CategorySummary(it.id!!, it.name, it.type) },
    payer = PayerSummary(this.payer.id!!, this.payer.nickname),
    memo = this.memo,
    frequency = this.frequency,
    startDate = this.startDate,
    nextDueDate = this.nextDueDate,
    endDate = this.endDate,
    paused = this.paused
)
