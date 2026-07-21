import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

// Client-only mount check, for avoiding hydration mismatches when a component must
// render differently on the server (no localStorage/theme/etc.) vs. the client.
// Deliberately not a useState+useEffect — that pattern calls setState synchronously
// inside an effect, which triggers an extra cascading render; useSyncExternalStore
// returns the correct value for each environment directly instead.
export function useHasMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
