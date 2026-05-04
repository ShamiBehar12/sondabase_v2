CREATE TABLE `analytics_events` (
  `id`          CHAR(36)     NOT NULL,
  `user_id`     CHAR(36)     NOT NULL,
  `event_type`  VARCHAR(64)  NOT NULL,
  `page`        VARCHAR(255) NULL,
  `metadata`    JSON         NULL,
  `duration_ms` INT          NULL,
  `created_at`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `analytics_events_user_id_idx` (`user_id`),
  INDEX `analytics_events_event_type_idx` (`event_type`),
  INDEX `analytics_events_created_at_idx` (`created_at`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
