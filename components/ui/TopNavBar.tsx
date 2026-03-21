"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/marketplace", label: "Marketplace", tab: "marketplace" },
  { href: "/gallery", label: "Gallery", tab: "gallery" },
  { href: "/create", label: "Create", tab: "create" },
  { href: "/history", label: "History", tab: "history" },
  { href: "/dashboard", label: "Dashboard", tab: "dashboard" },
];

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

export default function TopNavBar() {
  const pathname = usePathname();
  const activeTab = getActiveTab(pathname);

  return (
    <header className="bg-surface sticky top-0 z-50">
      <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
        <Link
          href="/"
          className="text-2xl font-black text-primary tracking-tight font-jakarta italic"
        >
          Print It
        </Link>

        <nav className="hidden md:flex gap-8 items-center">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${
                activeTab === link.tab
                  ? "text-primary border-b-2 border-primary font-bold"
                  : "text-on-surface font-medium"
              } font-jakarta text-lg hover:text-primary-container transition-colors duration-200`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button className="material-symbols-outlined text-on-surface hover:text-primary active:scale-95 duration-150">
            notifications
          </button>
          <button className="material-symbols-outlined text-on-surface hover:text-primary active:scale-95 duration-150">
            account_circle
          </button>
        </div>
      </div>
      <div className="bg-surface-container h-px w-full" />
    </header>
  );
}
