ALTER TABLE import_candidates
    ADD COLUMN generated_transaction_id BIGINT NULL,
    ADD CONSTRAINT fk_import_candidate_generated_transaction
        FOREIGN KEY (generated_transaction_id) REFERENCES transactions(id);
