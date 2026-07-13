CREATE TABLE category_groups (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    ledger_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    type ENUM('EXPENSE', 'INCOME') NOT NULL,
    CONSTRAINT uk_category_groups UNIQUE (ledger_id, name),
    CONSTRAINT fk_category_groups_ledger FOREIGN KEY (ledger_id) REFERENCES ledgers(id)
) ENGINE=InnoDB;

ALTER TABLE ledger_categories ADD COLUMN category_group_id BIGINT NULL;

INSERT INTO category_groups (created_at, updated_at, ledger_id, name, type)
SELECT NOW(6), NOW(6), ledger_id,
       CASE WHEN name = '카페' THEN '식비' WHEN name = '급여' THEN '수입' ELSE name END,
       type
FROM ledger_categories
GROUP BY ledger_id,
         CASE WHEN name = '카페' THEN '식비' WHEN name = '급여' THEN '수입' ELSE name END,
         type;

UPDATE ledger_categories category
JOIN category_groups category_group
  ON category_group.ledger_id = category.ledger_id
 AND category_group.type = category.type
 AND category_group.name = CASE WHEN category.name = '카페' THEN '식비' WHEN category.name = '급여' THEN '수입' ELSE category.name END
SET category.category_group_id = category_group.id;

ALTER TABLE ledger_categories MODIFY category_group_id BIGINT NOT NULL;
ALTER TABLE ledger_categories
    ADD CONSTRAINT fk_ledger_categories_group FOREIGN KEY (category_group_id) REFERENCES category_groups(id);

CREATE TABLE fixed_budget_templates (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    ledger_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    amount BIGINT NOT NULL,
    active BIT(1) NOT NULL,
    CONSTRAINT fk_fixed_budget_templates_ledger FOREIGN KEY (ledger_id) REFERENCES ledgers(id),
    CONSTRAINT fk_fixed_budget_templates_category FOREIGN KEY (category_id) REFERENCES ledger_categories(id)
) ENGINE=InnoDB;
