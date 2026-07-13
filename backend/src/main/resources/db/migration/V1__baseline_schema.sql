CREATE TABLE users (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    provider VARCHAR(255) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    email VARCHAR(255) NULL,
    nickname VARCHAR(255) NOT NULL,
    last_used_ledger_id BIGINT NULL,
    CONSTRAINT uk_users_provider UNIQUE (provider, provider_user_id)
) ENGINE=InnoDB;

CREATE TABLE ledgers (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type ENUM('PERSONAL', 'GROUP') NOT NULL,
    owner_id BIGINT NOT NULL
) ENGINE=InnoDB;

CREATE TABLE ledger_members (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    ledger_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role ENUM('OWNER', 'MEMBER') NOT NULL,
    CONSTRAINT uk_ledger_members UNIQUE (ledger_id, user_id),
    CONSTRAINT fk_ledger_members_ledger FOREIGN KEY (ledger_id) REFERENCES ledgers(id),
    CONSTRAINT fk_ledger_members_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE ledger_categories (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    ledger_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    type ENUM('EXPENSE', 'INCOME') NOT NULL,
    sort_order INT NOT NULL,
    default_category BIT(1) NOT NULL,
    CONSTRAINT uk_ledger_categories UNIQUE (ledger_id, name),
    CONSTRAINT fk_ledger_categories_ledger FOREIGN KEY (ledger_id) REFERENCES ledgers(id)
) ENGINE=InnoDB;

CREATE TABLE ledger_months (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    ledger_id BIGINT NOT NULL,
    budget_month VARCHAR(255) NOT NULL,
    total_budget_amount BIGINT NOT NULL,
    closed BIT(1) NOT NULL,
    CONSTRAINT uk_ledger_months UNIQUE (ledger_id, budget_month),
    CONSTRAINT fk_ledger_months_ledger FOREIGN KEY (ledger_id) REFERENCES ledgers(id)
) ENGINE=InnoDB;

CREATE TABLE category_budgets (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    ledger_month_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    amount BIGINT NOT NULL,
    CONSTRAINT uk_category_budgets UNIQUE (ledger_month_id, category_id),
    CONSTRAINT fk_category_budgets_month FOREIGN KEY (ledger_month_id) REFERENCES ledger_months(id),
    CONSTRAINT fk_category_budgets_category FOREIGN KEY (category_id) REFERENCES ledger_categories(id)
) ENGINE=InnoDB;

CREATE TABLE member_allocations (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    ledger_month_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    amount BIGINT NOT NULL,
    CONSTRAINT uk_member_allocations UNIQUE (ledger_month_id, user_id),
    CONSTRAINT fk_member_allocations_month FOREIGN KEY (ledger_month_id) REFERENCES ledger_months(id),
    CONSTRAINT fk_member_allocations_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE transactions (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    ledger_id BIGINT NOT NULL,
    category_id BIGINT NULL,
    payer_id BIGINT NOT NULL,
    type ENUM('EXPENSE', 'INCOME') NOT NULL,
    amount BIGINT NOT NULL,
    transaction_date DATE NOT NULL,
    memo VARCHAR(255) NULL,
    CONSTRAINT fk_transactions_ledger FOREIGN KEY (ledger_id) REFERENCES ledgers(id),
    CONSTRAINT fk_transactions_category FOREIGN KEY (category_id) REFERENCES ledger_categories(id),
    CONSTRAINT fk_transactions_payer FOREIGN KEY (payer_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE invitations (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    ledger_id BIGINT NOT NULL,
    inviter_id BIGINT NOT NULL,
    invitee_id BIGINT NULL,
    type ENUM('DIRECT', 'LINK') NOT NULL,
    status ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED') NOT NULL,
    token VARCHAR(255) NULL,
    expires_at DATETIME(6) NULL,
    responded_at DATETIME(6) NULL,
    CONSTRAINT fk_invitations_ledger FOREIGN KEY (ledger_id) REFERENCES ledgers(id),
    CONSTRAINT fk_invitations_inviter FOREIGN KEY (inviter_id) REFERENCES users(id),
    CONSTRAINT fk_invitations_invitee FOREIGN KEY (invitee_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE recurring_transaction_templates (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    ledger_id BIGINT NOT NULL,
    payer_id BIGINT NOT NULL,
    category_id BIGINT NULL,
    type ENUM('EXPENSE', 'INCOME') NOT NULL,
    amount BIGINT NOT NULL,
    memo VARCHAR(255) NULL,
    frequency ENUM('WEEKLY', 'MONTHLY') NOT NULL,
    start_date DATE NOT NULL,
    next_due_date DATE NOT NULL,
    end_date DATE NULL,
    paused BIT(1) NOT NULL,
    CONSTRAINT fk_recurring_templates_ledger FOREIGN KEY (ledger_id) REFERENCES ledgers(id),
    CONSTRAINT fk_recurring_templates_payer FOREIGN KEY (payer_id) REFERENCES users(id),
    CONSTRAINT fk_recurring_templates_category FOREIGN KEY (category_id) REFERENCES ledger_categories(id)
) ENGINE=InnoDB;

CREATE TABLE recurring_transaction_generations (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    template_id BIGINT NOT NULL,
    generated_date DATE NOT NULL,
    transaction_id BIGINT NULL,
    CONSTRAINT uk_recurring_generations UNIQUE (template_id, generated_date),
    CONSTRAINT fk_recurring_generations_template FOREIGN KEY (template_id) REFERENCES recurring_transaction_templates(id),
    CONSTRAINT fk_recurring_generations_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id)
) ENGINE=InnoDB;
