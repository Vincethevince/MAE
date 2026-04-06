"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import { addProviderBlock, removeProviderBlock } from "./blockActions";

interface Block {
  id: string;
  start_time: string;
  end_time: string;
  label: string | null;
}

interface BlocksSectionProps {
  blocks: Block[];
  locale: string;
  labels: {
    title: string;
    description: string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    labelField: string;
    addButton: string;
    removeButton: string;
    noBlocks: string;
    validationError: string;
    saveFailed: string;
  };
}

function formatBlockRange(startIso: string, endIso: string, locale: string): string {
  const fmt = new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return `${fmt.format(new Date(startIso))} – ${fmt.format(new Date(endIso))}`;
}

export function BlocksSection({ blocks, locale, labels }: BlocksSectionProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAdd(formData: FormData) {
    setError(null);
    setLoading(true);
    formData.set("locale", locale);
    const result = await addProviderBlock(formData);
    setLoading(false);
    if (result.error) {
      setError(result.error === "validationError" ? labels.validationError : labels.saveFailed);
    }
  }

  async function handleRemove(blockId: string) {
    const fd = new FormData();
    fd.set("blockId", blockId);
    fd.set("locale", locale);
    await removeProviderBlock(fd);
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.title}</CardTitle>
        <CardDescription>{labels.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Existing blocks list */}
        {blocks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{labels.noBlocks}</p>
        ) : (
          <ul className="space-y-2">
            {blocks.map((block) => (
              <li key={block.id} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">
                    {block.label || formatBlockRange(block.start_time, block.end_time, locale)}
                  </span>
                  {block.label && (
                    <span className="text-xs text-muted-foreground">
                      {formatBlockRange(block.start_time, block.end_time, locale)}
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleRemove(block.id)}
                  aria-label={labels.removeButton}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {/* Add block form */}
        <form action={handleAdd} className="space-y-4 border-t pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="startDate">{labels.startDate}</Label>
              <Input id="startDate" name="startDate" type="date" min={today} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="startTime">{labels.startTime}</Label>
              <Input id="startTime" name="startTime" type="time" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">{labels.endDate}</Label>
              <Input id="endDate" name="endDate" type="date" min={today} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endTime">{labels.endTime}</Label>
              <Input id="endTime" name="endTime" type="time" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="label">{labels.labelField}</Label>
            <Input id="label" name="label" type="text" placeholder="e.g. Vacation, Holiday" maxLength={100} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading}>
            {labels.addButton}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
