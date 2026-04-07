"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { saveReviewReply } from "@/app/[locale]/(dashboard)/actions";

interface ReviewReplyEditorProps {
  reviewId: string;
  initialReply: string | null;
  locale: string;
  editLabel: string;
  saveLabel: string;
  cancelLabel: string;
  placeholderText: string;
  replyLabel: string;
}

export function ReviewReplyEditor({
  reviewId,
  initialReply,
  locale,
  editLabel,
  saveLabel,
  cancelLabel,
  placeholderText,
  replyLabel,
}: ReviewReplyEditorProps) {
  const [editing, setEditing] = useState(false);
  const [reply, setReply] = useState(initialReply ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("reviewId", reviewId);
        formData.set("reply", reply);
        formData.set("locale", locale);
        await saveReviewReply(formData);
        setEditing(false);
      } catch {
        // keep editing open on error
      }
    });
  }

  if (!editing) {
    return (
      <div className="mt-2">
        {reply ? (
          <div className="text-sm text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
            <span className="font-medium text-foreground">{replyLabel}: </span>
            {reply}
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-1 text-xs text-primary hover:underline"
        >
          {editLabel}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value.slice(0, 500))}
        placeholder={placeholderText}
        rows={3}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="flex gap-2">
        <Button size="sm" disabled={isPending} onClick={handleSave}>
          {saveLabel}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
          {cancelLabel}
        </Button>
      </div>
    </div>
  );
}
