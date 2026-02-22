import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { listRunSnapshotsData } from "@/lib/server-data";

export default async function TraceViewerPage() {
  const snapshots = await listRunSnapshotsData();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Trace Viewer</CardTitle>
          <CardDescription>Workflow runs, top-level trace IDs, and resumable state snapshots.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {snapshots.length === 0 ? <p className="text-slate-500">No traces yet.</p> : null}
          {snapshots.map((snapshot: any) => (
            <div key={snapshot._id} className="rounded border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Run {snapshot.runId}</p>
                  <p className="text-slate-600">Application {snapshot.applicationId}</p>
                </div>
                <Badge variant={snapshot.status === "active" ? "warning" : "secondary"}>{snapshot.status}</Badge>
              </div>
              <p className="mt-2 text-slate-600">Updated {formatDateTime(snapshot.updatedAt)}</p>
              <details className="mt-2 rounded border bg-slate-50 p-2">
                <summary>State JSON</summary>
                <pre className="mt-2 overflow-auto text-xs">{snapshot.stateJson}</pre>
              </details>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
