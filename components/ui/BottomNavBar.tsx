"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function getActiveTab(pathname: string) {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/marketplace")) return "marketplace";
  if (pathname.startsWith("/gallery")) return "gallery";
  if (
    pathname.startsWith("/create") ||
    pathname.startsWith("/validate") ||
    pathname.startsWith("/checkout")
  )
    return "create";
  if (pathname.startsWith("/history")) return "history";
  if (pathname.startsWith("/dashboard")) return "dashboard";
  return "home";
}

const TABS = [
  { href: "/", tab: "home", icon: "home", label: "Home" },
  { href: "/marketplace", tab: "marketplace", icon: "storefront", label: "Market" },
  { href: "/create", tab: "create", icon: "add_circle", label: "Create" },
  { href: "/history", tab: "history", icon: "history", label: "History" },
  { href: "/dashboard", tab: "dashboard", icon: "dashboard", label: "Dash" },
];

export default function BottomNavBar() {
  const pathname = usePathname();
  const activeTab = getActiveTab(pathname);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-3 bg-white/80 backdrop-blur-lg border-t border-outline-variant/15 shadow-[0_-8px_24px_rgba(56,50,40,0.06)] rounded-t-[3rem]">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`flex flex-col items-center justify-center ${
            activeTab === t.tab
              ? "text-primary"
              : "text-on-surface opacity-70"
          }`}
        >
          <span className="material-symbols-outlined mb-1">{t.icon}</span>
          <span className="font-jakarta text-[11px] font-semibold uppercase tracking-wider">
            {t.label}
          </span>
        </Link>
      ))}
    </nav>
  );
}
