/**
 * CLI script to promote a user to superadmin role.
 *
 * Usage:
 *   npx tsx src/scripts/promote-superadmin.ts <email>
 *
 * Example:
 *   npx tsx src/scripts/promote-superadmin.ts admin@example.com
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.
 */

import { createClient } from "@supabase/supabase-js";

const email = process.argv[2];

if (!email) {
  console.error("Usage: npx tsx src/scripts/promote-superadmin.ts <email>");
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // First, check if user exists
  const { data: existing, error: lookupError } = await supabase
    .from("users")
    .select("id, email, role")
    .eq("email", email)
    .single();

  if (lookupError || !existing) {
    console.error(`User not found with email: ${email}`);
    console.error("The user must log in at least once before they can be promoted.");
    process.exit(1);
  }

  if (existing.role === "superadmin") {
    console.log(`${email} is already a superadmin.`);
    process.exit(0);
  }

  // Promote to superadmin
  const { error: updateError } = await supabase
    .from("users")
    .update({ role: "superadmin" })
    .eq("id", existing.id);

  if (updateError) {
    console.error("Failed to promote user:", updateError.message);
    process.exit(1);
  }

  console.log(`${email} has been promoted to superadmin.`);
}

main();
