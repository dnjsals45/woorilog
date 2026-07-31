package com.woorilog.service

import com.woorilog.domain.*
import com.woorilog.exception.ForbiddenException
import com.woorilog.exception.NotFoundException
import com.woorilog.exception.WoorilogException
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.Clock
import java.time.YearMonth
import java.time.format.DateTimeParseException
import java.util.UUID

@Service
@Transactional
class TransactionService(
    private val ledgerRepository: LedgerRepository,
    private val ledgerMemberRepository: LedgerMemberRepository,
    private val ledgerCategoryRepository: LedgerCategoryRepository,
    private val cardRepository: CardRepository,
    private val userRepository: UserRepository,
    private val transactionRepository: TransactionRepository,
    private val recurringTransactionGenerationRepository: RecurringTransactionGenerationRepository,
    private val ledgerMonthRepository: LedgerMonthRepository,
    private val notificationService: NotificationService,
    private val budgetPeriodRepository: BudgetPeriodRepository,
    private val budgetAllocationRepository: BudgetAllocationRepository,
    private val preferenceRepository: LedgerUserPreferenceRepository,
    private val scheduledPlanService: ScheduledPlanService,
    private val budgetAutomationService: BudgetAutomationService,
    private val clock: Clock,
) {

    /** Target V1 path.  Legacy requests continue through [createTransaction]. */
    fun createV1Transaction(userId: Long, ledgerId: Long, request: V1TransactionRequest): TransactionResponse {
        val ledger = requireActiveLedger(userId, ledgerId)
        requirePositive(request.amount)
        if (request.merchant.isBlank() || request.categoryId == null) invalid("V1 거래에는 사용처와 카테고리가 필요합니다.")
        val type = request.type
        val effect = try { TransactionPolicy.aggregationEffect(type.toLedgerType(), request.transferType) }
        catch (_: IllegalArgumentException) { invalid("거래 유형과 이체 유형이 올바르지 않습니다.") }
        val category = categoryFor(ledgerId, request.categoryId, type)
        val actor = userRepository.findById(userId).orElseThrow { ForbiddenException("사용자를 찾을 수 없습니다.") }
        val payer = request.payerUserId?.let { payerId ->
            ledgerMemberRepository.findFirstByLedgerIdAndUserIdAndLeftAtIsNullOrderByJoinedAtDesc(ledgerId, payerId)
                ?: throw ForbiddenException("활성 멤버만 결제자로 지정할 수 있습니다.")
            userRepository.findById(payerId).orElseThrow { NotFoundException("결제자를 찾을 수 없습니다.") }
        } ?: actor
        val period = budgetPeriodRepository.findFirstByLedgerIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(ledgerId, request.occurredOn, request.occurredOn)
            ?: throw WoorilogException("BUDGET_PERIOD_NOT_FOUND", "거래일의 예산 기간을 찾을 수 없습니다.", HttpStatus.CONFLICT)
        val scope = request.scope ?: if (ledger.type == LedgerType.GROUP) BudgetSource(BudgetScopeType.PERSONAL, userId) else BudgetSource(BudgetScopeType.PERSONAL, userId)
        val allocation = if (effect == TransactionAggregationEffect.EXPENSE) {
            val source = request.budgetSource ?: invalid("지출 거래에는 차감 예산이 필요합니다.")
            if (source != scope) invalid("거래 범위와 차감 예산은 같아야 합니다.")
            allocationFor(period, source, userId)
        } else {
            if (request.budgetSource != null) invalid("이 거래에는 차감 예산을 지정할 수 없습니다.")
            null
        }
        if (scope.type == BudgetScopeType.PERSONAL && scope.ownerUserId != userId) throw ForbiddenException("본인 개인 예산만 사용할 수 있습니다.")
        if (scope.type == BudgetScopeType.SHARED && ledger.type != LedgerType.GROUP) invalid("개인 장부에는 공동 예산이 없습니다.")
        val payment = resolveV1Payment(request.paymentMethod)
        request.installment?.let { installment ->
            if (type != CategoryType.EXPENSE || payment.first != PaymentMethod.CARD) {
                invalid("할부는 카드 지출 거래에서만 사용할 수 있습니다.")
            }
            val source = request.budgetSource ?: invalid("할부 거래에는 차감 예산이 필요합니다.")
            return scheduledPlanService.createInstallmentAndGenerateFirst(
                userId,
                ledgerId,
                InstallmentPlanRequest(
                    name = request.merchant.trim(),
                    totalPrincipal = request.amount,
                    months = installment.months,
                    monthlyInterest = installment.monthlyInterest,
                    merchant = request.merchant.trim(),
                    memo = request.memo,
                    categoryId = category.id!!,
                    budgetSource = source,
                    firstDueDate = request.occurredOn,
                    paymentMethod = request.paymentMethod,
                ),
            ).firstTransaction.toResponse()
        }
        val shared = if (scope.type == BudgetScopeType.SHARED) null else request.sharedWithPartner
            ?: preferenceRepository.findByLedgerIdAndUserId(ledgerId, userId)?.shareNewPersonalTransactions ?: false
        val transaction = Transaction(ledger, category, payer, type, request.amount, request.occurredOn, request.memo,
            payment.first, null, recorder = actor, budgetAllocation = allocation, transferType = request.transferType,
            merchant = request.merchant.trim(), occurredAt = request.occurredAt, scopeType = scope.type,
            scopeOwnerUserId = scope.ownerUserId, sharedWithPartner = shared, lastModifiedBy = actor,
            categoryGroupCode = category.categoryGroup.code, categoryGroupName = category.categoryGroup.name,
            categoryName = category.name, paymentMethodType = payment.first, paymentMethodDisplayName = payment.second)
        val saved = transactionRepository.save(transaction)
        preferenceRepository.save(preferenceRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: LedgerUserPreference(ledger, actor)).also { it.lastBudgetScope = allocation?.scope; it.lastBudgetOwnerUserId = allocation?.owner?.id }
        budgetAutomationService.evaluatePeriod(period.id!!)
        return saved.toResponse()
    }

    @Transactional(readOnly = true)
    fun listV1Transactions(userId: Long, ledgerId: Long, request: V1TransactionListRequest): V1TransactionListResponse {
        val membership = requireLedgerReader(userId, ledgerId)
        val visible = transactionRepository.findByLedgerIdOrderByTransactionDateDescIdDesc(ledgerId).asSequence()
            .filter { visibleInList(it, userId, membership) }
            .filter { request.periodStart == null || it.budgetAllocation?.budgetPeriod?.startDate == request.periodStart }
            .filter { request.types.isEmpty() || it.type.toLedgerType() in request.types }
            .filter { request.categoryGroupCodes.isEmpty() || it.categoryGroupCode in request.categoryGroupCodes }
            .filter { request.scopes.isEmpty() || it.scopeType in request.scopes }
            .filter { request.kinds.isEmpty() || transactionKind(it) in request.kinds }
            .filter { request.shared == null || it.sharedWithPartner == request.shared }
            .filter { !request.unclassified || it.category == null }
            .filter { request.query.isNullOrBlank() || listOfNotNull(it.merchant, it.memo).any { text -> text.contains(request.query!!, true) } }
            .dropWhile { request.cursor?.toLongOrNull()?.let { id -> it.id!! >= id } ?: false }
            .take(request.limit.coerceIn(1, 100) + 1).toList()
        val hasNext = visible.size > request.limit.coerceIn(1, 100)
        val items = if (hasNext) visible.dropLast(1) else visible
        val allVisible = transactionRepository.findByLedgerIdOrderByTransactionDateDescIdDesc(ledgerId).filter { visibleInList(it, userId, membership) }
        return V1TransactionListResponse(items.map { it.toResponse() }, if (hasNext) items.last().id.toString() else null, allVisible.count { it.category == null })
    }

    fun updateVisibility(userId: Long, transactionId: Long, shared: Boolean): TransactionResponse {
        val transaction = transactionRepository.findById(transactionId).orElseThrow { NotFoundException("거래를 찾을 수 없습니다.") }
        requireActiveLedger(userId, transaction.ledger.id!!)
        if (transaction.scopeType != BudgetScopeType.PERSONAL || transaction.payer.id != userId) throw ForbiddenException("본인 개인 거래만 공개 설정을 바꿀 수 있습니다.")
        transaction.sharedWithPartner = shared; transaction.lastModifiedBy = transaction.payer
        return transactionRepository.save(transaction).toResponse()
    }

    fun updateV1Transaction(userId: Long, transactionId: Long, request: V1TransactionRequest): TransactionResponse {
        val transaction = transactionRepository.findById(transactionId).orElseThrow { NotFoundException("거래를 찾을 수 없습니다.") }
        val ledger = requireActiveLedger(userId, transaction.ledger.id!!)
        if (!canModify(transaction, userId)) throw ForbiddenException("이 거래를 수정할 권한이 없습니다.")
        if (transaction.scheduledPlan != null) invalid("자동 생성 거래는 예약 거래 설정에서 수정해주세요.")
        requirePositive(request.amount)
        if (request.merchant.isBlank() || request.categoryId == null) invalid("거래에는 사용처와 카테고리가 필요합니다.")
        if (request.installment != null) invalid("기존 거래를 할부 거래로 변경할 수 없습니다.")
        val effect = try { TransactionPolicy.aggregationEffect(request.type.toLedgerType(), request.transferType) }
        catch (_: IllegalArgumentException) { invalid("거래 유형과 이체 유형이 올바르지 않습니다.") }
        val category = categoryFor(ledger.id!!, request.categoryId, request.type)
        val actor = userRepository.findById(userId).orElseThrow { ForbiddenException("사용자를 찾을 수 없습니다.") }
        val payer = request.payerUserId?.let { payerId ->
            ledgerMemberRepository.findFirstByLedgerIdAndUserIdAndLeftAtIsNullOrderByJoinedAtDesc(ledger.id!!, payerId)
                ?: throw ForbiddenException("활성 멤버만 결제자로 지정할 수 있습니다.")
            userRepository.findById(payerId).orElseThrow { NotFoundException("결제자를 찾을 수 없습니다.") }
        } ?: transaction.payer
        val period = budgetPeriodRepository.findFirstByLedgerIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            ledger.id!!, request.occurredOn, request.occurredOn,
        ) ?: throw WoorilogException("BUDGET_PERIOD_NOT_FOUND", "거래일의 예산 기간을 찾을 수 없습니다.", HttpStatus.CONFLICT)
        val scope = request.scope ?: BudgetSource(BudgetScopeType.PERSONAL, userId)
        if (scope.type == BudgetScopeType.PERSONAL && scope.ownerUserId != userId) throw ForbiddenException("본인 개인 예산만 사용할 수 있습니다.")
        if (scope.type == BudgetScopeType.SHARED && ledger.type != LedgerType.GROUP) invalid("개인 장부에는 공동 예산이 없습니다.")
        val allocation = if (effect == TransactionAggregationEffect.EXPENSE) {
            val source = request.budgetSource ?: invalid("지출 거래에는 차감 예산이 필요합니다.")
            if (source != scope) invalid("거래 범위와 차감 예산은 같아야 합니다.")
            allocationFor(period, source, userId)
        } else {
            if (request.budgetSource != null) invalid("이 거래에는 차감 예산을 지정할 수 없습니다.")
            null
        }
        val oldPeriodId = transaction.budgetAllocation?.budgetPeriod?.id
        val payment = resolveV1Payment(request.paymentMethod)
        val shared = if (scope.type == BudgetScopeType.SHARED) null else request.sharedWithPartner
            ?: preferenceRepository.findByLedgerIdAndUserId(ledger.id!!, userId)?.shareNewPersonalTransactions ?: false
        transaction.type = request.type
        transaction.amount = request.amount
        transaction.transactionDate = request.occurredOn
        transaction.occurredAt = request.occurredAt
        transaction.merchant = request.merchant.trim()
        transaction.memo = request.memo
        transaction.category = category
        transaction.categoryGroupCode = category.categoryGroup.code
        transaction.categoryGroupName = category.categoryGroup.name
        transaction.categoryName = category.name
        transaction.payer = payer
        transaction.transferType = request.transferType
        transaction.scopeType = scope.type
        transaction.scopeOwnerUserId = scope.ownerUserId
        transaction.budgetAllocation = allocation
        transaction.sharedWithPartner = shared
        transaction.paymentMethod = payment.first
        transaction.paymentMethodType = payment.first
        transaction.paymentMethodDisplayName = payment.second
        transaction.card = null
        transaction.lastModifiedBy = actor
        val saved = transactionRepository.save(transaction)
        setOfNotNull(oldPeriodId, period.id).forEach(budgetAutomationService::evaluatePeriod)
        return saved.toResponse()
    }
    fun updateSharingDefault(userId: Long, ledgerId: Long, shareNew: Boolean, shareExisting: Boolean): Unit {
        val ledger = requireActiveLedger(userId, ledgerId); val user = userRepository.findById(userId).orElseThrow { ForbiddenException("사용자를 찾을 수 없습니다.") }
        if (shareNew && !shareExisting) invalid("전체 공유를 켤 때 기존 개인 거래 공유를 확인해야 합니다.")
        if (!shareNew && shareExisting) invalid("공유를 끌 때 기존 거래를 변경할 수 없습니다.")
        val preference = preferenceRepository.findByLedgerIdAndUserId(ledgerId, userId) ?: LedgerUserPreference(ledger, user)
        preference.shareNewPersonalTransactions = shareNew; preferenceRepository.save(preference)
        if (shareExisting) transactionRepository.findByLedgerIdOrderByTransactionDateDescIdDesc(ledgerId).filter { it.payer.id == userId && it.scopeType == BudgetScopeType.PERSONAL }.forEach { it.sharedWithPartner = true }
    }
    @Transactional(readOnly = true)
    fun entryDefaults(userId: Long, ledgerId: Long): TransactionEntryDefaultsResponse {
        val ledger = requireActiveLedger(userId, ledgerId); val pref = preferenceRepository.findByLedgerIdAndUserId(ledgerId, userId)
        return TransactionEntryDefaultsResponse(BudgetSource(pref?.lastBudgetScope?.toBudgetScopeType() ?: BudgetScopeType.PERSONAL, pref?.lastBudgetOwnerUserId ?: userId), pref?.shareNewPersonalTransactions ?: false)
    }
    @Transactional(readOnly = true)
    fun merchantSuggestions(userId: Long, ledgerId: Long, query: String): MerchantSuggestionsResponse {
        requireActiveLedger(userId, ledgerId)
        if (query.trim().isEmpty()) invalid("사용처 검색어는 한 글자 이상이어야 합니다.")
        return MerchantSuggestionsResponse(transactionRepository.findByLedgerIdOrderByTransactionDateDescIdDesc(ledgerId).asSequence().filter { it.payer.id == userId && it.merchant?.contains(query.trim(), true) == true }.mapNotNull { it.merchant?.let { name -> MerchantSuggestion(name, it.category?.id) } }.distinctBy { it.merchant }.take(20).toList())
    }
    fun bulkClassify(userId: Long, ledgerId: Long, ids: List<Long>, categoryId: Long): BulkClassifyResponse {
        requireActiveLedger(userId, ledgerId); if (ids.size !in 1..100 || ids.distinct().size != ids.size) invalid("거래 ID는 1개에서 100개까지 입력해야 합니다.")
        val category = categoryFor(ledgerId, categoryId, null); val transactions = ids.map { transactionRepository.findById(it).orElseThrow { NotFoundException("거래를 찾을 수 없습니다.") } }
        if (transactions.any { it.ledger.id != ledgerId || !canModify(it, userId) }) throw ForbiddenException("모든 거래의 수정 권한이 필요합니다.")
        if (transactions.any { it.type != category.type }) invalid("거래 유형과 카테고리 유형이 일치하지 않습니다.")
        transactions.forEach { it.category = category; it.categoryGroupCode = category.categoryGroup.code; it.categoryGroupName = category.categoryGroup.name; it.categoryName = category.name }
        transactionRepository.saveAll(transactions)
        transactions.mapNotNull { it.budgetAllocation?.budgetPeriod?.id }.distinct().forEach(budgetAutomationService::evaluatePeriod)
        return BulkClassifyResponse(ids)
    }

    fun createTransaction(userId: Long, ledgerId: Long, request: CreateTransactionRequest): TransactionResponse {
        val ledger = ledgerRepository.findById(ledgerId).orElseThrow {
            NotFoundException("장부를 찾을 수 없습니다.")
        }
        // Verify user is a member
        ledgerMemberRepository.findByLedgerIdAndUserId(ledgerId, userId)
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")
        if (request.amount <= 0) {
            throw WoorilogException("INVALID_REQUEST", "금액은 양수여야 합니다.", HttpStatus.BAD_REQUEST)
        }
        val payment = resolvePayment(ledgerId, request.type, request.paymentMethod, request.cardId)
        val installmentMonths = validateInstallmentMonths(request.type, request.installmentMonths, payment.method)
        (0 until installmentMonths).forEach { installmentIndex ->
            ensureMonthIsOpen(ledgerId, request.transactionDate.plusMonths(installmentIndex.toLong()))
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

        val installmentPlanId = if (installmentMonths > 1) UUID.randomUUID().toString() else null
        val baseAmount = request.amount / installmentMonths
        val remainder = request.amount % installmentMonths
        val transactions = (0 until installmentMonths).map { installmentIndex ->
            Transaction(
                ledger = ledger,
                category = category,
                payer = payerUser,
                type = request.type,
                amount = baseAmount + if (installmentIndex < remainder) 1 else 0,
                transactionDate = request.transactionDate.plusMonths(installmentIndex.toLong()),
                memo = request.memo,
                paymentMethod = payment.method,
                card = payment.card,
                installmentPlanId = installmentPlanId,
                installmentSequence = installmentIndex + 1,
                installmentTotalCount = installmentMonths,
            )
        }
        val saved = transactionRepository.saveAll(transactions)
        saved.forEach { notifyBudgetIfExceeded(ledgerId, it.transactionDate) }
        return saved.first().toResponse()
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

        val transactionDate = request.transactionDate ?: LocalDate.now(clock)
        ensureMonthIsOpen(ledgerId, transactionDate)

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
        notifyBudgetIfExceeded(ledgerId, transactionDate)
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
        requireLedgerReader(userId, transaction.ledger.id!!)
        val allowed = transaction.scopeType == BudgetScopeType.SHARED || transaction.payer.id == userId || transaction.sharedWithPartner == true
        if (!allowed) throw NotFoundException("거래를 찾을 수 없습니다.")
        val response = transaction.toResponse()
        return if (transaction.payer.id != userId && transaction.scopeType == BudgetScopeType.PERSONAL) response.copy(
            paymentMethod = response.paymentMethod?.copy(displayName = null), card = null,
        ) else response
    }

    fun updateTransaction(userId: Long, transactionId: Long, request: UpdateTransactionRequest): TransactionResponse {
        val transaction = transactionRepository.findById(transactionId).orElseThrow {
            NotFoundException("거래를 찾을 수 없습니다.")
        }
        val ledgerId = transaction.ledger.id!!
        // Verify user is member of transaction's ledger
        requireLedgerReader(userId, ledgerId)
        if (!canModify(transaction, userId)) throw ForbiddenException("이 거래를 수정할 권한이 없습니다.")
        ensureMonthIsOpen(ledgerId, transaction.transactionDate)
        if (request.transactionDate != transaction.transactionDate) {
            ensureMonthIsOpen(ledgerId, request.transactionDate)
        }

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
        val updatedPaymentMethod = request.paymentMethod ?: transaction.paymentMethod
        val payment = resolvePayment(
            ledgerId,
            request.type,
            updatedPaymentMethod,
            if (updatedPaymentMethod == PaymentMethod.CARD) request.cardId ?: transaction.card?.id else null,
        )
        transaction.paymentMethod = payment.method
        transaction.card = payment.card

        val affectedPeriodIds = mutableSetOf<Long>().also { ids -> transaction.budgetAllocation?.budgetPeriod?.id?.let(ids::add) }
        val saved = transactionRepository.save(transaction)
        notifyBudgetIfExceeded(ledgerId, request.transactionDate)
        saved.budgetAllocation?.budgetPeriod?.id?.let(affectedPeriodIds::add)
        affectedPeriodIds.forEach(budgetAutomationService::evaluatePeriod)
        return saved.toResponse()
    }

    fun deleteTransaction(userId: Long, transactionId: Long) {
        val transaction = validateTransactionDeletion(userId, transactionId)
        val periodId = transaction.budgetAllocation?.budgetPeriod?.id
        deleteValidatedTransactions(listOf(transaction))
        periodId?.let(budgetAutomationService::evaluatePeriod)
    }

    fun bulkDeleteTransactions(userId: Long, transactionIds: List<Long?>) {
        if (transactionIds.size !in 1..100 || transactionIds.any { it == null }) {
            throw WoorilogException("INVALID_REQUEST", "거래 ID는 1개에서 100개까지 입력해야 합니다.", HttpStatus.BAD_REQUEST)
        }
        val validatedIds = transactionIds.filterNotNull()
        if (validatedIds.distinct().size != validatedIds.size) {
            throw WoorilogException("INVALID_REQUEST", "중복된 거래 ID는 입력할 수 없습니다.", HttpStatus.BAD_REQUEST)
        }

        val transactions = validatedIds.map { validateTransactionDeletion(userId, it) }
        val periodIds = transactions.mapNotNull { it.budgetAllocation?.budgetPeriod?.id }.distinct()
        deleteValidatedTransactions(transactions)
        periodIds.forEach(budgetAutomationService::evaluatePeriod)
    }

    private fun validateTransactionDeletion(userId: Long, transactionId: Long): Transaction {
        val transaction = transactionRepository.findById(transactionId).orElseThrow {
            NotFoundException("거래를 찾을 수 없습니다.")
        }
        val ledgerId = transaction.ledger.id!!
        requireLedgerReader(userId, ledgerId)
        val canDelete = if (transaction.scopeType == BudgetScopeType.SHARED) {
            ledgerMemberRepository.findFirstByLedgerIdAndUserIdAndLeftAtIsNullOrderByJoinedAtDesc(ledgerId, userId) != null
        } else transaction.payer.id == userId
        if (!canDelete) {
            throw ForbiddenException("본인이 결제한 거래만 삭제할 수 있습니다.")
        }
        ensureMonthIsOpen(ledgerId, transaction.transactionDate)
        return transaction
    }

    private fun requireActiveLedger(userId: Long, ledgerId: Long): Ledger {
        val ledger = ledgerRepository.findById(ledgerId).orElseThrow { NotFoundException("장부를 찾을 수 없습니다.") }
        if (ledgerMemberRepository.findFirstByLedgerIdAndUserIdAndLeftAtIsNullOrderByJoinedAtDesc(ledgerId, userId) == null) throw ForbiddenException("활성 장부 멤버만 사용할 수 있습니다.")
        return ledger
    }
    private fun requireLedgerReader(userId: Long, ledgerId: Long): LedgerMember =
        ledgerMemberRepository.findFirstByLedgerIdAndUserIdAndLeftAtIsNullOrderByJoinedAtDesc(ledgerId, userId)
            ?: ledgerMemberRepository.findByUserId(userId)
                .filter { it.ledger.id == ledgerId }
                .maxByOrNull { it.joinedAt }
            ?: throw ForbiddenException("해당 장부에 접근 권한이 없습니다.")
    private fun visibleInList(transaction: Transaction, userId: Long, membership: LedgerMember): Boolean {
        if (membership.leftAt != null) {
            val joined = membership.joinedAt.atZone(clock.zone).toLocalDate(); val left = membership.leftAt!!.atZone(clock.zone).toLocalDate()
            if (transaction.transactionDate !in joined..left) return false
        }
        return transaction.scopeType == BudgetScopeType.SHARED || transaction.payer.id == userId
    }
    private fun transactionKind(transaction: Transaction): String = when (transaction.scheduleKind) {
        TransactionScheduleKind.RECURRING_EXPENSE -> "FIXED_EXPENSE"
        TransactionScheduleKind.INSTALLMENT -> "INSTALLMENT"
        null -> "NORMAL"
    }
    private fun canModify(transaction: Transaction, userId: Long): Boolean = when (transaction.scopeType) {
        BudgetScopeType.SHARED -> ledgerMemberRepository.findFirstByLedgerIdAndUserIdAndLeftAtIsNullOrderByJoinedAtDesc(transaction.ledger.id!!, userId) != null
        null -> ledgerMemberRepository.findFirstByLedgerIdAndUserIdAndLeftAtIsNullOrderByJoinedAtDesc(transaction.ledger.id!!, userId) != null
        else -> transaction.payer.id == userId
    }
    private fun categoryFor(ledgerId: Long, categoryId: Long, type: CategoryType?): LedgerCategory {
        val category = ledgerCategoryRepository.findById(categoryId).orElseThrow { NotFoundException("카테고리를 찾을 수 없습니다.") }
        if (category.ledger.id != ledgerId || !category.active || (type != null && category.type != type)) invalid("거래에 사용할 수 없는 카테고리입니다.")
        return category
    }
    private fun allocationFor(period: BudgetPeriod, source: BudgetSource, userId: Long): BudgetAllocation {
        if (source.type == BudgetScopeType.PERSONAL && source.ownerUserId != userId) throw ForbiddenException("본인 개인 예산만 사용할 수 있습니다.")
        if (source.type == BudgetScopeType.SHARED && source.ownerUserId != null) invalid("공동 예산에는 소유자를 지정할 수 없습니다.")
        return budgetAllocationRepository.findByBudgetPeriodIdAndScopeAndOwnerId(period.id!!, source.type.toAllocationScope(), source.ownerUserId)
            ?: throw WoorilogException("BUDGET_ALLOCATION_NOT_FOUND", "차감 예산을 찾을 수 없습니다.", HttpStatus.CONFLICT)
    }
    private fun resolveV1Payment(payment: V1PaymentMethod?): Pair<PaymentMethod, String?> {
        val type = payment?.type ?: PaymentMethod.CASH
        return type to payment?.displayName?.trim()?.takeIf { it.isNotEmpty() }
    }
    private fun CategoryType.toLedgerType() = when (this) { CategoryType.EXPENSE -> LedgerTransactionType.EXPENSE; CategoryType.INCOME -> LedgerTransactionType.INCOME; CategoryType.TRANSFER -> LedgerTransactionType.TRANSFER }
    private fun BudgetScopeType.toAllocationScope() = when (this) { BudgetScopeType.PERSONAL -> BudgetAllocationScope.PERSONAL; BudgetScopeType.SHARED -> BudgetAllocationScope.SHARED }
    private fun BudgetAllocationScope.toBudgetScopeType() = when (this) { BudgetAllocationScope.PERSONAL -> BudgetScopeType.PERSONAL; BudgetAllocationScope.SHARED -> BudgetScopeType.SHARED }
    private fun requirePositive(amount: Long) { if (amount <= 0) invalid("금액은 양수여야 합니다.") }
    private fun invalid(message: String): Nothing = throw WoorilogException("INVALID_REQUEST", message, HttpStatus.BAD_REQUEST)

    private fun deleteValidatedTransactions(transactions: List<Transaction>) {
        val transactionIds = transactions.map { it.id!! }
        recurringTransactionGenerationRepository.detachTransactions(transactionIds)
        transactionRepository.deleteAllByIdInBatch(transactionIds)
    }

    private fun ensureMonthIsOpen(ledgerId: Long, transactionDate: LocalDate) {
        val budgetMonth = YearMonth.from(transactionDate).toString()
        if (ledgerMonthRepository.findByLedgerIdAndBudgetMonth(ledgerId, budgetMonth)?.closed == true) {
            throw WoorilogException("MONTH_CLOSED", "마감된 월의 거래는 변경할 수 없습니다.", HttpStatus.CONFLICT)
        }
    }

    private fun notifyBudgetIfExceeded(ledgerId: Long, transactionDate: LocalDate) {
        val budgetMonth = YearMonth.from(transactionDate)
        val budget = ledgerMonthRepository.findByLedgerIdAndBudgetMonth(ledgerId, budgetMonth.toString())
            ?.totalBudgetAmount ?: return
        if (budget <= 0) return
        val expense = transactionRepository
            .findByLedgerIdAndTransactionDateBetweenOrderByTransactionDateDescIdDesc(
                ledgerId, budgetMonth.atDay(1), budgetMonth.atEndOfMonth(),
            )
            .filter { it.type == CategoryType.EXPENSE }
            .sumOf { it.amount }
        if (expense > budget) {
            notificationService.notifyLedgerMembers(
                ledgerId,
                NotificationType.BUDGET,
                "${budgetMonth} 예산을 초과했습니다.",
                "현재 지출이 월 예산보다 ${expense - budget}원 많습니다.",
                "/ledgers/$ledgerId/months/$budgetMonth",
                "budget-over-$ledgerId-$budgetMonth",
            )
        }
    }

    private fun validateInstallmentMonths(type: CategoryType, requestedMonths: Int?, paymentMethod: PaymentMethod): Int {
        val installmentMonths = requestedMonths ?: 1
        if (installmentMonths !in 1..60) {
            throw WoorilogException("INVALID_REQUEST", "할부 개월 수는 1개월에서 60개월 사이여야 합니다.", HttpStatus.BAD_REQUEST)
        }
        if (installmentMonths > 1 && type != CategoryType.EXPENSE) {
            throw WoorilogException("INVALID_REQUEST", "할부는 지출 거래에만 사용할 수 있습니다.", HttpStatus.BAD_REQUEST)
        }
        if (installmentMonths > 1 && paymentMethod != PaymentMethod.CARD) {
            throw WoorilogException("INVALID_REQUEST", "할부는 카드 결제에만 사용할 수 있습니다.", HttpStatus.BAD_REQUEST)
        }
        return installmentMonths
    }

    private fun resolvePayment(
        ledgerId: Long,
        type: CategoryType,
        paymentMethod: PaymentMethod?,
        cardId: Long?,
    ): ResolvedPayment {
        val method = paymentMethod ?: PaymentMethod.CASH
        if (method == PaymentMethod.CASH) {
            if (cardId != null) throw WoorilogException("INVALID_REQUEST", "현금 결제에는 카드를 선택할 수 없습니다.", HttpStatus.BAD_REQUEST)
            return ResolvedPayment(PaymentMethod.CASH, null)
        }
        if (type != CategoryType.EXPENSE) {
            throw WoorilogException("INVALID_REQUEST", "카드 결제는 지출 거래에만 사용할 수 있습니다.", HttpStatus.BAD_REQUEST)
        }
        val card = cardId?.let { cardRepository.findById(it).orElseThrow { NotFoundException("카드를 찾을 수 없습니다.") } }
            ?: throw WoorilogException("INVALID_REQUEST", "카드 결제에는 카드를 선택해야 합니다.", HttpStatus.BAD_REQUEST)
        if (card.ledger.id != ledgerId) throw NotFoundException("카드를 찾을 수 없습니다.")
        return ResolvedPayment(PaymentMethod.CARD, card)
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
    val payerUserId: Long?,
    val installmentMonths: Int?,
    val paymentMethod: PaymentMethod?,
    val cardId: Long?,
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
    val payerUserId: Long?,
    val paymentMethod: PaymentMethod?,
    val cardId: Long?,
)

data class TransactionResponse(
    val id: Long,
    val ledgerId: Long,
    val type: CategoryType,
    val amount: Long,
    val occurredOn: LocalDate,
    val transactionDate: LocalDate,
    val category: CategorySummary?,
    val payer: PayerSummary,
    val memo: String?,
    val paymentMethod: V1PaymentMethod?,
    val legacyPaymentMethod: PaymentMethod,
    val card: PaymentCardSummary?,
    val installment: InstallmentSummary?,
    val merchant: String? = null,
    val transferType: TransferType? = null,
    val scope: BudgetSource? = null,
    val budgetSource: BudgetSource? = null,
    val sharedWithPartner: Boolean? = null,
    val occurredAt: java.time.Instant? = null,
    val schedule: TransactionScheduleSummary? = null,
    val lastModifiedBy: PayerSummary? = null,
    val lastModifiedAt: java.time.Instant? = null,
)

data class BudgetSource(val type: BudgetScopeType, val ownerUserId: Long?)
data class V1PaymentMethod(val type: PaymentMethod, val displayName: String? = null)
data class V1InstallmentRequest(val months: Int, val monthlyInterest: Long = 0)
data class V1TransactionRequest(val type: CategoryType, val amount: Long, val occurredOn: LocalDate, val merchant: String, val categoryId: Long?, val memo: String?, val transferType: TransferType?, val scope: BudgetSource?, val budgetSource: BudgetSource?, val payerUserId: Long? = null, val sharedWithPartner: Boolean?, val paymentMethod: V1PaymentMethod?, val occurredAt: java.time.Instant?, val installment: V1InstallmentRequest? = null)
data class V1TransactionListRequest(val periodStart: LocalDate?, val query: String?, val types: Set<LedgerTransactionType>, val categoryGroupCodes: Set<String>, val scopes: Set<BudgetScopeType>, val kinds: Set<String>, val shared: Boolean?, val unclassified: Boolean, val cursor: String?, val limit: Int)
data class V1TransactionListResponse(val items: List<TransactionResponse>, val nextCursor: String?, val unclassifiedCount: Int)
data class TransactionEntryDefaultsResponse(val budgetSource: BudgetSource, val shareNewPersonalTransactions: Boolean)
data class MerchantSuggestion(val merchant: String, val suggestedCategoryId: Long?)
data class MerchantSuggestionsResponse(val items: List<MerchantSuggestion>)
data class BulkClassifyResponse(val transactionIds: List<Long>)

data class PaymentCardSummary(
    val id: Long,
    val name: String,
)

data class InstallmentSummary(
    val planId: String,
    val sequence: Int,
    val totalCount: Int,
)
data class TransactionScheduleSummary(val kind: String, val planId: Long, val sequence: Int, val totalSequences: Int?)

data class CategorySummary(
    val id: Long,
    val name: String,
    val type: CategoryType,
    val categoryId: Long = id,
    val groupCode: String? = null,
    val groupName: String? = null,
    val categoryName: String = name,
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
    occurredOn = this.transactionDate,
    transactionDate = this.transactionDate,
    category = this.category?.let { CategorySummary(it.id!!, this.categoryName ?: it.name, it.type, it.id!!, this.categoryGroupCode, this.categoryGroupName, this.categoryName ?: it.name) },
    payer = PayerSummary(this.payer.id!!, this.payer.nickname),
    memo = this.memo,
    paymentMethod = this.paymentMethodType?.let { V1PaymentMethod(it, this.paymentMethodDisplayName) }
        ?: V1PaymentMethod(this.paymentMethod, this.card?.name),
    legacyPaymentMethod = this.paymentMethod,
    card = this.card?.let { PaymentCardSummary(it.id!!, it.name) },
    installment = this.installmentPlanId?.let {
        InstallmentSummary(it, this.installmentSequence, this.installmentTotalCount)
    },
    merchant = this.merchant,
    transferType = this.transferType,
    scope = this.scopeType?.let { BudgetSource(it, this.scopeOwnerUserId) },
    budgetSource = this.budgetAllocation?.let { BudgetSource(BudgetScopeType.valueOf(it.scope.name), it.owner?.id) },
    sharedWithPartner = this.sharedWithPartner,
    occurredAt = this.occurredAt,
    schedule = this.scheduledPlan?.id?.let { TransactionScheduleSummary(this.scheduleKind?.name ?: "RECURRING_EXPENSE", it, this.installmentSequence, this.installmentTotalCount.takeIf { count -> count > 1 }) },
    lastModifiedBy = this.lastModifiedBy?.let { PayerSummary(it.id!!, it.nickname) },
    lastModifiedAt = this.updatedAt,
)

private data class ResolvedPayment(
    val method: PaymentMethod,
    val card: Card?,
)
