import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";

export function useSavedList<T>(key: string) {
  const [items, setItems] = useState<T[]>([]);
  const [ready, setReady] = useState(false);
  const current = useRef<T[]>([]);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const loading = queue.current
        .catch(() => undefined)
        .then(() => AsyncStorage.getItem(key))
        .then((raw) => {
          const next = raw ? JSON.parse(raw) : [];
          if (active && Array.isArray(next)) {
            current.current = next;
            setItems(next);
          }
        })
        .catch(() => undefined)
        .finally(() => {
          if (active) setReady(true);
        });
      queue.current = loading;
      return () => {
        active = false;
      };
    }, [key]),
  );
  const update = useCallback(
    (change: (old: T[]) => T[]) => {
      const task = queue.current
        .catch(() => undefined)
        .then(async () => {
          const next = change(current.current);
          await AsyncStorage.setItem(key, JSON.stringify(next));
          current.current = next;
          setItems(next);
        });
      queue.current = task;
      return task;
    },
    [key],
  );
  return { items, ready, update };
}
