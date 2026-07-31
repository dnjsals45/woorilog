ALTER TABLE budget_threshold_states
    ADD COLUMN notification_sequence BIGINT NOT NULL DEFAULT 0;
