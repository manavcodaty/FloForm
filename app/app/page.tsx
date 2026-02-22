import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDateTime } from "@/lib/utils";
import { listApplicationsData } from "@/lib/server-data";

const statusStyle: Record<string, "secondary" | "warning" | "success"> = {
  draft: "secondary",
  needs_review: "warning",
  ready_to_submit: "success",
  submitted: "success"
};

export default async function DashboardPage() {
  const applications = await listApplicationsData();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Start new application</CardTitle>
            <CardDescription>Create a new Scholarship Application run.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/app/new">
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Start new application
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent applications</CardTitle>
            <CardDescription>Track draft, review, and submission status.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">{applications.length} applications</CardContent>
        </Card>
      </div>

      <div className="grid gap-3">
        {applications.map((app) => (
          <Link key={app._id} href={`/app/applications/${app._id}/run`}>
            <Card className="hover:border-[#39B7AD]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{app.title ?? "Scholarship Application"}</CardTitle>
                  <Badge variant={statusStyle[app.status] ?? "secondary"}>{app.status.replaceAll("_", " ")}</Badge>
                </div>
                <CardDescription>Updated {formatDateTime(app.updatedAt)}</CardDescription>
              </CardHeader>
              <CardContent>
                <Progress value={app.progress ?? 0} />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
