-- Single-use email login links (Smart Servicing Centre Next.js app). Each row is a link that has already been used.
-- Safe to run on the shared Laravel database: Laravel never reads this table.
CREATE TABLE IF NOT EXISTS login_link_uses (
  nonce   CHAR(32)  NOT NULL PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  used_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY login_link_uses_used_at_index (used_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
