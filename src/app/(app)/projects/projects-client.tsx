"use client";

import { createCompanyProject } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RoleBadge } from "@/components/ui/role-badge";
import type { Profile, Project } from "@/lib/types";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Building2, FolderKanban, Plus } from "lucide-react";

export function ProjectsClient({
  projects,
  profile,
}: {
  projects: Project[];
  profile: Profile;
}) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData(e.currentTarget);
      await createCompanyProject(fd);
      toast.success("Project created!");
      setShowForm(false);
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Projects</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Client companies — each project has teams, boards, and members.
          </p>
          <div className="mt-2">
            <RoleBadge role={profile.role} />
          </div>
        </div>
        {profile.role === "super_admin" && (
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-1 h-4 w-4" />
            New project
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="mb-8">
          <CardContent className="pt-5">
            <form onSubmit={handleSubmit} className="flex flex-wrap gap-3">
              <Input name="name" placeholder="Project name (e.g. Elvix)" required className="max-w-xs" />
              <Input name="description" placeholder="Description" className="max-w-sm" />
              <Button type="submit" disabled={loading}>Create</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.length === 0 ? (
          <p className="text-sm text-neutral-400">
            No projects yet. Super Admin can create Elvix, Kosara, etc.
          </p>
        ) : (
          projects.map((project) => (
            <Card key={project.id} className="transition hover:shadow-md">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-neutral-500" />
                  <h3 className="font-semibold text-neutral-900">{project.name}</h3>
                </div>
                {project.client && (
                  <p className="text-xs text-neutral-400">
                    Client: {project.client.full_name || project.client.email}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {project.description && (
                  <p className="mb-4 text-sm text-neutral-500">{project.description}</p>
                )}
                <Link href={`/projects/${project.id}`}>
                  <Button variant="secondary" size="sm">
                    <FolderKanban className="mr-1 h-4 w-4" />
                    Open project
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
