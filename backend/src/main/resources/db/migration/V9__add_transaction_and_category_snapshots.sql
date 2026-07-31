ALTER TABLE category_groups
    MODIFY COLUMN type ENUM('EXPENSE', 'INCOME', 'TRANSFER') NOT NULL,
    ADD COLUMN code VARCHAR(64) NULL,
    ADD COLUMN hidden BIT(1) NOT NULL DEFAULT 0,
    ADD COLUMN sort_order INT NOT NULL DEFAULT 0;

UPDATE category_groups
SET code = CASE name
    WHEN '식비' THEN 'FOOD'
    WHEN '주거·생활' THEN 'HOUSING'
    WHEN '주거·통신' THEN 'HOUSING'
    WHEN '생활' THEN 'HOUSING'
    WHEN '교통·차량' THEN 'TRANSPORT'
    WHEN '교통' THEN 'TRANSPORT'
    WHEN '쇼핑·미용' THEN 'SHOPPING'
    WHEN '건강' THEN 'HEALTH'
    WHEN '여가' THEN 'LEISURE'
    WHEN '교육' THEN 'EDUCATION'
    WHEN '금융' THEN 'FINANCE'
    WHEN '관계' THEN 'RELATIONSHIPS'
    WHEN '반려동물' THEN 'PETS'
    WHEN '기타' THEN 'OTHER_EXPENSE'
    WHEN '기타 지출' THEN 'OTHER_EXPENSE'
    WHEN '근로소득' THEN 'EARNED_INCOME'
    WHEN '수입' THEN 'EARNED_INCOME'
    WHEN '기타수입' THEN 'OTHER_INCOME'
    WHEN '이체' THEN 'TRANSFER'
    ELSE CONCAT('LEGACY_', id)
END
WHERE code IS NULL;
UPDATE category_groups duplicate_group
JOIN category_groups canonical_group
  ON canonical_group.ledger_id = duplicate_group.ledger_id
 AND canonical_group.code = duplicate_group.code
 AND canonical_group.id < duplicate_group.id
SET duplicate_group.code = CONCAT('LEGACY_', duplicate_group.id);
ALTER TABLE category_groups MODIFY COLUMN code VARCHAR(64) NOT NULL;
ALTER TABLE category_groups
    ADD CONSTRAINT uk_category_groups_ledger_code UNIQUE (ledger_id, code);

ALTER TABLE ledger_categories
    MODIFY COLUMN type ENUM('EXPENSE', 'INCOME', 'TRANSFER') NOT NULL,
    ADD COLUMN active BIT(1) NOT NULL DEFAULT 1;

CREATE TABLE allocation_category_budgets (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    budget_allocation_id BIGINT NOT NULL,
    category_group_code VARCHAR(64) NOT NULL,
    amount BIGINT NOT NULL,
    CONSTRAINT uk_allocation_category_budgets UNIQUE (budget_allocation_id, category_group_code),
    CONSTRAINT chk_allocation_category_budget_amount CHECK (amount >= 0),
    CONSTRAINT fk_allocation_category_budget_allocation FOREIGN KEY (budget_allocation_id) REFERENCES budget_allocations(id)
) ENGINE=InnoDB;

ALTER TABLE transactions
    MODIFY COLUMN type ENUM('EXPENSE', 'INCOME', 'TRANSFER') NOT NULL,
    ADD COLUMN recorder_id BIGINT NULL,
    ADD COLUMN budget_allocation_id BIGINT NULL,
    ADD COLUMN transfer_type ENUM('OWN_ACCOUNTS', 'OUTBOUND', 'INBOUND') NULL,
    ADD COLUMN merchant VARCHAR(255) NULL,
    ADD COLUMN occurred_at DATETIME(6) NULL,
    ADD COLUMN scope_type ENUM('PERSONAL', 'SHARED') NULL,
    ADD COLUMN scope_owner_user_id BIGINT NULL,
    ADD COLUMN shared_with_partner BIT(1) NULL,
    ADD COLUMN last_modified_by_user_id BIGINT NULL,
    ADD COLUMN category_group_code VARCHAR(64) NULL,
    ADD COLUMN category_group_name VARCHAR(255) NULL,
    ADD COLUMN category_name VARCHAR(255) NULL,
    ADD COLUMN payment_method_type ENUM('CASH', 'CARD', 'OTHER') NULL,
    ADD COLUMN payment_method_display_name VARCHAR(255) NULL,
    ADD COLUMN scheduled_plan_id BIGINT NULL,
    ADD COLUMN schedule_kind ENUM('RECURRING_EXPENSE', 'INSTALLMENT') NULL,
    ADD COLUMN external_reference_hash VARCHAR(128) NULL,
    ADD INDEX idx_transactions_budget_allocation (budget_allocation_id),
    ADD INDEX idx_transactions_scope (ledger_id, scope_type, scope_owner_user_id),
    ADD INDEX idx_transactions_external_reference_hash (external_reference_hash),
    ADD CONSTRAINT fk_transactions_recorder FOREIGN KEY (recorder_id) REFERENCES users(id),
    ADD CONSTRAINT fk_transactions_budget_allocation FOREIGN KEY (budget_allocation_id) REFERENCES budget_allocations(id),
    ADD CONSTRAINT fk_transactions_last_modified_by FOREIGN KEY (last_modified_by_user_id) REFERENCES users(id),
    ADD CONSTRAINT fk_transactions_scheduled_plan FOREIGN KEY (scheduled_plan_id) REFERENCES scheduled_plans(id);

UPDATE transactions
SET recorder_id = payer_id,
    scope_type = 'PERSONAL',
    scope_owner_user_id = payer_id,
    shared_with_partner = 0,
    last_modified_by_user_id = payer_id,
    payment_method_type = payment_method;

UPDATE transactions transaction
LEFT JOIN ledger_categories category ON category.id = transaction.category_id
LEFT JOIN category_groups category_group ON category_group.id = category.category_group_id
SET transaction.category_group_code = category_group.code,
    transaction.category_group_name = category_group.name,
    transaction.category_name = category.name
WHERE transaction.category_id IS NOT NULL;
