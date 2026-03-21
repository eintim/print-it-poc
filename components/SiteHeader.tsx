"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/ideas", label: "My ideas" },
  { href: "/create", label: "Create" },
  { href: "/about", label: "About" },
];

const AVATAR_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCh_48Ohzx0LOZZv1sh4gieXehntqZ6h5Wx2S9RYcq9kvsvvliyFljGuenZCmL_4y-SjV1MOme8sbNdrgx74SVvGGr4ZIWy6uV7H2_u1gVKRQzd24MFhtxDUUy-APXo9crd6BB9BnP7eMTgakk0VE1yReYy6TYIytkLTOmB-D2STbQpjlkMjMmCaPdD29c8V-vFC1uBO7tAGVKQvGlqpunNs5JOHeGyj03FkbOcYEww7lk0BCrDrRi-pEFuovZVZXAhBEGxYfbInxk";

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname.startsWith(href);
}

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const createHref = isAuthenticated ? "/create" : "/signin?next=/create";
  const ideasHref = isAuthenticated ? "/ideas" : "/signin?next=/ideas";
  const avatarHref = isAuthenticated ? ideasHref : "/signin";

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
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-[#f6ece1] bg-[#fff8f3]">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-2xl font-black italic tracking-tight text-[#a53c2c]"
          style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
        >
          Print It
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map((item) => {
            const href =
              item.href === "/ideas"
                ? ideasHref
                : item.href === "/create"
                  ? createHref
                  : item.href;
            const isActive = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={href}
                className={`border-b-2 font-bold text-lg transition-colors duration-200 ${
                  isActive
                    ? "border-[#a53c2c] text-[#a53c2c]"
                    : "border-transparent text-[#383228] opacity-80 hover:text-[#fd7d68]"
                }`}
                style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Notifications"
            className="text-[#383228] transition duration-150 hover:text-[#a53c2c] active:scale-95"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.42V11a6 6 0 1 0-12 0v3.18a2 2 0 0 1-.59 1.41L4 17h5" />
              <path d="M10 17a2 2 0 0 0 4 0" />
            </svg>
          </button>

          <div className="relative" ref={menuRef}>
            {isAuthenticated ? (
              <button
                type="button"
                className="h-10 w-10 overflow-hidden rounded-full border-2 border-[#a53c2c]/20"
                onClick={() => {
                  setMenuOpen((open) => !open);
                }}
                aria-label="Open account menu"
                aria-expanded={menuOpen}
              >
                <img
                  alt="User profile avatar"
                  className="h-full w-full object-cover"
                  src={AVATAR_IMAGE}
                />
              </button>
            ) : (
              <Link
                href={avatarHref}
                className="block h-10 w-10 overflow-hidden rounded-full border-2 border-[#a53c2c]/20"
                aria-label="Sign in"
              >
                <img
                  alt="Sign in"
                  className="h-full w-full object-cover"
                  src={AVATAR_IMAGE}
                />
              </Link>
            )}

            {isAuthenticated && menuOpen ? (
              <div className="absolute right-0 top-14 min-w-[180px] rounded-2xl border border-[rgba(186,176,164,0.32)] bg-white p-2 shadow-[0_20px_45px_rgba(56,50,40,0.12)]">
                <Link
                  href={ideasHref}
                  className="block rounded-xl px-4 py-2 text-sm font-semibold text-[#383228] transition hover:bg-[#fff8f3]"
                  style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
                >
                  My ideas
                </Link>
                <Link
                  href={createHref}
                  className="block rounded-xl px-4 py-2 text-sm font-semibold text-[#383228] transition hover:bg-[#fff8f3]"
                  style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
                >
                  Create
                </Link>
                <button
                  type="button"
                  className="block w-full rounded-xl px-4 py-2 text-left text-sm font-semibold text-[#383228] transition hover:bg-[#fff8f3]"
                  style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
                  onClick={() => {
                    setMenuOpen(false);
                    void signOut().then(() => router.push("/signin"));
                  }}
                >
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

    </header>
  );
}
