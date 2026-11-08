CREATE TABLE IF NOT EXISTS `pwa_push_subscriptions` (
  `endpointHash` VARCHAR(64) NOT NULL,
  `ownerKey` VARCHAR(64) NOT NULL,
  `role` VARCHAR(24) NOT NULL,
  `version` VARCHAR(16) NOT NULL,
  `endpoint` TEXT NOT NULL,
  `p256dh` VARCHAR(255) NOT NULL,
  `auth` VARCHAR(255) NOT NULL,
  `sound` BOOLEAN NOT NULL DEFAULT true,
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`endpointHash`), INDEX `pwa_push_subscriptions_ownerKey_idx` (`ownerKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `pwa_alerts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `eventKey` VARCHAR(191) NOT NULL,
  `audience` VARCHAR(64) NOT NULL,
  `kind` VARCHAR(24) NOT NULL,
  `title` VARCHAR(180) NOT NULL,
  `body` VARCHAR(255) NOT NULL,
  `url` VARCHAR(512) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `deliveredAt` DATETIME(3) NULL,
  `nextAttemptAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `attempts` INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`), UNIQUE INDEX `pwa_alerts_eventKey_key` (`eventKey`),
  INDEX `pwa_alerts_audience_id_idx` (`audience`, `id`),
  INDEX `pwa_alerts_deliveredAt_nextAttemptAt_idx` (`deliveredAt`, `nextAttemptAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
