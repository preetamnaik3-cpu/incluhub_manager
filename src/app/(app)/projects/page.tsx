import { ProjectsClient } from "./projects-client";
import { requireUser } from "@/lib/auth";
import { getProjectsForUser } from "@/lib/data";

export default async function ProjectsPage() {
  const profile = await requireUser();
  const projects = await getProjectsForUser(profile);

  return <ProjectsClient projects={projects} profile={profile} />;
}
