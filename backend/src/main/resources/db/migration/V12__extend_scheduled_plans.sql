ALTER TABLE scheduled_plans
    ADD COLUMN name VARCHAR(255) NOT NULL DEFAULT '',
    ADD COLUMN merchant VARCHAR(255) NULL,
    ADD COLUMN memo VARCHAR(255) NULL,
    ADD COLUMN category_id BIGINT NULL,
    ADD COLUMN scope_type ENUM('PERSONAL', 'SHARED') NULL,
    ADD COLUMN scope_owner_user_id BIGINT NULL,
    ADD COLUMN payment_method_type ENUM('CASH', 'CARD', 'OTHER') NULL,
    ADD COLUMN payment_method_display_name VARCHAR(255) NULL,
    ADD COLUMN anchor_day INT NOT NULL DEFAULT 1,
    ADD COLUMN total_principal_amount BIGINT NULL,
    ADD CONSTRAINT fk_scheduled_plan_category FOREIGN KEY (category_id) REFERENCES ledger_categories(id),
    ADD CONSTRAINT chk_scheduled_plan_anchor_day CHECK (anchor_day BETWEEN 1 AND 31);
