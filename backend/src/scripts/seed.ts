import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../lib/auth.js";

async function main() {
  const email = "admin@sondabase.local";
  const existing = await prisma.user.findUnique({
    where: { email },
    include: { roles: true },
  });

  if (existing) {
    if (!existing.roles.some((role) => role.role === "admin")) {
      await prisma.userRole.create({
        data: {
          userId: existing.id,
          role: "admin",
        },
      });
    }

    console.log(`Admin user already exists: ${email}`);
    return;
  }

  const passwordHash = await hashPassword("Admin123!");

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      profile: {
        create: {
          fullName: "Administrador",
          languagePreference: "pt",
          certificatesViewMode: "grid",
        },
      },
      roles: {
        create: {
          role: "admin",
        },
      },
    },
  });

  console.log("Admin user created");
  console.log(`email=${email}`);
  console.log("password=Admin123!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
