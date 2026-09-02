"use client";

import { useEffect, useState } from "react";
import { useApi } from "@/hooks/use-api";

const STORAGE_KEY = "smaran:read-notifications";

interface Notification {
  id: string;
  read: boolean;
}

export function useUnreadCount() {
  const api = useApi();
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function fetchAndCalculate() {
      try {
        const notifications = await api<Notification[]>(
          "/dashboard/notifications",
        );
        const saved = localStorage.getItem(STORAGE_KEY);
        const readIds: string[] = saved ? JSON.parse(saved) : [];
        const unread = notifications.filter(
          (n) => !readIds.includes(n.id),
        ).length;
        setCount(unread);
      } catch (err) {
        console.error("Failed to fetch notifications for unread count:", err);
        // Fallback: use localStorage as fallback
        const saved = localStorage.getItem(STORAGE_KEY);
        const readIds: string[] = saved ? JSON.parse(saved) : [];
        setCount(Math.max(0, -readIds.length)); // Shows 0 on error
      }
    }

    fetchAndCalculate();

    // Recalculate if another tab/page updates it, and poll periodically (every 1 minute)
    const handleStorageChange = () => fetchAndCalculate();
    window.addEventListener("storage", handleStorageChange);
    const interval = setInterval(fetchAndCalculate, 60_000); // Poll every 1 minute

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [api]);

  return count;
}
