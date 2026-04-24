import "dotenv/config";
import path from "node:path";

const rootDir = path.resolve(process.cwd(), "..");

export const env = {
  port: Number(process.env.PORT || 4000),
  host: process.env.HOST || "0.0.0.0",
  jwtSecret: process.env.JWT_SECRET || "change-me-access-secret",
  refreshSecret: process.env.REFRESH_TOKEN_SECRET || "change-me-refresh-secret",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  uploadDir: process.env.UPLOAD_DIR || path.join(rootDir, "uploads"),
  aiProvider: process.env.AI_PROVIDER || "openai",
  openAiApiKey: process.env.OPENAI_API_KEY || "",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  tesseractLangPath: process.env.TESSERACT_LANG_PATH || "",
  databaseUrl:
    process.env.DATABASE_URL ||
    "mysql://root:root@127.0.0.1:3306/sondabase",
};
