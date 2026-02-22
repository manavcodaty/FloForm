"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, ImageIcon, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type UploadedItem = {
  file: File;
  kind: "pdf" | "image";
};

type StreamEvent = {
  type: string;
  message?: string;
};

export function NewApplicationFlow() {
  const router = useRouter();
  const [pdfs, setPdfs] = useState<UploadedItem[]>([]);
  const [images, setImages] = useState<UploadedItem[]>([]);
  const [textFallback, setTextFallback] = useState("");
  const [processing, setProcessing] = useState(false);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const canProceed = useMemo(() => pdfs.length > 0 || images.length > 0 || textFallback.trim().length > 0, [pdfs, images, textFallback]);

  async function onRun() {
    setProcessing(true);
    setEvents([]);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const appRes = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Scholarship Application", formType: "scholarship" })
      });
      if (!appRes.ok) throw new Error("Could not create application");
      const appData = await appRes.json();
      const applicationId = appData.applicationId as string;

      const allFiles = [...pdfs, ...images];
      for (const fileItem of allFiles) {
        const formData = new FormData();
        formData.append("applicationId", applicationId);
        formData.append("file", fileItem.file);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (!uploadRes.ok) {
          throw new Error(`Upload failed: ${fileItem.file.name}`);
        }
        const uploadData = await uploadRes.json();

        if (fileItem.kind === "pdf") {
          const extractForm = new FormData();
          extractForm.append("file", fileItem.file);
          const extractRes = await fetch("/api/extract-text", { method: "POST", body: extractForm });
          if (extractRes.ok) {
            const extracted = await extractRes.json();
            if (extracted.text && uploadData.documentId) {
              await fetch("/api/documents/attach-text", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ documentId: uploadData.documentId, extractedText: extracted.text })
              });
            }
          }
        }
      }

      if (textFallback.trim()) {
        await fetch("/api/documents/text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            applicationId,
            text: textFallback,
            filename: "pasted-text.txt"
          })
        });
      }

      const streamRes = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          applicationId,
          workflow: "CREATE_APPLICATION_AND_FILL"
        })
      });
      if (!streamRes.ok || !streamRes.body) {
        throw new Error("Could not start run");
      }

      const reader = streamRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";
        for (const chunk of chunks) {
          const line = chunk
            .split("\n")
            .find((l) => l.startsWith("data:"));
          if (!line) continue;
          const data = JSON.parse(line.replace("data: ", ""));
          if (data.message) {
            setEvents((prev) => {
              const last = prev[prev.length - 1];
              if (last?.message === data.message && last?.type === data.type) {
                return prev;
              }
              return [...prev, data];
            });
          }
          if (data.type === "completed" || data.type === "interruption") {
            router.push(`/app/applications/${applicationId}/run`);
          }
        }
      }
    } catch (error) {
      setEvents((prev) => [
        ...prev,
        {
          type: "error",
          message: error instanceof Error ? error.message : "Unexpected error"
        }
      ]);
    } finally {
      setProcessing(false);
      abortRef.current = null;
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Upload documents</CardTitle>
          <CardDescription>Provide PDF + ID image. Text paste is available as fallback.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <section className="space-y-2 rounded-lg border p-3">
              <label className="text-sm font-medium">PDF upload</label>
              <Input
                aria-label="Upload PDF documents"
                type="file"
                accept="application/pdf"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []).map((file) => ({ file, kind: "pdf" as const }));
                  setPdfs((prev) => [...prev, ...files]);
                }}
              />
              <ul className="space-y-1 text-sm">
                {pdfs.map((item, index) => (
                  <li key={`${item.file.name}-${index}`} className="flex items-center justify-between rounded border p-2">
                    <span className="flex items-center gap-2"><FileText className="h-4 w-4" />{item.file.name}</span>
                    <button
                      aria-label={`Remove ${item.file.name}`}
                      onClick={() => setPdfs((prev) => prev.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-2 rounded-lg border p-3">
              <label className="text-sm font-medium">Image upload (passport/ID)</label>
              <Input
                aria-label="Upload image documents"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []).map((file) => ({ file, kind: "image" as const }));
                  setImages((prev) => [...prev, ...files]);
                }}
              />
              <ul className="space-y-1 text-sm">
                {images.map((item, index) => (
                  <li key={`${item.file.name}-${index}`} className="flex items-center justify-between rounded border p-2">
                    <span className="flex items-center gap-2"><ImageIcon className="h-4 w-4" />{item.file.name}</span>
                    <button
                      aria-label={`Remove ${item.file.name}`}
                      onClick={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="space-y-2 rounded-lg border p-3">
            <label htmlFor="textFallback" className="text-sm font-medium">Fallback text paste</label>
            <Textarea
              id="textFallback"
              aria-label="Fallback text"
              placeholder="Paste resume or profile text"
              value={textFallback}
              onChange={(e) => setTextFallback(e.target.value)}
            />
          </section>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={onRun} loading={processing} disabled={!canProceed}>
              <UploadCloud className="mr-2 h-4 w-4" /> Extract my profile
            </Button>
            {abortRef.current ? (
              <Button variant="secondary" onClick={() => abortRef.current?.abort()}>
                Stop
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Streaming run output</CardTitle>
          <CardDescription>Live status from the supervisor workflow</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm">
            {events.length === 0 ? <li className="text-slate-500">No events yet.</li> : null}
            {events.map((event, index) => (
              <li key={`${event.type}-${index}`} className="rounded border p-2">
                {event.message ?? event.type}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
