/**
 * Creates or updates dedicated E2E test users (editor, viewer, client).
 * Run before production E2E: npm run test:e2e:seed
 *
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * and E2E_TEST_PASSWORD in env or .env.local
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .filter((l) => l && !l.startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i), l.slice(i + 1)];
      })
  );
}

const env = {
  ...loadEnvFile(path.join(process.cwd(), ".env.local")),
  ...loadEnvFile(path.join(process.cwd(), ".env.e2e.local")),
  ...process.env,
};

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const testPassword = env.E2E_TEST_PASSWORD;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!testPassword) {
  console.error("Missing E2E_TEST_PASSWORD");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const E2E_USERS = [
  { email: "e2e-editor@incluhub.in", role: "editor", memberRole: "editor" },
  { email: "e2e-viewer@incluhub.in", role: "viewer", memberRole: "viewer" },
  { email: "e2e-client@incluhub.in", role: "client" },
];

async function findUserByEmail(email) {
  let page = 1;
  while (page <= 10) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < 200) break;
    page += 1;
  }
  return null;
}

async function ensureAuthUser(email, password) {
  const existing = await findUserByEmail(email);
  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, { password });
    if (error) throw error;
    return existing.id;
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `E2E ${email.split("@")[0]}` },
  });
  if (error) throw error;
  return data.user.id;
}

async function main() {
  const { data: elvixProject, error: projectErr } = await supabase
    .from("projects")
    .select("id")
    .ilike("name", "elvix")
    .maybeSingle();
  if (projectErr) throw projectErr;
  if (!elvixProject) throw new Error("Elvix project not found — run seed-restructure first");

  const { data: elevxTeam, error: teamErr } = await supabase
    .from("teams")
    .select("id")
    .ilike("name", "elevx")
    .maybeSingle();
  if (teamErr) throw teamErr;
  if (!elevxTeam) throw new Error("elevx team not found");

  for (const spec of E2E_USERS) {
    const userId = await ensureAuthUser(spec.email, testPassword);

    const profilePatch = {
      role: spec.role,
      team_id: null,
      client_project_id: spec.role === "client" ? elvixProject.id : null,
      full_name: `E2E ${spec.role}`,
    };
    const { error: profileErr } = await supabase
      .from("profiles")
      .update(profilePatch)
      .eq("id", userId);
    if (profileErr) throw profileErr;

    if (spec.memberRole) {
      const { error: memberErr } = await supabase.from("team_members").upsert(
        {
          team_id: elevxTeam.id,
          profile_id: userId,
          member_role: spec.memberRole,
        },
        { onConflict: "team_id,profile_id" }
      );
      if (memberErr) throw memberErr;
    }

    console.log(`✓ ${spec.email} (${spec.role})`);
  }

  // Assign a task to the editor so edit-permission tests have data
  const editor = await findUserByEmail("e2e-editor@incluhub.in");
  if (editor) {
    const { data: board } = await supabase
      .from("boards")
      .select("id")
      .eq("team_id", elevxTeam.id)
      .maybeSingle();
    if (board) {
      const { data: column } = await supabase
        .from("columns")
        .select("id")
        .eq("board_id", board.id)
        .order("position")
        .limit(1)
        .maybeSingle();
      if (column) {
        const { data: existingTask } = await supabase
          .from("tasks")
          .select("id")
          .eq("assignee_id", editor.id)
          .limit(1)
          .maybeSingle();
        if (!existingTask) {
          await supabase.from("tasks").insert({
            column_id: column.id,
            title: "E2E editor assigned task",
            assignee_id: editor.id,
            created_by: editor.id,
          });
          console.log("✓ Created assigned task for e2e-editor");
        }
      }
    }
  }

  console.log("\nE2E users ready. Set these in GitHub secrets / .env.e2e.local:");
  console.log("  E2E_EDITOR_EMAIL=e2e-editor@incluhub.in");
  console.log("  E2E_VIEWER_EMAIL=e2e-viewer@incluhub.in");
  console.log("  E2E_CLIENT_EMAIL=e2e-client@incluhub.in");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
