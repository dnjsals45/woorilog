package com.woorilog.application.transactionimport.service

import com.woorilog.domain.auth.repository.UserRepository
import com.woorilog.domain.budget.entity.BudgetAllocation
import com.woorilog.domain.budget.entity.BudgetAllocationScope
import com.woorilog.domain.budget.repository.BudgetAllocationRepository
import com.woorilog.domain.budget.repository.BudgetPeriodRepository
import com.woorilog.domain.category.entity.CategoryType
import com.woorilog.domain.category.entity.LedgerCategory
import com.woorilog.domain.category.repository.LedgerCategoryRepository
import com.woorilog.domain.ledger.entity.Ledger
import com.woorilog.domain.ledger.repository.LedgerMemberRepository
import com.woorilog.domain.ledger.repository.LedgerRepository
import com.woorilog.domain.transaction.policy.BudgetScopeType
import com.woorilog.domain.transaction.repository.TransactionRepository
import com.woorilog.domain.transactionimport.entity.ImportCandidate
import com.woorilog.domain.transactionimport.entity.ImportSession
import com.woorilog.domain.transactionimport.entity.ImportSessionStatus
import com.woorilog.domain.transactionimport.entity.ImportSourceType
import com.woorilog.domain.transactionimport.repository.ImportCandidateRepository
import com.woorilog.domain.transactionimport.repository.ImportSessionRepository
import com.woorilog.common.exception.ForbiddenException
import com.woorilog.common.exception.NotFoundException
import com.woorilog.common.exception.WoorilogException
import com.woorilog.infrastructure.external.InvalidTransactionImageException
import com.woorilog.infrastructure.external.OcrProcessingException
import com.woorilog.infrastructure.external.TransactionImageInput
import com.woorilog.infrastructure.external.TransactionImageOcr
import com.woorilog.application.transaction.service.TransactionService
import com.woorilog.application.transaction.command.V1TransactionCommand
import com.woorilog.application.transaction.result.toResult
import com.woorilog.domain.transaction.entity.BudgetSource
import com.woorilog.domain.transaction.entity.V1PaymentMethod
import com.woorilog.application.transactionimport.command.SaveImportCandidateCommand
import com.woorilog.application.transactionimport.command.SaveImportSessionCommand
import com.woorilog.application.transactionimport.result.ImportCandidatePreviewResult
import com.woorilog.application.transactionimport.result.ImportPreviewResult
import com.woorilog.application.transactionimport.result.SaveImportSessionResult
import com.woorilog.application.transactionimport.result.SavedImportCandidateResult
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.Instant
import java.time.LocalDate

@Service
@Transactional(readOnly = true)
class V1TransactionImportService(
    private val ledgerRepository: LedgerRepository,
    private val ledgerMemberRepository: LedgerMemberRepository,
    private val userRepository: UserRepository,
    private val budgetPeriodRepository: BudgetPeriodRepository,
    private val budgetAllocationRepository: BudgetAllocationRepository,
    private val ledgerCategoryRepository: LedgerCategoryRepository,
    private val transactionRepository: TransactionRepository,
    private val importSessionRepository: ImportSessionRepository,
    private val importCandidateRepository: ImportCandidateRepository,
    private val transactionImageOcr: TransactionImageOcr,
    private val transactionService: TransactionService,
    private val clock: Clock,
) {
    @Transactional
    fun preview(
        userId: Long,
        ledgerId: Long,
        images: List<TransactionImageInput>,
    ): ImportPreviewResult {
        val ledger = requireActiveLedger(userId, ledgerId)
        if (images.isEmpty()) invalid("이미지 파일은 필수입니다.")
        val imageSourceTypes = images.map { image ->
            try {
                ImportSourceType.valueOf(image.sourceType ?: invalid("이미지별 가져오기 종류가 필요합니다."))
            } catch (_: IllegalArgumentException) {
                invalid("지원하지 않는 가져오기 종류입니다.")
            }
        }
        val user = userRepository.findByIdOrNull(userId) ?: throw ForbiddenException("사용자를 찾을 수 없습니다.")
        // 세션은 대표값으로 첫 이미지의 sourceType을 저장한다. 실제 판정 기준(중복 판정 등)에는 쓰이지 않고,
        // 후보별 정확한 값은 ImportCandidate.sourceType에 별도로 저장된다.
        val session = importSessionRepository.save(
            ImportSession(ledger, user, imageSourceTypes.first(), expiresAt = clock.instant().plusSeconds(SESSION_TTL_SECONDS))
        )
        val defaultAllocation = currentPersonalAllocation(ledgerId, userId)
        val existingTransactionsByKey = transactionRepository.findByLedgerIdOrderByTransactionDateDescIdDesc(ledgerId)
            .associateBy { duplicateKey(it.transactionDate, it.amount, it.merchant ?: it.memo.orEmpty()) }
        val pendingKeys = mutableSetOf<String>()
        var omitted = 0
        images.forEachIndexed { index, image ->
            val parsed = try {
                TransactionImportTextParser.parse(
                    transactionImageOcr.recognize(image, LocalDate.now(clock)).text,
                    LocalDate.now(clock),
                )
            } catch (_: InvalidTransactionImageException) {
                omitted += 1
                return@forEachIndexed
            } catch (_: OcrProcessingException) {
                omitted += 1
                return@forEachIndexed
            }
            omitted += if (parsed.candidates.isEmpty()) 1 else parsed.nonBlankLineCount - parsed.candidates.size
            parsed.candidates.forEach { candidate ->
                val merchant = candidate.memo.trim()
                if (candidate.amount <= 0 || merchant.isBlank()) {
                    omitted += 1
                    return@forEach
                }
                val key = duplicateKey(candidate.transactionDate, candidate.amount, merchant)
                val existingMatch = existingTransactionsByKey[key]
                val duplicate = existingMatch != null || !pendingKeys.add(key)
                val suggestedCategory = suggestedCategory(ledgerId, userId, merchant)
                    ?: ledgerCategoryRepository.findByLedgerIdOrderBySortOrderAsc(ledgerId)
                        .firstOrNull { it.type == CategoryType.EXPENSE && it.active }
                importCandidateRepository.save(
                    ImportCandidate(
                        importSession = session,
                        occurredOn = candidate.transactionDate,
                        amount = candidate.amount,
                        merchant = merchant,
                        suggestedCategory = suggestedCategory,
                        suggestedAllocation = defaultAllocation,
                        duplicateSuspected = duplicate,
                        duplicateReason = if (duplicate) "DATE_AMOUNT_MERCHANT" else null,
                        selectedByDefault = !duplicate,
                        sourceType = imageSourceTypes[index],
                        duplicateTransaction = existingMatch,
                    )
                )
            }
        }
        session.omittedCount = omitted
        importSessionRepository.save(session)
        return previewResponse(session)
    }

    @Transactional
    fun save(userId: Long, ledgerId: Long, request: SaveImportSessionCommand): SaveImportSessionResult {
        val session = importSessionRepository.findByIdOrNull(request.sessionId) ?: throw expired()
        if (session.ledger.id != ledgerId || session.uploadedBy.id != userId) expired()
        requireActiveLedger(userId, ledgerId)
        if (session.status == ImportSessionStatus.SAVED) return savedResponse(session)
        if (session.expiresAt <= clock.instant()) {
            session.status = ImportSessionStatus.EXPIRED
            importSessionRepository.save(session)
            expired()
        }
        if (session.status != ImportSessionStatus.PREVIEWED) expired()

        val stored = importCandidateRepository.findByImportSessionIdOrderById(session.id!!).associateBy { it.id!! }
        if (request.candidates.isEmpty() || request.candidates.map { it.candidateId }.distinct().size != request.candidates.size) {
            invalidCandidate("저장할 후보를 올바르게 선택해주세요.")
        }
        val selected = request.candidates.filter { it.selected }
        selected.forEach { input ->
            val candidate = stored[input.candidateId] ?: invalidCandidate("세션에 없는 후보입니다.")
            validateInput(ledgerId, userId, candidate, input)
        }

        selected.forEach { input ->
            val candidate = stored.getValue(input.candidateId)
            val source = input.budgetSource
            val transaction = transactionService.createV1Transaction(
                userId,
                ledgerId,
                V1TransactionCommand(
                    type = CategoryType.EXPENSE,
                    amount = input.amount,
                    occurredOn = input.occurredOn,
                    merchant = input.merchant.trim(),
                    categoryId = input.categoryId,
                    memo = null,
                    transferType = null,
                    scope = source,
                    budgetSource = source,
                    sharedWithPartner = input.sharedWithPartner,
                    paymentMethod = input.paymentMethod,
                    occurredAt = null,
                ),
            )
            candidate.generatedTransaction = transactionRepository.getReferenceById(transaction.id)
            importCandidateRepository.save(candidate)
        }
        session.status = ImportSessionStatus.SAVED
        importSessionRepository.save(session)
        return savedResponse(session)
    }

    private fun validateInput(ledgerId: Long, userId: Long, candidate: ImportCandidate, input: SaveImportCandidateCommand) {
        if (input.amount <= 0 || input.merchant.trim().isBlank() || input.categoryId == null) invalidCandidate("후보의 필수값이 없습니다.")
        val category = ledgerCategoryRepository.findByIdOrNull(input.categoryId)
        if (category == null || category.ledger.id != ledgerId || !category.active || category.type != CategoryType.EXPENSE) invalidCandidate("거래에 사용할 수 없는 카테고리입니다.")
        val source = input.budgetSource ?: invalidCandidate("차감 예산이 필요합니다.")
        if (source.type == BudgetScopeType.PERSONAL && source.ownerUserId != userId) {
            throw ForbiddenException("상대방 개인 예산은 사용할 수 없습니다.")
        }
        if (source.type == BudgetScopeType.SHARED && source.ownerUserId != null) invalidCandidate("공동 예산 형식이 올바르지 않습니다.")
        if (candidate.importSession.id == null) invalidCandidate("세션 후보가 올바르지 않습니다.")
    }

    private fun currentPersonalAllocation(ledgerId: Long, userId: Long): BudgetAllocation? {
        val today = LocalDate.now(clock)
        val period = budgetPeriodRepository.findFirstByLedgerIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(ledgerId, today, today)
            ?: return null
        return budgetAllocationRepository.findByBudgetPeriodIdAndScopeAndOwnerId(period.id!!, BudgetAllocationScope.PERSONAL, userId)
    }

    private fun suggestedCategory(ledgerId: Long, userId: Long, merchant: String): LedgerCategory? {
        val normalized = normalizeMerchant(merchant)
        return transactionRepository.findByLedgerIdOrderByTransactionDateDescIdDesc(ledgerId)
            .firstOrNull { it.payer.id == userId && normalizeMerchant(it.merchant ?: it.memo.orEmpty()) == normalized && it.category?.active == true }
            ?.category
    }

    private fun previewResponse(session: ImportSession): ImportPreviewResult = ImportPreviewResult(
        sessionId = session.id!!,
        expiresAt = session.expiresAt,
        omittedCount = session.omittedCount,
        candidates = importCandidateRepository.findByImportSessionIdOrderById(session.id!!).map { candidate ->
            ImportCandidatePreviewResult(
                candidateId = candidate.id!!,
                amount = candidate.amount,
                occurredOn = candidate.occurredOn,
                merchant = candidate.merchant,
                suggestedCategoryId = candidate.suggestedCategory?.id,
                defaultBudgetSource = candidate.suggestedAllocation?.let { BudgetSource(BudgetScopeType.valueOf(it.scope.name), it.owner?.id) },
                duplicateSuspected = candidate.duplicateSuspected,
                duplicateReason = candidate.duplicateReason,
                duplicateTransactionId = candidate.duplicateTransaction?.id,
                selectedByDefault = candidate.selectedByDefault,
                sourceType = candidate.sourceType,
            )
        },
    )

    private fun savedResponse(session: ImportSession): SaveImportSessionResult = SaveImportSessionResult(
        created = importCandidateRepository.findByImportSessionIdOrderById(session.id!!)
            .mapNotNull { candidate -> candidate.generatedTransaction?.let { SavedImportCandidateResult(candidate.id!!, it.toResult()) } },
    )

    private fun requireActiveLedger(userId: Long, ledgerId: Long): Ledger {
        val ledger = ledgerRepository.findByIdOrNull(ledgerId) ?: throw NotFoundException("장부를 찾을 수 없습니다.")
        if (ledgerMemberRepository.findFirstByLedgerIdAndUserIdAndLeftAtIsNullOrderByJoinedAtDesc(ledgerId, userId) == null) {
            throw ForbiddenException("활성 장부 멤버만 사용할 수 있습니다.")
        }
        return ledger
    }

    private fun duplicateKey(date: LocalDate, amount: Long, merchant: String) = "$date:$amount:${normalizeMerchant(merchant)}"
    private fun normalizeMerchant(value: String) = value.lowercase().filter { it.isLetterOrDigit() }
    private fun invalid(message: String): Nothing = throw WoorilogException("INVALID_REQUEST", message, HttpStatus.BAD_REQUEST)
    private fun invalidCandidate(message: String): Nothing = throw WoorilogException("INVALID_IMPORT_CANDIDATE", message, HttpStatus.BAD_REQUEST)
    private fun expired(): Nothing = throw WoorilogException("IMPORT_SESSION_EXPIRED", "가져오기 세션이 만료되었거나 사용할 수 없습니다.", HttpStatus.GONE)

    private companion object { const val SESSION_TTL_SECONDS = 30 * 60L }
}
