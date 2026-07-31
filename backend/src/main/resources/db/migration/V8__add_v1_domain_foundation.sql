ALTER TABLE users
    ADD COLUMN nickname_confirmed_at DATETIME(6) NULL,
    ADD COLUMN timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Seoul';
UPDATE users SET timezone = 'Asia/Seoul' WHERE timezone IS NULL OR timezone = '';
UPDATE users SET nickname_confirmed_at = created_at WHERE nickname_confirmed_at IS NULL;

ALTER TABLE ledgers
    ADD COLUMN budget_start_type ENUM('DAY_OF_MONTH', 'LAST_DAY_OF_MONTH') NOT NULL DEFAULT 'DAY_OF_MONTH',
    ADD COLUMN budget_start_day INT NULL DEFAULT 1,
    ADD COLUMN default_total_budget_amount BIGINT NOT NULL DEFAULT 0,
    ADD CONSTRAINT chk_ledgers_budget_cycle CHECK (
        (budget_start_type = 'DAY_OF_MONTH' AND budget_start_day BETWEEN 1 AND 28)
        OR (budget_start_type = 'LAST_DAY_OF_MONTH' AND budget_start_day IS NULL)
    ),
    ADD CONSTRAINT chk_ledgers_default_total_budget CHECK (default_total_budget_amount >= 0);

ALTER TABLE ledger_members
    ADD COLUMN joined_at DATETIME(6) NULL,
    ADD COLUMN left_at DATETIME(6) NULL,
    ADD COLUMN leave_reason VARCHAR(64) NULL;
UPDATE ledger_members SET joined_at = created_at WHERE joined_at IS NULL;
ALTER TABLE ledger_members
    MODIFY COLUMN joined_at DATETIME(6) NOT NULL,
    DROP INDEX uk_ledger_members,
    ADD COLUMN active_user_id BIGINT GENERATED ALWAYS AS (CASE WHEN left_at IS NULL THEN user_id ELSE NULL END) STORED,
    ADD CONSTRAINT uk_ledger_members_active_user UNIQUE (ledger_id, active_user_id);

CREATE TABLE ledger_user_preferences (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, created_at DATETIME(6) NOT NULL, updated_at DATETIME(6) NOT NULL,
    ledger_id BIGINT NOT NULL, user_id BIGINT NOT NULL,
    last_budget_scope ENUM('PERSONAL', 'SHARED') NULL, last_budget_owner_user_id BIGINT NULL,
    share_new_personal_transactions BIT(1) NOT NULL DEFAULT 0,
    CONSTRAINT uk_ledger_user_preferences UNIQUE (ledger_id, user_id),
    CONSTRAINT fk_lup_ledger FOREIGN KEY (ledger_id) REFERENCES ledgers(id),
    CONSTRAINT fk_lup_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE budget_periods (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, created_at DATETIME(6) NOT NULL, updated_at DATETIME(6) NOT NULL,
    ledger_id BIGINT NOT NULL, start_date DATE NOT NULL, end_date DATE NOT NULL, total_budget_amount BIGINT NOT NULL,
    prepared_at DATETIME(6) NULL, source_period_id BIGINT NULL,
    CONSTRAINT uk_budget_periods_ledger_start UNIQUE (ledger_id, start_date),
    CONSTRAINT chk_budget_period_dates CHECK (end_date >= start_date),
    CONSTRAINT chk_budget_period_total CHECK (total_budget_amount >= 0),
    CONSTRAINT fk_budget_period_ledger FOREIGN KEY (ledger_id) REFERENCES ledgers(id),
    CONSTRAINT fk_budget_period_source FOREIGN KEY (source_period_id) REFERENCES budget_periods(id)
) ENGINE=InnoDB;

CREATE TABLE budget_allocations (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, created_at DATETIME(6) NOT NULL, updated_at DATETIME(6) NOT NULL,
    budget_period_id BIGINT NOT NULL, scope ENUM('PERSONAL', 'SHARED') NOT NULL, owner_user_id BIGINT NULL, amount BIGINT NOT NULL,
    allocation_key VARCHAR(64) GENERATED ALWAYS AS (CASE WHEN scope = 'SHARED' THEN 'SHARED' ELSE CONCAT('PERSONAL:', owner_user_id) END) STORED,
    CONSTRAINT uk_budget_allocations_scope UNIQUE (budget_period_id, allocation_key),
    CONSTRAINT chk_budget_allocation_owner CHECK ((scope = 'PERSONAL' AND owner_user_id IS NOT NULL) OR (scope = 'SHARED' AND owner_user_id IS NULL)),
    CONSTRAINT chk_budget_allocation_amount CHECK (amount >= 0),
    CONSTRAINT fk_budget_allocation_period FOREIGN KEY (budget_period_id) REFERENCES budget_periods(id),
    CONSTRAINT fk_budget_allocation_owner FOREIGN KEY (owner_user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE reserve_transfers (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, created_at DATETIME(6) NOT NULL, updated_at DATETIME(6) NOT NULL,
    budget_period_id BIGINT NOT NULL, target_allocation_id BIGINT NOT NULL, actor_user_id BIGINT NOT NULL, amount BIGINT NOT NULL,
    CONSTRAINT chk_reserve_transfer_amount CHECK (amount <> 0),
    CONSTRAINT fk_reserve_transfer_period FOREIGN KEY (budget_period_id) REFERENCES budget_periods(id),
    CONSTRAINT fk_reserve_transfer_target FOREIGN KEY (target_allocation_id) REFERENCES budget_allocations(id),
    CONSTRAINT fk_reserve_transfer_actor FOREIGN KEY (actor_user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE scheduled_plans (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, created_at DATETIME(6) NOT NULL, updated_at DATETIME(6) NOT NULL,
    ledger_id BIGINT NOT NULL, created_by_user_id BIGINT NOT NULL, budget_allocation_id BIGINT NULL,
    type ENUM('RECURRING_EXPENSE', 'INSTALLMENT') NOT NULL, amount BIGINT NOT NULL,
    start_date DATE NOT NULL, next_due_date DATE NOT NULL, end_date DATE NULL,
    status ENUM('ACTIVE', 'PAUSED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    pause_reason ENUM('USER_REQUEST', 'MEMBERSHIP_CHANGED') NULL,
    is_fixed_expense BIT(1) NOT NULL DEFAULT 0, frequency ENUM('WEEKLY', 'MONTHLY', 'YEARLY') NULL,
    installment_total_count INT NULL, monthly_interest_amount BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT chk_scheduled_plan_amount CHECK (amount >= 0 AND monthly_interest_amount >= 0),
    CONSTRAINT fk_scheduled_plan_ledger FOREIGN KEY (ledger_id) REFERENCES ledgers(id),
    CONSTRAINT fk_scheduled_plan_creator FOREIGN KEY (created_by_user_id) REFERENCES users(id),
    CONSTRAINT fk_scheduled_plan_allocation FOREIGN KEY (budget_allocation_id) REFERENCES budget_allocations(id)
) ENGINE=InnoDB;

CREATE TABLE scheduled_occurrences (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, created_at DATETIME(6) NOT NULL, updated_at DATETIME(6) NOT NULL,
    plan_id BIGINT NOT NULL, due_date DATE NOT NULL, sequence INT NOT NULL, amount BIGINT NOT NULL,
    status ENUM('SCHEDULED', 'GENERATED', 'SKIPPED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED', generated_transaction_id BIGINT NULL,
    CONSTRAINT uk_scheduled_occurrence UNIQUE (plan_id, due_date, sequence),
    CONSTRAINT chk_scheduled_occurrence_amount CHECK (amount >= 0),
    CONSTRAINT fk_scheduled_occurrence_plan FOREIGN KEY (plan_id) REFERENCES scheduled_plans(id),
    CONSTRAINT fk_scheduled_occurrence_transaction FOREIGN KEY (generated_transaction_id) REFERENCES transactions(id)
) ENGINE=InnoDB;

CREATE TABLE import_sessions (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, created_at DATETIME(6) NOT NULL, updated_at DATETIME(6) NOT NULL,
    ledger_id BIGINT NOT NULL, uploaded_by_user_id BIGINT NOT NULL,
    source_type ENUM('RECEIPT', 'CARD_APP_SCREENSHOT') NOT NULL,
    status ENUM('PREVIEWED', 'SAVED', 'EXPIRED') NOT NULL DEFAULT 'PREVIEWED', expires_at DATETIME(6) NOT NULL, omitted_count INT NOT NULL DEFAULT 0,
    CONSTRAINT chk_import_session_omitted CHECK (omitted_count >= 0),
    CONSTRAINT fk_import_session_ledger FOREIGN KEY (ledger_id) REFERENCES ledgers(id),
    CONSTRAINT fk_import_session_user FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE import_candidates (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, created_at DATETIME(6) NOT NULL, updated_at DATETIME(6) NOT NULL,
    import_session_id BIGINT NOT NULL, occurred_on DATE NOT NULL, amount BIGINT NOT NULL, merchant VARCHAR(255) NOT NULL,
    suggested_category_id BIGINT NULL, suggested_allocation_id BIGINT NULL,
    duplicate_suspected BIT(1) NOT NULL DEFAULT 0, duplicate_reason VARCHAR(64) NULL, selected_by_default BIT(1) NOT NULL DEFAULT 1,
    CONSTRAINT chk_import_candidate_amount CHECK (amount > 0),
    CONSTRAINT fk_import_candidate_session FOREIGN KEY (import_session_id) REFERENCES import_sessions(id),
    CONSTRAINT fk_import_candidate_category FOREIGN KEY (suggested_category_id) REFERENCES ledger_categories(id),
    CONSTRAINT fk_import_candidate_allocation FOREIGN KEY (suggested_allocation_id) REFERENCES budget_allocations(id)
) ENGINE=InnoDB;

CREATE TABLE notification_preferences (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, created_at DATETIME(6) NOT NULL, updated_at DATETIME(6) NOT NULL,
    user_id BIGINT NOT NULL, budget_warning_80_enabled BIT(1) NOT NULL DEFAULT 1, weekly_guide_enabled BIT(1) NOT NULL DEFAULT 1,
    CONSTRAINT uk_notification_preferences_user UNIQUE (user_id),
    CONSTRAINT fk_notification_preferences_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE budget_threshold_states (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, created_at DATETIME(6) NOT NULL, updated_at DATETIME(6) NOT NULL,
    state_key VARCHAR(255) NOT NULL, budget_period_id BIGINT NOT NULL, budget_allocation_id BIGINT NULL, category_group_code VARCHAR(64) NULL,
    level ENUM('BELOW_80', 'AT_LEAST_80', 'AT_LEAST_100') NOT NULL DEFAULT 'BELOW_80',
    CONSTRAINT uk_budget_threshold_state UNIQUE (state_key),
    CONSTRAINT fk_threshold_period FOREIGN KEY (budget_period_id) REFERENCES budget_periods(id),
    CONSTRAINT fk_threshold_allocation FOREIGN KEY (budget_allocation_id) REFERENCES budget_allocations(id)
) ENGINE=InnoDB;

CREATE TABLE weekly_budget_guides (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, created_at DATETIME(6) NOT NULL, updated_at DATETIME(6) NOT NULL,
    user_id BIGINT NOT NULL, ledger_id BIGINT NOT NULL, budget_period_id BIGINT NOT NULL, week_start_date DATE NOT NULL,
    recommended_amount BIGINT NOT NULL, remaining_overage_amount BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uk_weekly_budget_guides UNIQUE (user_id, ledger_id, week_start_date, budget_period_id),
    CONSTRAINT fk_weekly_guide_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_weekly_guide_ledger FOREIGN KEY (ledger_id) REFERENCES ledgers(id),
    CONSTRAINT fk_weekly_guide_period FOREIGN KEY (budget_period_id) REFERENCES budget_periods(id)
) ENGINE=InnoDB;
