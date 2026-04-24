CREATE TABLE `ai_settings` (
  `id` CHAR(36) NOT NULL,
  `active_provider` VARCHAR(64) NOT NULL DEFAULT 'openai',
  `active_chat_model` VARCHAR(128) NOT NULL DEFAULT 'gpt-5',
  `active_embedding_model` VARCHAR(128) NOT NULL DEFAULT 'text-embedding-3-large',
  `rag_mode` VARCHAR(32) NOT NULL DEFAULT 'internal',
  `top_k` INTEGER NOT NULL DEFAULT 5,
  `max_chunks` INTEGER NOT NULL DEFAULT 8,
  `temperature` DOUBLE NOT NULL DEFAULT 0.2,
  `updated_by` CHAR(36) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `ai_settings_updated_by_fkey`
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ai_document_index` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NULL,
  `record_type` VARCHAR(64) NOT NULL,
  `record_id` CHAR(36) NOT NULL,
  `title` VARCHAR(191) NULL,
  `file_path` VARCHAR(512) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `mime_type` VARCHAR(191) NULL,
  `document_hash` VARCHAR(191) NULL,
  `provider` VARCHAR(64) NULL,
  `embedding_model` VARCHAR(128) NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'pending',
  `is_verified_snapshot` BOOLEAN NOT NULL DEFAULT false,
  `search_text` LONGTEXT NULL,
  `metadata_json` JSON NULL,
  `last_error` LONGTEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `ai_document_index_record_type_record_id_key`(`record_type`, `record_id`),
  INDEX `ai_document_index_status_idx`(`status`),
  INDEX `ai_document_index_is_verified_snapshot_idx`(`is_verified_snapshot`),
  PRIMARY KEY (`id`),
  CONSTRAINT `ai_document_index_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ai_chat_sessions` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `title` VARCHAR(191) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `ai_chat_sessions_user_id_idx`(`user_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `ai_chat_sessions_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ai_chat_messages` (
  `id` CHAR(36) NOT NULL,
  `session_id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NULL,
  `role` VARCHAR(32) NOT NULL,
  `content` LONGTEXT NOT NULL,
  `sources_json` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `ai_chat_messages_session_id_created_at_idx`(`session_id`, `created_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `ai_chat_messages_session_id_fkey`
    FOREIGN KEY (`session_id`) REFERENCES `ai_chat_sessions`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ai_chat_messages_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
