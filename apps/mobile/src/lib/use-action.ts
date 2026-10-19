import { useRef, useState } from "react";
import { ApiError } from "./api";
export function useAction() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [fields, setFields] = useState<Record<string, string>>({});
  const run = async (job: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    setFields({});
    try {
      await job();
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError) setFields(e.fields ?? {});
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return { busy, error, fields, run, setError };
}
