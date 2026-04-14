"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { createWikiPage } from "@/fsd/shared/lib/wiki-pages/api";
import {
  getEmptyEditorState,
  stringifyEditorState,
} from "@/fsd/shared/lib/wiki-pages/editor-state";
import { Button } from "@/fsd/shared/ui/button";
import { Input } from "@/fsd/shared/ui/input";
import { Label } from "@/fsd/shared/ui/label";

/**
 * Page for creating a new Wiki document.
 */
export default function WikiPageCreatePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const onCreate = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const page = await createWikiPage({
        title: title.trim() || "Без названия",
        description: "", // Initial empty description
        content: stringifyEditorState(getEmptyEditorState()),
        mwsTableId: null,
      });

      router.push(`/wiki/${page.slug}`);
    } catch (createError) {
      if (isMountedRef.current) {
        setError(
          createError instanceof Error
            ? createError.message
            : "Не удалось создать документ",
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Новый документ WikiLive</h1>
        </div>
        <Link href="/wiki">
          <Button variant="outline">К документам</Button>
        </Link>
      </header>

      <section className="rounded-md border p-4 bg-card shadow-sm">
        <div className="space-y-2">
          <Label htmlFor="wiki-page-title">Название документа</Label>
          <Input
            id="wiki-page-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Например: План квартала, Онбординг, API-гайд"
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void onCreate();
              }
            }}
          />
        </div>

        {error && (
          <p className="mt-3 text-sm text-destructive font-medium">{error}</p>
        )}

        <div className="mt-4">
          <Button onClick={() => void onCreate()} disabled={isSubmitting}>
            {isSubmitting ? "Создание..." : "Создать документ"}
          </Button>
        </div>
      </section>
    </main>
  );
}
