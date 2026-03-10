import { initializeDatabase, getWounds } from "./src/lib/db.js";

async function main() {
  try {
    await initializeDatabase();
    const wounds = await getWounds("2a4be090-4a4c-4f09-9cba-351efc00e4b2");
    console.log("wounds length:", wounds.length);
  } catch (e) {
    console.error("FAILED:", e);
  }
}

main();
