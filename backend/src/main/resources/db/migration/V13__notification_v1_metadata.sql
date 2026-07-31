ALTER TABLE user_notifications
    ADD COLUMN ledger_id BIGINT NULL,
    ADD COLUMN budget_period_start DATE NULL;

CREATE INDEX idx_user_notifications_v1_page
    ON user_notifications (user_id, ledger_id, read_at, created_at, id);
