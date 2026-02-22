import { NextRequest } from "next/server";
import { inspect } from "node:util";
import { runCreateApplicationAndFillWorkflow } from "@/lib/agents/workflow";

function sseEncode(payload: unknown) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const encoder = new TextEncoder();
  console.log("[/api/agent/run] request", inspect(body, { depth: null, maxStringLength: null }));

  const stream = new ReadableStream({
    start(controller) {
      const shouldSendToClient = (payload: any) => {
        const visible = new Set(["status", "step", "interruption", "completed", "error", "done"]);
        return visible.has(payload?.type);
      };

      const send = (payload: unknown) => {
        console.log("[/api/agent/run][sse]", inspect(payload, { depth: null, maxArrayLength: null, maxStringLength: null }));
        if (shouldSendToClient(payload)) {
          controller.enqueue(encoder.encode(sseEncode(payload)));
        }
      };

      void (async () => {
        try {
          if (body.workflow !== "CREATE_APPLICATION_AND_FILL") {
            throw new Error("Unsupported workflow");
          }

          await runCreateApplicationAndFillWorkflow({
            applicationId: body.applicationId,
            runId: body.runId,
            resumeRunId: body.resumeRunId,
            approvalDecisions: body.approvalDecisions,
            onEvent: async (event) => {
              send(event);
            }
          });

          send({ type: "done" });
        } catch (error) {
          console.error("[/api/agent/run][error]", inspect(error, { depth: null, maxStringLength: null }));
          if (error instanceof Error) {
            console.error("[/api/agent/run][error.stack]", error.stack);
            const cause = (error as Error & { cause?: unknown }).cause;
            if (cause) {
              console.error("[/api/agent/run][error.cause]", inspect(cause, { depth: null, maxStringLength: null }));
            }
          }
          send({
            type: "error",
            message: error instanceof Error ? error.message : "Workflow run failed"
          });
        } finally {
          controller.close();
        }
      })();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
      "Cache-Control": "no-cache, no-transform"
    }
  });
}
