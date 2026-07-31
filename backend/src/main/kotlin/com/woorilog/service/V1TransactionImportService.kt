package com.woorilog.service

import com.woorilog.domain.*
import com.woorilog.exception.ForbiddenException
import com.woorilog.exception.NotFoundException
import com.woorilog.exception.WoorilogException
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
        sourceType: String,
        images: List<TransactionImageInput>,
    ): ImportPreviewResponse {
        val ledger = requireActiveLedger(userId, ledgerId)
        if (images.isEmpty()) invalid("이미지 파일은 필수입니다.")
        val type = try {
            ImportSourceType.valueOf(sourceType)
        } catch (_: IllegalArgumentException) {
            invalid("지원하지 않는 가져오기 종류입니다.")
        }
        val user = userRepository.findById(userId).orElseThrow { ForbiddenException("사용자를 찾을 수 없습니다.") }
        val session = importSessionRepository.save(
            ImportSession(ledger, user, type, expiresAt = clock.instant().plusSeconds(SESSION_TTL_SECONDS))
        )
        val defaultAllocation = currentPersonalAllocation(ledgerId, userId)
        val existingKeys = transactionRepository.findByLedgerIdOrderByTransactionDateDescIdDesc(ledgerId)
            .map { duplicateKey(it.transactionDate, it.amount, it.merchant ?: it.memo.orEmpty()) }
            .toMutableSet()
        val pendingKeys = mutableSetOf<String>()
        var omitted = 0
        images.forEach { image ->
            val parsed = try {
                TransactionImportTextParser.parse(
                    transactionImageOcr.recognize(image, LocalDate.now(clock)).text,
                    LocalDate.now(clock),
                )
            } catch (_: InvalidTransactionImageException) {
                omitted += 1
                return@forEach
            } catch (_: OcrProcessingException) {
                omitted += 1
                return@forEach
            }
            omitted += if (parsed.candidates.isEmpty()) 1 else parsed.nonBlankLineCount - parsed.candidates.size
            parsed.candidates.forEach { candidate ->
                val merchant = candidate.memo.trim()
                if (candidate.amount <= 0 || merchant.isBlank()) {
                    omitted += 1
                    return@forEach
                }
                val key = duplicateKey(candidate.transactionDate, candidate.amount, merchant)
                val duplicate = key in existingKeys || !pendingKeys.add(key)
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
                    )
                )
            }
        }
        session.omittedCount = omitted
        importSessionRepository.save(session)
        return previewResponse(session)
    }

    @Transactional
    fun save(userId: Long, ledgerId: Long, request: SaveImportSessionRequest): SaveImportSessionResponse {
        val session = importSessionRepository.findById(request.sessionId).orElseThrow { expired() }
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
                V1TransactionRequest(
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

    private fun validateInput(ledgerId: Long, userId: Long, candidate: ImportCandidate, input: SaveImportCandidateRequest) {
        if (input.amount <= 0 || input.merchant.trim().isBlank() || input.categoryId == null) invalidCandidate("후보의 필수값이 없습니다.")
        val category = ledgerCategoryRepository.findById(input.categoryId).orElse(null)
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

    private fun previewResponse(session: ImportSession): ImportPreviewResponse = ImportPreviewResponse(
        sessionId = session.id!!,
        expiresAt = session.expiresAt,
        omittedCount = session.omittedCount,
        candidates = importCandidateRepository.findByImportSessionIdOrderById(session.id!!).map { candidate ->
            ImportCandidatePreview(
                candidateId = candidate.id!!,
                amount = candidate.amount,
                occurredOn = candidate.occurredOn,
                merchant = candidate.merchant,
                suggestedCategoryId = candidate.suggestedCategory?.id,
                defaultBudgetSource = candidate.suggestedAllocation?.let { BudgetSource(BudgetScopeType.valueOf(it.scope.name), it.owner?.id) },
                duplicateSuspected = candidate.duplicateSuspected,
                duplicateReason = candidate.duplicateReason,
                selectedByDefault = candidate.selectedByDefault,
            )
        },
    )

    private fun savedResponse(session: ImportSession): SaveImportSessionResponse = SaveImportSessionResponse(
        created = importCandidateRepository.findByImportSessionIdOrderById(session.id!!)
            .mapNotNull { candidate -> candidate.generatedTransaction?.let { SavedImportCandidate(candidate.id!!, it.toResponse()) } },
    )

    private fun requireActiveLedger(userId: Long, ledgerId: Long): Ledger {
        val ledger = ledgerRepository.findById(ledgerId).orElseThrow { NotFoundException("장부를 찾을 수 없습니다.") }
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

data class ImportPreviewResponse(val sessionId: Long, val expiresAt: Instant, val omittedCount: Int, val candidates: List<ImportCandidatePreview>)
data class ImportCandidatePreview(val candidateId: Long, val amount: Long, val occurredOn: LocalDate, val merchant: String, val suggestedCategoryId: Long?, val defaultBudgetSource: BudgetSource?, val duplicateSuspected: Boolean, val duplicateReason: String?, val selectedByDefault: Boolean)
data class SaveImportSessionRequest(val sessionId: Long, val candidates: List<SaveImportCandidateRequest>)
data class SaveImportCandidateRequest(val candidateId: Long, val amount: Long, val occurredOn: LocalDate, val merchant: String, val categoryId: Long?, val budgetSource: BudgetSource?, val selected: Boolean = true, val paymentMethod: V1PaymentMethod? = null, val sharedWithPartner: Boolean? = null)
data class SaveImportSessionResponse(val created: List<SavedImportCandidate>)
data class SavedImportCandidate(val candidateId: Long, val transaction: TransactionResponse)
