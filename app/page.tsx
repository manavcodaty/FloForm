import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PRINCIPLES = [
  {
    title: "Structured, not chaotic",
    body: "FlôForm breaks overwhelming forms into guided steps with clear progress and focused decisions."
  },
  {
    title: "Evidence-backed extraction",
    body: "Every extracted field includes confidence and source evidence so users understand where values came from."
  },
  {
    title: "Human approval first",
    body: "Nothing is submitted without explicit user approval. Sensitive and low-confidence fields are always reviewed."
  }
];

const FLOW = [
  "Upload documents (PDF/image/text)",
  "Extract profile with confidence + evidence",
  "Map values into the hosted form schema",
  "Review flagged fields and approve",
  "Submit only after final user approval"
];

const WHO_ITS_FOR = [
  "Students applying for scholarships",
  "People with ADHD or executive dysfunction",
  "Users who want transparency and control"
];

export default function LandingPage() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10">
      <section className="relative overflow-hidden rounded-2xl border border-[#B8EAE5] bg-white p-8 shadow-sm">
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[#39B7AD]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[#F2C94C]/25 blur-3xl" />
        <div className="relative max-w-3xl space-y-5">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#B8EAE5] bg-[#ECFAF8] px-3 py-1 text-xs font-medium text-[#2B8F88]">
            <Sparkles className="h-3.5 w-3.5" /> FlôForm Assistant
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            FlôForm completes complex forms for you, safely.
          </h1>
          <p className="text-lg text-slate-600">
            A supervised autonomous assistant for people who need clarity, momentum, and control when forms feel overwhelming.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <SignedOut>
              <SignInButton mode="modal">
                <Button>
                  Start with FlôForm <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link href="/app/new">
                <Button>
                  Start with FlôForm <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </SignedIn>
            <Link href="/app/new">
              <Button variant="secondary">See complete demo flow</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {PRINCIPLES.map((item) => (
          <Card key={item.title} className="border-[#B8EAE5]">
            <CardHeader>
              <CardTitle className="text-base">{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">{item.body}</CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-[#B8EAE5]">
          <CardHeader>
            <CardTitle>What FlôForm does</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm text-slate-700">
              {FLOW.map((step, index) => (
                <li key={step} className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#39B7AD] text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card className="border-[#F2C94C]">
          <CardHeader>
            <CardTitle>Who it is for</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-slate-700">
              {WHO_ITS_FOR.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#7A5A00]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-2xl border border-[#B8EAE5] bg-white p-6">
        <div className="flex items-start gap-3 text-sm text-slate-700">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-[#2B8F88]" />
          <div className="space-y-1">
            <p className="font-medium text-slate-900">Safety commitment</p>
            <p>
              FlôForm never submits on your behalf without explicit final approval. Every important action is logged, reviewable, and reversible.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
