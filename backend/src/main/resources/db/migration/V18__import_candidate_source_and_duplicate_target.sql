ALTER TABLE import_candidates
    ADD COLUMN source_type ENUM('RECEIPT', 'CARD_APP_SCREENSHOT') NOT NULL DEFAULT 'RECEIPT',
    ADD COLUMN duplicate_transaction_id BIGINT NULL,
    ADD CONSTRAINT fk_import_candidate_duplicate_transaction
        FOREIGN KEY (duplicate_transaction_id) REFERENCES transactions(id);
