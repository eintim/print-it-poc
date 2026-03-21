"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

const NAV_ITEMS_AUTHENTICATED = [
  { href: "/", label: "Home" },
  { href: "/showcase", label: "Showcase" },
  { href: "/ideas", label: "My Ideas" },
  { href: "/orders", label: "My Orders" },
  { href: "/create", label: "Create" },
  { href: "/about", label: "About" },
];

const NAV_ITEMS_GUEST = [
  { href: "/", label: "Home" },
  { href: "/showcase", label: "Showcase" },
  { href: "/create", label: "Create" },
];

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname.startsWith(href);
}

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const adminStatus = useQuery(api.admin.adminStatus);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const navItems = useMemo(() => {
    if (!isAuthenticated) return NAV_ITEMS_GUEST;
    const items = [...NAV_ITEMS_AUTHENTICATED];
    if (adminStatus?.isAdmin) {
      const aboutIdx = items.findIndex((i) => i.href === "/about");
      const idx = aboutIdx >= 0 ? aboutIdx : items.length;
      items.splice(idx, 0, { href: "/admin", label: "Admin" });
    }
    return items;
  }, [isAuthenticated, adminStatus?.isAdmin]);
  const ideasHref = "/ideas";
  const ordersHref = "/orders";
  const createHref = "/create";

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--background)]">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-3">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] font-serif text-sm font-bold text-white shadow-[0_2px_8px_rgba(194,65,12,0.25)] transition-transform group-hover:scale-105">
            P
          </span>
          <span className="font-serif text-xl font-semibold tracking-tight text-[var(--foreground)]">
            Print It
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex">
          {navItems.map((item) => {
            const isActive = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-all duration-200 ${
                  isActive
                    ? "text-[var(--accent)]"
                    : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--accent-glow)]"
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0.5 left-3.5 right-3.5 h-[2px] rounded-full bg-[var(--accent)]" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3" ref={menuRef}>
          {isAuthenticated ? (
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--panel)] text-[var(--muted)] transition hover:bg-[var(--panel-strong)] hover:text-[var(--foreground)]"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Account menu"
              aria-expanded={menuOpen}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>
          ) : (
            <Link
              href="/signin"
              className="btn-copper rounded-lg px-4 py-1.5 text-[13px]"
            >
              Sign in
            </Link>
          )}

          {isAuthenticated && menuOpen && (
            <div className="absolute right-6 top-[52px] min-w-[180px] rounded-xl border border-[var(--line)] bg-white p-1 shadow-[var(--shadow-lg)] animate-fade-in">
              <Link
                href={ideasHref}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--cream)]"
              >
                My Ideas
              </Link>
              <Link
                href={ordersHref}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--cream)]"
              >
                My Orders
              </Link>
              <Link
                href={createHref}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--cream)]"
              >
                Create
              </Link>
              {adminStatus?.isAdmin ? (
                <Link
                  href="/admin"
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--cream)]"
                >
                  Admin · all models
                </Link>
              ) : null}
              <div className="my-0.5 h-px bg-[var(--line)]" />
              <button
                type="button"
                className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--cream)] hover:text-[var(--foreground)]"
                onClick={() => {
                  setMenuOpen(false);
                  void signOut().then(() => router.push("/signin"));
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
