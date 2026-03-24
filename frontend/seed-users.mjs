/**
 * Seed test users into Supabase.
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=eyJ... node scripts/seed-users.mjs
 *
 * Creates 5 users (2 fans, 1 organizer, 1 creator+organizer, 1 creator)
 * with password "test123" and email verification pre-confirmed.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "Missing env vars. Run with:\n  SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/seed-users.mjs"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const TEST_USERS = [
  {
    email: "test1@test.com",
    username: "fan_user1",
    displayName: "Fan One",
    roles: null, // keep default {fan}
  },
  {
    email: "test2@test.com",
    username: "fan_user2",
    displayName: "Fan Two",
    roles: null,
  },
  {
    email: "test3@test.com",
    username: "test_organizer",
    displayName: "Test Organizer",
    roles: "{organizer}",
  },
  {
    email: "test4@test.com",
    username: "creator_organizer",
    displayName: "Creator Organizer",
    roles: "{creator,organizer}",
  },
  {
    email: "test5@test.com",
    username: "test_creator",
    displayName: "Test Creator",
    roles: "{creator}",
  },
];

async function main() {
  for (const user of TEST_USERS) {
    console.log(`Creating ${user.email} (${user.username})...`);

    // Create auth user — trigger auto-creates profile row
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: "test123",
      email_confirm: true,
      user_metadata: {
        username: user.username,
        display_name: user.displayName,
      },
    });

    if (error) {
      console.error(`  Failed: ${error.message}`);
      continue;
    }

    console.log(`  Created auth user: ${data.user.id}`);

    // Update roles if not default fan
    if (user.roles) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ roles: user.roles })
        .eq("id", data.user.id);

      if (updateError) {
        console.error(`  Failed to set roles: ${updateError.message}`);
      } else {
        console.log(`  Set roles to ${user.roles}`);
      }
    }
  }

  console.log("\nDone! All test users have password: test123");
}

main();
