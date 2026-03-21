"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/ideas", label: "My ideas" },
  { href: "/about", label: "About" },
];

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname.startsWith(href);
}

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();

  const isCreatePage = pathname === "/create";
  const createHref = isAuthenticated ? "/create" : "/signin?next=/create";
  const ideasHref = isAuthenticated ? "/ideas" : "/signin?next=/ideas";

  return (
    <header className="border-b border-[var(--line)] bg-[rgba(255,253,249,0.88)] backdrop-blur">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent),var(--accent-soft))] text-sm font-semibold text-white">
              PI
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
                Print It 2
              </p>
              <p
                className="text-lg font-semibold text-[var(--foreground)]"
                style={{ fontFamily: "var(--font-newsreader), serif" }}
              >
                Prompt to print
              </p>
            </div>
          </Link>

          {!isCreatePage ? (
            <Link
              href={createHref}
              className="rounded-full bg-[linear-gradient(135deg,var(--accent),var(--accent-soft))] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 lg:hidden"
            >
              Create
            </Link>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <nav className="flex flex-wrap items-center gap-2">
            {NAV_ITEMS.map((item) => {
              const href = item.href === "/ideas" ? ideasHref : item.href;
              const isActive = isActivePath(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={href}
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    isActive
                      ? "bg-white text-[var(--foreground)] shadow-sm"
                      : "text-[var(--muted)] hover:bg-white/70 hover:text-[var(--foreground)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {!isCreatePage ? (
              <Link
                href={createHref}
                className="hidden rounded-full bg-[linear-gradient(135deg,var(--accent),var(--accent-soft))] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 lg:inline-flex"
              >
                Create
              </Link>
            ) : null}
            {isLoading ? (
              <span className="rounded-full bg-white px-4 py-2 text-sm text-[var(--muted)]">
                Checking session...
              </span>
            ) : isAuthenticated ? (
              <button
                type="button"
                className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm text-[var(--foreground)] transition hover:bg-[var(--paper)]"
                onClick={() => {
                  void signOut().then(() => router.push("/signin"));
                }}
              >
                Sign out
              </button>
            ) : (
              <Link
                href="/signin"
                className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm text-[var(--foreground)] transition hover:bg-[var(--paper)]"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
