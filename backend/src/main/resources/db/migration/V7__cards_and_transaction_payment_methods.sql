CREATE TABLE cards (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    ledger_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    statement_closing_day INT NOT NULL,
    CONSTRAINT fk_cards_ledger FOREIGN KEY (ledger_id) REFERENCES ledgers(id),
    CONSTRAINT uk_cards_ledger_name UNIQUE (ledger_id, name)
) ENGINE=InnoDB;

ALTER TABLE transactions
    ADD COLUMN payment_method ENUM('CASH', 'CARD') NOT NULL DEFAULT 'CASH',
    ADD COLUMN card_id BIGINT NULL,
    ADD INDEX idx_transactions_card_date (card_id, transaction_date),
    ADD CONSTRAINT fk_transactions_card FOREIGN KEY (card_id) REFERENCES cards(id);
