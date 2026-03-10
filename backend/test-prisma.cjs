const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const wounds = await prisma.wound.findMany({
      where: { user_id: "2a4be090-4a4c-4f09-9cba-351efc00e4b2" },
    });
    console.log("Success:", wounds);
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
