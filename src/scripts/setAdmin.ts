/**
 * Script to set a user as admin
 * Usage: npx tsx src/scripts/setAdmin.ts <email>
 * Example: npx tsx src/scripts/setAdmin.ts admin@example.com
 */

import "dotenv/config";
import { connectDatabase } from "../config/database.js";
import { User, UserRole } from "../models/index.js";

async function setAdmin(email: string) {
  try {
    await connectDatabase();

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.error(`❌ User with email ${email} not found`);
      process.exit(1);
    }

    user.role = UserRole.ADMIN;
    await user.save();

    console.log(`✅ User ${email} is now an admin!`);
    console.log(`   - Role: ${user.role}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Name: ${user.name || "N/A"}`);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

const email = process.argv[2];

if (!email) {
  console.error("Please provide an email address");
  console.error("Usage: npx tsx src/scripts/setAdmin.ts <email>");
  process.exit(1);
}

setAdmin(email);
