"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import {
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  Menu,
  Search,
  ShieldCheck,
  Store,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "./user-menu";

const NAV_ITEMS = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Merchants", href: "/dashboard/merchant", icon: Store },
  { label: "Resellers", href: "/dashboard/reseller", icon: Users },
  { label: "Finance", href: "/dashboard/finance", icon: Wallet },
  { label: "Admin", href: "/dashboard/admin", icon: ShieldCheck },
];

function NavLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: (typeof NAV_ITEMS)[number];
  active: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      onClick={onNavigate}
      className={`group relative flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors ${
        active
          ? "bg-gradient-to-r from-red-500/20 to-rose-600/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
          : "text-zinc-400 hover:bg-white/5 hover:text-white"
      }`}
    >
      {active ? (
        <motion.span
          layoutId="active-nav-pill"
          className="absolute inset-y-1 left-0 w-1 rounded-full bg-gradient-to-b from-red-400 to-rose-600"
          transition={{ type: "spring", stiffness: 400, damping: 34 }}
        />
      ) : null}
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
      {!collapsed ? <span className="whitespace-nowrap">{item.label}</span> : null}
    </Link>
  );
}

export function DashboardShell({
  children,
  userName = "there",
}: {
  children: ReactNode;
  userName?: string;
}) {
  const pathname = usePathname();
  const userInitial = userName.trim().charAt(0).toUpperCase() || "?";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex h-screen w-full overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,90,90,0.14),_transparent_45%),linear-gradient(135deg,_#060606,_#111111)]">
        {/* Desktop sidebar */}
        <motion.aside
          animate={{ width: collapsed ? 84 : 272 }}
          transition={{ type: "spring", stiffness: 300, damping: 32 }}
          className="hidden shrink-0 flex-col border-r border-white/10 bg-black/40 backdrop-blur-xl lg:flex"
        >
          <div className="flex h-16 items-center gap-3 overflow-hidden border-b border-white/10 px-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-rose-700 text-sm font-bold text-white shadow-lg shadow-red-900/40">
              F
            </div>
            {!collapsed ? (
              <div className="overflow-hidden">
                <p className="whitespace-nowrap text-sm font-semibold text-white">FOODIFY</p>
                <p className="whitespace-nowrap text-xs text-zinc-500">Operations Center</p>
              </div>
            ) : null}
          </div>

          <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-5">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.href} item={item} active={pathname === item.href} collapsed={collapsed} />
            ))}
          </nav>

          <button
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="m-3 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-medium text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronsLeft className="h-4 w-4" /> Collapse
              </>
            )}
          </button>
        </motion.aside>

        {/* Mobile drawer */}
        <AnimatePresence>
          {mobileOpen ? (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              />
              <motion.aside
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                transition={{ type: "spring", stiffness: 320, damping: 34 }}
                className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/10 bg-[#0a0a0a] p-5 lg:hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-rose-700 text-sm font-bold text-white">
                      F
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">FOODIFY</p>
                      <p className="text-xs text-zinc-500">Operations Center</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMobileOpen(false)}
                    aria-label="Close menu"
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <nav className="mt-8 space-y-1.5">
                  {NAV_ITEMS.map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      active={pathname === item.href}
                      onNavigate={() => setMobileOpen(false)}
                    />
                  ))}
                </nav>
              </motion.aside>
            </>
          ) : null}
        </AnimatePresence>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-white/10 bg-black/30 px-4 backdrop-blur-xl sm:px-6">
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="rounded-xl border border-white/10 p-2 text-zinc-300 transition hover:bg-white/10 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="relative hidden max-w-md flex-1 sm:block">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search merchants, orders, resellers…"
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-zinc-500 outline-none transition focus-visible:border-red-400/40 focus-visible:bg-white/10"
              />
            </div>

            <div className="ml-auto flex items-center gap-3">
              <NotificationBell />
              <UserMenu name={userName} initial={userInitial} />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
          </main>
        </div>
      </div>
    </MotionConfig>
  );
}
