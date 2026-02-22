import { NextRequest, NextResponse } from "next/server";
import { convexMutation } from "@/lib/convex-server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = await convexMutation<{ title: string; formType: string }, { applicationId: string }>(
    "klerki:createApplication",
    {
      title: body.title,
      formType: body.formType
    }
  );

  return NextResponse.json(result);
}
