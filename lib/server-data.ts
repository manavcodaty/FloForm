import { convexQuery } from "@/lib/convex-server";

function requireApplicationId(applicationId: string) {
  if (!applicationId) {
    throw new Error("Missing route parameter: applicationId");
  }
}

export async function listApplicationsData() {
  try {
    const apps = await convexQuery<Record<string, never>, any[]>("klerki:listApplications", {});
    return apps;
  } catch {
    return [];
  }
}

export async function getApplicationData(applicationId: string) {
  requireApplicationId(applicationId);
  return convexQuery<{ applicationId: string }, any>("klerki:getApplication", { applicationId });
}

export async function getApplicationDocuments(applicationId: string) {
  requireApplicationId(applicationId);
  return convexQuery<{ applicationId: string }, any[]>("klerki:getDocuments", { applicationId });
}

export async function getApplicationProfile(applicationId: string) {
  requireApplicationId(applicationId);
  return convexQuery<{ applicationId: string }, any>("klerki:getProfile", { applicationId });
}

export async function getApplicationMapping(applicationId: string) {
  requireApplicationId(applicationId);
  return convexQuery<{ applicationId: string }, any>("klerki:getMappingPlan", { applicationId });
}

export async function getApplicationDraft(applicationId: string) {
  requireApplicationId(applicationId);
  return convexQuery<{ applicationId: string }, any>("klerki:getFillDraft", { applicationId });
}

export async function getApplicationApprovals(applicationId: string) {
  requireApplicationId(applicationId);
  return convexQuery<{ applicationId: string }, any[]>("klerki:listApprovalTasks", { applicationId });
}

export async function getApplicationAudit(applicationId: string) {
  requireApplicationId(applicationId);
  return convexQuery<{ applicationId: string }, any[]>("klerki:listAuditEvents", { applicationId });
}

export async function listRunSnapshotsData() {
  try {
    return await convexQuery<Record<string, never>, any[]>("klerki:listRunStateSnapshots", {});
  } catch {
    return [];
  }
}
