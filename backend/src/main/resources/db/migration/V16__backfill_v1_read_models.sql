-- Convert the legacy calendar-month model without deleting its source rows.
INSERT INTO budget_periods (
    created_at, updated_at, ledger_id, start_date, end_date,
    total_budget_amount, prepared_at, source_period_id
)
SELECT ledger_month.created_at, ledger_month.updated_at, ledger_month.ledger_id,
       STR_TO_DATE(CONCAT(ledger_month.budget_month, '-01'), '%Y-%m-%d'),
       LAST_DAY(STR_TO_DATE(CONCAT(ledger_month.budget_month, '-01'), '%Y-%m-%d')),
       ledger_month.total_budget_amount, ledger_month.created_at, NULL
FROM ledger_months ledger_month
ON DUPLICATE KEY UPDATE total_budget_amount = VALUES(total_budget_amount);

-- A transaction month may exist even when the old budget screen was never opened.
INSERT INTO budget_periods (
    created_at, updated_at, ledger_id, start_date, end_date,
    total_budget_amount, prepared_at, source_period_id
)
SELECT MIN(transaction.created_at), MAX(transaction.updated_at), transaction.ledger_id,
       DATE_SUB(transaction.transaction_date, INTERVAL DAYOFMONTH(transaction.transaction_date) - 1 DAY),
       LAST_DAY(transaction.transaction_date), 0, MIN(transaction.created_at), NULL
FROM transactions transaction
GROUP BY transaction.ledger_id,
         DATE_SUB(transaction.transaction_date, INTERVAL DAYOFMONTH(transaction.transaction_date) - 1 DAY),
         LAST_DAY(transaction.transaction_date)
ON DUPLICATE KEY UPDATE updated_at = GREATEST(updated_at, VALUES(updated_at));

-- Preserve legacy member allocations. Personal ledgers without explicit rows receive
-- their owner's whole period budget; shared allocations intentionally start at zero.
INSERT INTO budget_allocations (
    created_at, updated_at, budget_period_id, scope, owner_user_id, amount
)
SELECT allocation.created_at, allocation.updated_at, period.id, 'PERSONAL', allocation.user_id, allocation.amount
FROM member_allocations allocation
JOIN ledger_months ledger_month ON ledger_month.id = allocation.ledger_month_id
JOIN budget_periods period
  ON period.ledger_id = ledger_month.ledger_id
 AND period.start_date = STR_TO_DATE(CONCAT(ledger_month.budget_month, '-01'), '%Y-%m-%d')
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

INSERT INTO budget_allocations (
    created_at, updated_at, budget_period_id, scope, owner_user_id, amount
)
SELECT period.created_at, period.updated_at, period.id, 'PERSONAL', ledger.owner_id,
       CASE WHEN ledger.type = 'PERSONAL' THEN period.total_budget_amount ELSE 0 END
FROM budget_periods period
JOIN ledgers ledger ON ledger.id = period.ledger_id
LEFT JOIN budget_allocations existing
  ON existing.budget_period_id = period.id
 AND existing.scope = 'PERSONAL'
 AND existing.owner_user_id = ledger.owner_id
WHERE existing.id IS NULL
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

INSERT INTO budget_allocations (
    created_at, updated_at, budget_period_id, scope, owner_user_id, amount
)
SELECT period.created_at, period.updated_at, period.id, 'PERSONAL', transaction.payer_id, 0
FROM budget_periods period
JOIN transactions transaction
  ON transaction.ledger_id = period.ledger_id
 AND transaction.transaction_date BETWEEN period.start_date AND period.end_date
LEFT JOIN budget_allocations existing
  ON existing.budget_period_id = period.id
 AND existing.scope = 'PERSONAL'
 AND existing.owner_user_id = transaction.payer_id
WHERE existing.id IS NULL
GROUP BY period.id, transaction.payer_id, period.created_at, period.updated_at
ON DUPLICATE KEY UPDATE amount = amount;

INSERT INTO budget_allocations (
    created_at, updated_at, budget_period_id, scope, owner_user_id, amount
)
SELECT period.created_at, period.updated_at, period.id, 'SHARED', NULL, 0
FROM budget_periods period
JOIN ledgers ledger ON ledger.id = period.ledger_id AND ledger.type = 'GROUP'
ON DUPLICATE KEY UPDATE amount = amount;

-- Legacy category budgets are unambiguous for personal ledgers. Shared-ledger rows
-- remain in category_budgets for the explicit first-entry reclassification workflow.
INSERT INTO allocation_category_budgets (
    created_at, updated_at, budget_allocation_id, category_group_code, amount
)
SELECT MIN(category_budget.created_at), MAX(category_budget.updated_at), allocation.id,
       category_group.code, SUM(category_budget.amount)
FROM category_budgets category_budget
JOIN ledger_months ledger_month ON ledger_month.id = category_budget.ledger_month_id
JOIN ledgers ledger ON ledger.id = ledger_month.ledger_id AND ledger.type = 'PERSONAL'
JOIN budget_periods period
  ON period.ledger_id = ledger.id
 AND period.start_date = STR_TO_DATE(CONCAT(ledger_month.budget_month, '-01'), '%Y-%m-%d')
JOIN budget_allocations allocation
  ON allocation.budget_period_id = period.id
 AND allocation.scope = 'PERSONAL'
 AND allocation.owner_user_id = ledger.owner_id
JOIN ledger_categories category ON category.id = category_budget.category_id
JOIN category_groups category_group ON category_group.id = category.category_group_id
GROUP BY allocation.id, category_group.code
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

UPDATE transactions transaction
JOIN budget_periods period
  ON period.ledger_id = transaction.ledger_id
 AND transaction.transaction_date BETWEEN period.start_date AND period.end_date
JOIN budget_allocations allocation
  ON allocation.budget_period_id = period.id
 AND allocation.scope = 'PERSONAL'
 AND allocation.owner_user_id = transaction.payer_id
SET transaction.budget_allocation_id = allocation.id,
    transaction.recorder_id = COALESCE(transaction.recorder_id, transaction.payer_id),
    transaction.scope_type = COALESCE(transaction.scope_type, 'PERSONAL'),
    transaction.scope_owner_user_id = COALESCE(transaction.scope_owner_user_id, transaction.payer_id),
    transaction.shared_with_partner = COALESCE(transaction.shared_with_partner, 0),
    transaction.last_modified_by_user_id = COALESCE(transaction.last_modified_by_user_id, transaction.payer_id)
WHERE transaction.budget_allocation_id IS NULL;

UPDATE transactions transaction
LEFT JOIN ledger_categories category ON category.id = transaction.category_id
LEFT JOIN category_groups category_group ON category_group.id = category.category_group_id
LEFT JOIN cards card ON card.id = transaction.card_id
SET transaction.category_group_code = COALESCE(transaction.category_group_code, category_group.code),
    transaction.category_group_name = COALESCE(transaction.category_group_name, category_group.name),
    transaction.category_name = COALESCE(transaction.category_name, category.name),
    transaction.payment_method_type = COALESCE(transaction.payment_method_type, transaction.payment_method),
    transaction.payment_method_display_name = COALESCE(transaction.payment_method_display_name, card.name);

-- Reuse legacy template ids while the target table is still empty during migration.
INSERT INTO scheduled_plans (
    id, created_at, updated_at, ledger_id, created_by_user_id, budget_allocation_id,
    type, amount, start_date, next_due_date, end_date, status, pause_reason,
    is_fixed_expense, frequency, installment_total_count, monthly_interest_amount,
    name, merchant, memo, category_id, scope_type, scope_owner_user_id,
    payment_method_type, payment_method_display_name, anchor_day, total_principal_amount
)
SELECT template.id, template.created_at, template.updated_at, template.ledger_id, template.payer_id,
       allocation.id, 'RECURRING_EXPENSE', template.amount, template.start_date,
       template.next_due_date, template.end_date,
       IF(template.paused = 1, 'PAUSED', 'ACTIVE'),
       IF(template.paused = 1, 'USER_REQUEST', NULL), 0, template.frequency,
       NULL, 0, COALESCE(NULLIF(template.memo, ''), category.name, '반복 거래'),
       NULL, template.memo, template.category_id, 'PERSONAL', template.payer_id,
       'CASH', NULL, DAYOFMONTH(template.start_date), NULL
FROM recurring_transaction_templates template
LEFT JOIN budget_periods period
  ON period.ledger_id = template.ledger_id
 AND template.next_due_date BETWEEN period.start_date AND period.end_date
LEFT JOIN budget_allocations allocation
  ON allocation.budget_period_id = period.id
 AND allocation.scope = 'PERSONAL'
 AND allocation.owner_user_id = template.payer_id
LEFT JOIN ledger_categories category ON category.id = template.category_id
ON DUPLICATE KEY UPDATE updated_at = VALUES(updated_at);

INSERT INTO scheduled_occurrences (
    created_at, updated_at, plan_id, due_date, sequence, amount, status, generated_transaction_id
)
SELECT generation.created_at, generation.updated_at, generation.template_id,
       generation.generated_date, 1, template.amount,
       IF(generation.transaction_id IS NULL, 'SKIPPED', 'GENERATED'), generation.transaction_id
FROM recurring_transaction_generations generation
JOIN recurring_transaction_templates template ON template.id = generation.template_id
ON DUPLICATE KEY UPDATE generated_transaction_id = VALUES(generated_transaction_id), status = VALUES(status);

UPDATE transactions transaction
JOIN recurring_transaction_generations generation ON generation.transaction_id = transaction.id
SET transaction.scheduled_plan_id = generation.template_id,
    transaction.schedule_kind = 'RECURRING_EXPENSE';

INSERT INTO ledger_user_preferences (created_at, updated_at, ledger_id, user_id, share_new_personal_transactions)
SELECT NOW(6), NOW(6), member.ledger_id, member.user_id, 0
FROM ledger_members member
ON DUPLICATE KEY UPDATE updated_at = ledger_user_preferences.updated_at;

INSERT INTO notification_preferences (created_at, updated_at, user_id, budget_warning_80_enabled, weekly_guide_enabled)
SELECT NOW(6), NOW(6), user.id, 1, 1 FROM users user
ON DUPLICATE KEY UPDATE updated_at = notification_preferences.updated_at;

UPDATE invitations
SET status = 'EXPIRED', responded_at = COALESCE(responded_at, NOW(6))
WHERE status = 'PENDING' AND (type = 'DIRECT' OR expires_at IS NULL OR expires_at <= NOW(6));
