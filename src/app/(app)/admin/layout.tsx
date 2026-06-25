import { requireRole } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["super_admin"]);

  return (
    <div className="flex h-full flex-col">
      <AdminNav />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
