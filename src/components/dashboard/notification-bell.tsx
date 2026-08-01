"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Bell } from "lucide-react";

type Notification = {
  id: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const body = await res.json();
      setNotifications(body.notifications ?? []);
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
  }

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-40 mt-2 w-80 rounded-2xl border border-white/10 bg-[#0a0a0a] p-2 shadow-2xl"
          >
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Notifications</div>
            <div className="max-h-80 overflow-y-auto">
              {!loaded ? (
                <p className="px-3 py-4 text-sm text-zinc-500">Loading…</p>
              ) : notifications.length === 0 ? (
                <p className="px-3 py-4 text-sm text-zinc-500">No notifications yet.</p>
              ) : (
                notifications.map((notification) => {
                  const content = (
                    <div
                      className={`rounded-xl px-3 py-2.5 transition hover:bg-white/5 ${!notification.read_at ? "bg-white/[0.03]" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-white">{notification.title}</p>
                        {!notification.read_at ? <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" /> : null}
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-400">{notification.body}</p>
                    </div>
                  );

                  return (
                    <div key={notification.id} onClick={() => !notification.read_at && markRead(notification.id)}>
                      {notification.link ? (
                        <Link href={notification.link} onClick={() => setOpen(false)}>
                          {content}
                        </Link>
                      ) : (
                        content
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
