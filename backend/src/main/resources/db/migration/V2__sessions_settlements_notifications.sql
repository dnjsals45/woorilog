SET @archived_column_exists = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'ledgers'
      AND column_name = 'archived'
);
SET @archived_column_sql = IF(
    @archived_column_exists = 0,
    'ALTER TABLE ledgers ADD COLUMN archived BIT(1) NOT NULL DEFAULT 0',
    'SELECT 1'
);
PREPARE archived_column_statement FROM @archived_column_sql;
EXECUTE archived_column_statement;
DEALLOCATE PREPARE archived_column_statement;

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    user_id BIGINT NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    revoked_at DATETIME(6) NULL,
    CONSTRAINT uk_refresh_tokens_hash UNIQUE (token_hash),
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS settlement_payments (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    ledger_id BIGINT NOT NULL,
    budget_month VARCHAR(7) NOT NULL,
    from_user_id BIGINT NOT NULL,
    to_user_id BIGINT NOT NULL,
    recorded_by_user_id BIGINT NOT NULL,
    amount BIGINT NOT NULL,
    settled_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_settlement_ledger FOREIGN KEY (ledger_id) REFERENCES ledgers(id),
    CONSTRAINT fk_settlement_from_user FOREIGN KEY (from_user_id) REFERENCES users(id),
    CONSTRAINT fk_settlement_to_user FOREIGN KEY (to_user_id) REFERENCES users(id),
    CONSTRAINT fk_settlement_recorded_by FOREIGN KEY (recorded_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_notifications (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    user_id BIGINT NOT NULL,
    type ENUM('INVITATION', 'BUDGET', 'MONTH_CLOSED', 'SYSTEM') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message VARCHAR(500) NOT NULL,
    target_path VARCHAR(255) NULL,
    unique_key VARCHAR(255) NOT NULL,
    read_at DATETIME(6) NULL,
    CONSTRAINT uk_user_notifications UNIQUE (user_id, unique_key),
    CONSTRAINT fk_user_notifications_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;
