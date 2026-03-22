"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

/** Stable SVG id — avoid useId() here; Next SSR + client can disagree and break hydration. */
const HEADER_LOGO_GRAD_ID = "site-header-logo-grad";

function HeaderLogoMark() {
  return (
    <span
      className="relative flex h-9 w-9 shrink-0 overflow-hidden rounded-[10px] shadow-[0_2px_14px_rgba(194,65,12,0.2),inset_0_1px_0_rgba(255,255,255,0.25)] ring-1 ring-white/25 transition-[transform,box-shadow] duration-200 ease-out group-hover:scale-[1.04] group-hover:shadow-[0_4px_20px_rgba(194,65,12,0.28),inset_0_1px_0_rgba(255,255,255,0.3)]"
      aria-hidden
    >
      <svg viewBox="0 0 36 36" className="h-full w-full" fill="none">
        <defs>
          <linearGradient id={HEADER_LOGO_GRAD_ID} x1="6" y1="4" x2="32" y2="34" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fb923c" />
            <stop offset="0.45" stopColor="#ea580c" />
            <stop offset="1" stopColor="#9a3412" />
          </linearGradient>
        </defs>
        <rect width="36" height="36" rx="10" fill={`url(#${HEADER_LOGO_GRAD_ID})`} />
        <path
          d="M6 8c10-2.5 20 2 24 6-4-1.5-9-2.5-14-2.5-6 0-10 1.2-10 1.2Z"
          fill="white"
          opacity="0.14"
        />
        <rect x="7" y="22" width="22" height="3.5" rx="1.75" fill="white" fillOpacity="0.93" />
        <rect x="10" y="16" width="16" height="3.5" rx="1.75" fill="white" fillOpacity="0.93" />
        <rect x="12" y="10" width="12" height="3.5" rx="1.75" fill="white" fillOpacity="0.93" />
      </svg>
    </span>
  );
}

const NAV_ITEMS_AUTHENTICATED = [
  { href: "/", label: "Home" },
  { href: "/showcase", label: "Showcase" },
  { href: "/ideas", label: "My Ideas" },
  { href: "/orders", label: "My Orders" },
  { href: "/create", label: "Create" },
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
      items.push({ href: "/admin", label: "Admin" });
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
        <Link
          href="/"
          className="group flex items-center gap-3 rounded-lg py-0.5 outline-offset-4 focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
          aria-label="Print It home"
        >
          <HeaderLogoMark />
          <span className="font-serif text-[1.125rem] font-semibold leading-none tracking-[-0.02em] sm:text-xl">
            <span className="text-[var(--foreground)]">Print</span>
            <span className="font-medium text-[var(--muted)] transition-colors duration-200 group-hover:text-[var(--accent)]">
              {" "}
              It
            </span>
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

        <div className="relative flex items-center gap-3" ref={menuRef}>
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
            <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-[220px] max-w-[min(100vw-2rem,280px)] rounded-xl border border-[var(--line)] bg-white p-1 shadow-[var(--shadow-lg)] animate-fade-in">
              <div className="border-b border-[var(--line)] px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Signed in as
                </p>
                <p
                  className="truncate text-sm font-medium text-[var(--foreground)]"
                  title={
                    adminStatus?.email && adminStatus.email.length > 0
                      ? adminStatus.email
                      : undefined
                  }
                >
                  {adminStatus === undefined
                    ? "Loading…"
                    : adminStatus.email && adminStatus.email.length > 0
                      ? adminStatus.email
                      : "Your account"}
                </p>
              </div>
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
