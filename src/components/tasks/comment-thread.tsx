"use client";

import { addComment } from "@/app/actions/tasks";
import { RoleBadge } from "@/components/ui/role-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Comment, Profile } from "@/lib/types";
import { can } from "@/lib/permissions";
import { COPY } from "@/lib/roles";
import { useState } from "react";
import { toast } from "sonner";

export function CommentThread({
  comments,
  taskId,
  boardId,
  profile,
}: {
  comments: Comment[];
  taskId: string;
  boardId: string;
  profile: Profile;
}) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.set("taskId", taskId);
      fd.set("boardId", boardId);
      fd.set("content", content);
      await addComment(fd);
      setContent("");
      toast.success(COPY.commentSent);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to comment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-neutral-900">Comments</h4>
      <div className="max-h-48 space-y-3 overflow-y-auto">
        {comments.length === 0 && (
          <p className="text-sm text-neutral-400">No comments yet — start the conversation!</p>
        )}
        {comments.map((comment) => (
          <div
            key={comment.id}
            className="rounded-xl border border-neutral-100 bg-neutral-50 p-3"
          >
            <div className="mb-1 flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-900">
                {comment.author?.full_name || comment.author?.email}
              </span>
              {comment.author && <RoleBadge role={comment.author.role} />}
              <span className="text-xs text-neutral-400">
                {new Date(comment.created_at).toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-neutral-600">{comment.content}</p>
          </div>
        ))}
      </div>

      {can(profile, "comment") && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a comment..."
          />
          <Button type="submit" size="sm" disabled={loading}>
            Send
          </Button>
        </form>
      )}
    </div>
  );
}
