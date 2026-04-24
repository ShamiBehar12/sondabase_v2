CREATE TABLE `ai_document_chunks` (
  `id` CHAR(36) NOT NULL,
  `document_index_id` CHAR(36) NOT NULL,
  `chunk_order` INTEGER NOT NULL,
  `chunk_text` LONGTEXT NOT NULL,
  `embedding_json` JSON NULL,
  `token_count` INTEGER NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `ai_document_chunks_document_index_id_chunk_order_idx`(`document_index_id`, `chunk_order`),
  PRIMARY KEY (`id`),
  CONSTRAINT `ai_document_chunks_document_index_id_fkey`
    FOREIGN KEY (`document_index_id`) REFERENCES `ai_document_index`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
