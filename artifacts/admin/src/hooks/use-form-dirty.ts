import { useRef } from "react";

/**
 * Track whether form data has changed from its last snapshot.
 *
 * Usage:
 *   const { isDirty, snapshot } = useFormDirty(form);
 *   // After data loads:
 *   useEffect(() => { if (data) { setForm(data); snapshot(data); } }, [data]);
 *   // After successful save:
 *   snapshot(form);
 */
export function useFormDirty<T>(current: T) {
  const savedRef = useRef<string | null>(null);

  const snapshot = (data: T) => {
    savedRef.current = JSON.stringify(data);
  };

  const isDirty = savedRef.current !== null && JSON.stringify(current) !== savedRef.current;

  return { isDirty, snapshot };
}
