"use client";

import { useEffect, useState } from "react";
import { notifications as initial } from "@/lib/mock-data";

const STORAGE_KEY = "smaran:read-notifications";

export function useUnreadCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    function recalculate() {
      const saved = localStorage.getItem(STORAGE_KEY);
      const readIds: string[] = saved ? JSON.parse(saved) : [];
      const unread = initial.filter((n) => !readIds.includes(n.id)).length;
      setCount(unread);
    }

    recalculate();

    // Recalculate if another tab/page updates it, and poll lightly as a fallback
    // since localStorage writes in the same tab don't fire the "storage" event.
    window.addEventListener("storage", recalculate);
    const interval = setInterval(recalculate, 1000);

    return () => {
      window.removeEventListener("storage", recalculate);
      clearInterval(interval);
    };
  }, []);

  return count;
}