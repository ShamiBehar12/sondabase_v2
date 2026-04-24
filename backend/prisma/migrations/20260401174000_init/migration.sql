-- CreateTable
CREATE TABLE `users` (
    `id` CHAR(36) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `reset_token` VARCHAR(191) NULL,
    `reset_token_expires_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profiles` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `full_name` VARCHAR(191) NULL,
    `avatar_url` VARCHAR(512) NULL,
    `language_preference` VARCHAR(12) NULL,
    `certificates_view_mode` VARCHAR(12) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `profiles_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_roles` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `role` VARCHAR(32) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_roles_user_id_role_key`(`user_id`, `role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `certificates` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `description_en` TEXT NULL,
    `description_es` TEXT NULL,
    `description_pt` TEXT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(512) NOT NULL,
    `file_size` INTEGER NOT NULL,
    `mime_type` VARCHAR(191) NOT NULL,
    `issued_date` VARCHAR(64) NULL,
    `contract_start_date` VARCHAR(64) NULL,
    `contract_end_date` VARCHAR(64) NULL,
    `issuing_organization` VARCHAR(191) NULL,
    `certificate_number` VARCHAR(191) NULL,
    `country` VARCHAR(128) NULL,
    `tags` JSON NULL,
    `is_verified` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `professional_certificates` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `description_pt` TEXT NULL,
    `description_en` TEXT NULL,
    `description_es` TEXT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(512) NOT NULL,
    `file_size` INTEGER NOT NULL,
    `mime_type` VARCHAR(191) NOT NULL,
    `professional_registration_number` VARCHAR(191) NULL,
    `professional_council` VARCHAR(191) NULL,
    `institution` VARCHAR(191) NULL,
    `certification_type` VARCHAR(191) NULL,
    `specialization_area` VARCHAR(191) NULL,
    `course_hours` INTEGER NULL,
    `status` VARCHAR(64) NULL,
    `issued_date` VARCHAR(64) NULL,
    `valid_from` VARCHAR(64) NULL,
    `valid_until` VARCHAR(64) NULL,
    `country` VARCHAR(128) NULL,
    `state_province` VARCHAR(128) NULL,
    `city` VARCHAR(128) NULL,
    `is_verified` BOOLEAN NOT NULL DEFAULT false,
    `verification_notes` TEXT NULL,
    `tags` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `certificate_approvals` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NULL,
    `admin_id` CHAR(36) NOT NULL,
    `certificate_id` CHAR(36) NOT NULL,
    `certificate_type` VARCHAR(64) NOT NULL,
    `original_title` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `certificate_rejections` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NULL,
    `admin_id` CHAR(36) NOT NULL,
    `certificate_id` CHAR(36) NOT NULL,
    `certificate_type` VARCHAR(64) NOT NULL,
    `original_title` VARCHAR(191) NULL,
    `rejection_reason` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `success_stories` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `title_pt` VARCHAR(191) NULL,
    `title_en` VARCHAR(191) NULL,
    `title_es` VARCHAR(191) NULL,
    `client_pt` VARCHAR(191) NULL,
    `client_en` VARCHAR(191) NULL,
    `client_es` VARCHAR(191) NULL,
    `country_pt` VARCHAR(128) NULL,
    `country_en` VARCHAR(128) NULL,
    `country_es` VARCHAR(128) NULL,
    `product_pt` VARCHAR(191) NULL,
    `product_en` VARCHAR(191) NULL,
    `product_es` VARCHAR(191) NULL,
    `challenge_pt` TEXT NULL,
    `challenge_en` TEXT NULL,
    `challenge_es` TEXT NULL,
    `solution_pt` TEXT NULL,
    `solution_en` TEXT NULL,
    `solution_es` TEXT NULL,
    `benefits_pt` TEXT NULL,
    `benefits_en` TEXT NULL,
    `benefits_es` TEXT NULL,
    `contract_period` VARCHAR(191) NULL,
    `contract_value` VARCHAR(191) NULL,
    `closure_year` VARCHAR(32) NULL,
    `client_logo` VARCHAR(512) NULL,
    `image_01` VARCHAR(512) NULL,
    `image_02` VARCHAR(512) NULL,
    `image_03` VARCHAR(512) NULL,
    `image_04` VARCHAR(512) NULL,
    `tags` JSON NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'rascunho',
    `is_verified` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `success_story_approvals` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NULL,
    `admin_id` CHAR(36) NOT NULL,
    `story_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `success_story_rejections` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NULL,
    `admin_id` CHAR(36) NOT NULL,
    `story_id` CHAR(36) NOT NULL,
    `rejection_reason` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `content_types` (
    `id` CHAR(36) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name_pt` VARCHAR(191) NOT NULL,
    `name_es` VARCHAR(191) NOT NULL,
    `name_en` VARCHAR(191) NOT NULL,
    `description_pt` TEXT NULL,
    `description_es` TEXT NULL,
    `description_en` TEXT NULL,
    `schema_campos` JSON NULL,
    `regras_aprovacao` JSON NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `content_types_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `content_items` (
    `id` CHAR(36) NOT NULL,
    `type_id` CHAR(36) NOT NULL,
    `autor_id` CHAR(36) NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'rascunho',
    `dados` JSON NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `publish_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `content_reviews` (
    `id` CHAR(36) NOT NULL,
    `item_id` CHAR(36) NOT NULL,
    `reviewer_id` CHAR(36) NOT NULL,
    `decisao` VARCHAR(32) NOT NULL,
    `comentario` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `content_notifications` (
    `id` CHAR(36) NOT NULL,
    `item_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `tipo` VARCHAR(64) NOT NULL,
    `lida` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `content_attachments` (
    `id` CHAR(36) NOT NULL,
    `item_id` CHAR(36) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(512) NOT NULL,
    `file_size` INTEGER NOT NULL,
    `mime_type` VARCHAR(191) NOT NULL,
    `hash` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `content_audit_logs` (
    `id` CHAR(36) NOT NULL,
    `acao` VARCHAR(128) NOT NULL,
    `actor_id` CHAR(36) NOT NULL,
    `item_id` CHAR(36) NULL,
    `payload` JSON NULL,
    `ip_address` VARCHAR(128) NULL,
    `user_agent` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `avatar_templates` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `file_path` VARCHAR(512) NOT NULL,
    `category` VARCHAR(128) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tags` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NULL,
    `usage_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tags_name_key`(`name`),
    UNIQUE INDEX `tags_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `profiles` ADD CONSTRAINT `profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `certificates` ADD CONSTRAINT `certificates_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `professional_certificates` ADD CONSTRAINT `professional_certificates_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `success_stories` ADD CONSTRAINT `success_stories_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `content_items` ADD CONSTRAINT `content_items_type_id_fkey` FOREIGN KEY (`type_id`) REFERENCES `content_types`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `content_items` ADD CONSTRAINT `content_items_autor_id_fkey` FOREIGN KEY (`autor_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `content_reviews` ADD CONSTRAINT `content_reviews_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `content_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `content_reviews` ADD CONSTRAINT `content_reviews_reviewer_id_fkey` FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `content_notifications` ADD CONSTRAINT `content_notifications_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `content_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `content_attachments` ADD CONSTRAINT `content_attachments_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `content_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `content_audit_logs` ADD CONSTRAINT `content_audit_logs_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

