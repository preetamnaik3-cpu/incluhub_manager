import { Sidebar } from "@/components/layout/sidebar";
import { requireUser } from "@/lib/auth";
import { getBoardsForUser } from "@/lib/data";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireUser();
  const boards = await getBoardsForUser(profile);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar profile={profile} boards={boards} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
