import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const prisma = new PrismaClient();

// 🔹 reemplazo de __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔹 sube hasta root del proyecto
const PROJECT_ROOT = path.resolve(__dirname, "../../../");

// 🔹 ruta dinámica
const BASE_DIR = path.join(PROJECT_ROOT, "uploads/certificates");

const USER_ID = "f9c5c570-14d1-4893-a0ec-233039ed5c67";

async function main() {
  console.log("📂 BASE_DIR:", BASE_DIR);

  const folders = fs.readdirSync(BASE_DIR);

  for (const folder of folders) {
    const folderPath = path.join(BASE_DIR, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;

    const files = fs.readdirSync(folderPath);

    for (const file of files) {
      if (!file.endsWith(".pdf")) continue;

      const fullPath = path.join(folderPath, file);
      const stats = fs.statSync(fullPath);

      await prisma.certificate.create({
        data: {
          userId: USER_ID,
          title: file,
          fileName: file,
          filePath: `uploads/certificates/${folder}/${file}`,
          fileSize: stats.size,
          mimeType: "application/pdf",
        },
      });

      console.log("✔ Insertado:", file);
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
  });