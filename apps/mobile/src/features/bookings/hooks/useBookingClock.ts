import { useEffect, useState } from "react";

// Re-evaluate time-based presentation even when no database row changes.
export function useBookingClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
