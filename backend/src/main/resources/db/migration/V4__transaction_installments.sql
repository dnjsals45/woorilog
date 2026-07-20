ALTER TABLE transactions
    ADD COLUMN installment_plan_id VARCHAR(36) NULL,
    ADD COLUMN installment_sequence INT NOT NULL DEFAULT 1,
    ADD COLUMN installment_total_count INT NOT NULL DEFAULT 1,
    ADD INDEX idx_transactions_installment_plan (installment_plan_id);
