import { useRef } from "react";

export function useUndoRedo<T>() {
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);

  function register(prevState: T) {
    past.current.push(structuredClone(prevState));
    future.current = [];
  }

  // ✅ setState can now be either React's setState OR any callback.
  // This lets TasksProvider pass a function that also calls persistSnapshot.
  function undo(current: T, setState: (s: T) => void) {
    if (!past.current.length) return;
    const prev = past.current.pop()!;
    future.current.push(structuredClone(current));
    setState(prev);
  }

  function redo(current: T, setState: (s: T) => void) {
    if (!future.current.length) return;
    const next = future.current.pop()!;
    past.current.push(structuredClone(current));
    setState(next);
  }

  function clear() {
    past.current = [];
    future.current = [];
  }

  return { register, undo, redo, clear };
}
