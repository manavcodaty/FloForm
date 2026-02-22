import Link from "next/link";

export function TopNavFallback() {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight text-[#2B8F88]">
          FlôForm
        </Link>
        <nav className="flex items-center gap-4 text-sm text-slate-700">
          <Link href="/app">My Applications</Link>
          <Link href="/app/new">New Application</Link>
        </nav>
      </div>
    </header>
  );
}
