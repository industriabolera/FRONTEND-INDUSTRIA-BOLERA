CREATE TABLE IF NOT EXISTS cookie_consents (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  consent_uuid VARCHAR(64) NOT NULL,
  necessary BOOLEAN NOT NULL DEFAULT TRUE,
  analytics BOOLEAN NOT NULL DEFAULT FALSE,
  action_type ENUM('accept_all', 'reject_optional', 'custom') NOT NULL DEFAULT 'accept_all',
  policy_version VARCHAR(50) NOT NULL DEFAULT '2026-v1',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_consent_uuid (consent_uuid),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
