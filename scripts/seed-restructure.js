/**
 * Run after pasting supabase/migrations/005_restructure_roles.sql in Supabase SQL Editor.
 * Seeds Elvix & Kosara projects and links existing data.
 */
const fs = require("fs");
const WebSocket = require("ws");
const { createClient } = require("@supabase/supabase-js");

global.WebSocket = WebSocket;

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function ensureProject(name) {
  const { data: existing } = await supabase.from("projects").select("id").ilike("name", name).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase.from("projects").insert({ name, description: `${name} client company` }).select("id").single();
  if (error) throw error;
  return data.id;
}

async function main() {
  const elvixId = await ensureProject("Elvix");
  const kosaraId = await ensureProject("Kosara");

  const mappings = [
    { teamNames: ["elevx", "elvix"], projectId: elvixId },
    { teamNames: ["kosarah", "kosara"], projectId: kosaraId },
  ];

  for (const { teamNames, projectId } of mappings) {
    for (const n of teamNames) {
      await supabase.from("teams").update({ project_id: projectId }).ilike("name", n);
    }
  }

  const { data: incluhub } = await supabase.from("profiles").select("id").eq("email", "contact@incluhub.in").maybeSingle();
  if (incluhub) {
    await supabase.from("profiles").update({ role: "manager", client_project_id: null }).eq("id", incluhub.id);
    for (const pid of [elvixId, kosaraId]) {
      await supabase.from("project_managers").upsert({ project_id: pid, profile_id: incluhub.id });
    }
  }

  const { data: preetam } = await supabase.from("profiles").select("id").eq("email", "preetam.naik3@gmail.com").maybeSingle();
  if (preetam) {
    await supabase.from("profiles").update({ role: "super_admin" }).eq("id", preetam.id);
  }

  // Ensure boards for all teams
  const { data: teams } = await supabase.from("teams").select("id,name,project_id");
  for (const t of teams ?? []) {
    const { data: board } = await supabase.from("boards").select("id").eq("team_id", t.id).maybeSingle();
    if (!board) {
      await supabase.from("boards").insert({ name: `${t.name} Board`, team_id: t.id });
    }
  }

  console.log("Seed complete. Projects:", { elvixId, kosaraId });
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
