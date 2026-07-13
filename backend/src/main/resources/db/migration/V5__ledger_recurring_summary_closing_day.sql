ALTER TABLE ledgers
    ADD COLUMN recurring_summary_closing_day INT NOT NULL DEFAULT 31;
