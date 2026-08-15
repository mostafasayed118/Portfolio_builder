/**
 * Verify that the Clerk JWT template used for admin auth includes the
 * `email` claim (or `emailAddress`), which `adminAuth.ts` reads to match
 * against the ADMIN_EMAILS allowlist.
 *
 * Usage (from artifacts/api-server):
 *   CLERK_SECRET_KEY=sk_test_... node scripts/verify-jwt-template.mjs
 *   # optional explicit template name (defaults to VITE_CLERK_JWT_TEMPLATE or "admin"):
 *   CLERK_SECRET_KEY=sk_test_... node scripts/verify-jwt-template.mjs my-template
 */
import { createClerkClient } from "@clerk/backend";

const secretKey = process.env.CLERK_SECRET_KEY || process.argv[2];
const templateName = process.env.VITE_CLERK_JWT_TEMPLATE || process.argv[3] || "admin";

if (!secretKey) {
  console.error("Missing CLERK_SECRET_KEY.");
  console.error("Usage: CLERK_SECRET_KEY=sk_test_... node scripts/verify-jwt-template.mjs [template-name]");
  process.exit(2);
}

const clerk = createClerkClient({ secretKey });
const { data: templates, totalCount } = await clerk.jwtTemplates.list();

console.log(`Clerk JWT templates found: ${totalCount}`);
for (const t of templates) {
  console.log(`  - "${t.name}" (id=${t.id})`);
}

const match = templates.find((t) => t.name === templateName);
if (!match) {
  console.error(`\n❌ No JWT template named "${templateName}" exists.`);
  console.error("   Create it in Clerk Dashboard → JWT Templates with:");
  console.error('     claim "email" = {{user.primary_email_address}}');
  process.exit(1);
}

const claims = match.claims ?? {};
const emailClaim = claims.email ?? claims.emailAddress;

console.log(`\nTemplate "${match.name}" claims:`);
console.log(JSON.stringify(claims, null, 2));

if (emailClaim) {
  console.log(`\n✅ Template "${match.name}" includes the email claim: ${JSON.stringify(emailClaim)}`);
  if (String(emailClaim).includes("primary_email_address")) {
    console.log("   Value references {{user.primary_email_address}} — correct.");
  }
  process.exit(0);
}

console.error(`\n❌ Template "${match.name}" is MISSING the email claim.`);
console.error('   Add claim "email" = {{user.primary_email_address}} and save.');
process.exit(1);
