ALTER TABLE `certificates`
  ADD COLUMN `ocr_file_name` VARCHAR(255) NULL,
  ADD COLUMN `ocr_file_path` VARCHAR(512) NULL,
  ADD COLUMN `ocr_file_size` INT NULL,
  ADD COLUMN `ocr_mime_type` VARCHAR(191) NULL;
