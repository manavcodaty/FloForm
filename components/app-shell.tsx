"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutList, PlusSquare, Settings2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAccessibility } from "@/components/accessibility-provider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    lowCognitiveLoad,
    highContrast,
    largeText,
    setLowCognitiveLoad,
    setHighContrast,
    setLargeText
  } = useAccessibility();

  const navItems = [
    { href: "/app", label: "My Applications", icon: LayoutList },
    { href: "/app/new", label: "New Application", icon: PlusSquare },
    { href: "/app/trace-viewer", label: "Trace Viewer", icon: Settings2 }
  ];

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-12 gap-4 px-4 py-4">
      <aside className="col-span-12 rounded-xl border bg-white p-4 lg:col-span-3">
        <div className="space-y-2">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                  active ? "bg-[#39B7AD] text-white" : "text-slate-700 hover:bg-[#E8F8F6]"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
        <Separator className="my-4" />
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Accessibility</h3>
          <div className="flex items-center justify-between text-sm">
            <span>Low Cognitive Load</span>
            <Switch checked={lowCognitiveLoad} onCheckedChange={setLowCognitiveLoad} />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>High Contrast</span>
            <Switch checked={highContrast} onCheckedChange={setHighContrast} />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Large Text</span>
            <Switch checked={largeText} onCheckedChange={setLargeText} />
          </div>
        </div>
      </aside>
      <main className="col-span-12 lg:col-span-9">{children}</main>
    </div>
  );
}
