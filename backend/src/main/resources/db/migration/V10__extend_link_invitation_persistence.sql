ALTER TABLE invitations
    MODIFY COLUMN status ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED', 'REPLACED') NOT NULL,
    ADD COLUMN token_hash VARCHAR(64) NULL,
    ADD COLUMN responded_by_user_id BIGINT NULL,
    ADD CONSTRAINT uk_invitations_token_hash UNIQUE (token_hash),
    ADD CONSTRAINT fk_invitations_responded_by FOREIGN KEY (responded_by_user_id) REFERENCES users(id);

UPDATE invitations
SET token_hash = SHA2(token, 256)
WHERE type = 'LINK' AND token IS NOT NULL AND token_hash IS NULL;

UPDATE invitations stale
JOIN invitations latest
  ON latest.ledger_id = stale.ledger_id
 AND latest.type = 'LINK'
 AND latest.status = 'PENDING'
 AND latest.id > stale.id
SET stale.status = 'REPLACED'
WHERE stale.type = 'LINK' AND stale.status = 'PENDING';

ALTER TABLE invitations
    ADD COLUMN active_link_ledger_id BIGINT GENERATED ALWAYS AS (
        CASE WHEN type = 'LINK' AND status = 'PENDING' THEN ledger_id ELSE NULL END
    ) STORED,
    ADD CONSTRAINT uk_invitations_active_link_ledger UNIQUE (active_link_ledger_id);
