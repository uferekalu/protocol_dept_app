'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { setActingAs } from '@/lib/redux/slices/sessionSlice';
import { useGetProtocolMembersQuery } from '@/lib/redux/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STORAGE_KEY = 'protocol-department:acting-as';

// Stand-in for real auth until Phase 5 exists — see lib/redux/slices/sessionSlice.ts.
// Every status-update action needs to know which protocol member is performing it
// (the API's required `updated_by`), and there's no login yet to derive that from, so
// this picker is the explicit, honest substitute rather than silently hardcoding
// someone.
export function ActingAsPicker() {
  const dispatch = useAppDispatch();
  const actingAsId = useAppSelector((state) => state.session.actingAsId);
  const { data: members, isLoading } = useGetProtocolMembersQuery();

  // Hydrate from localStorage on mount only (client-side, avoids an SSR/hydration
  // mismatch — the server has no localStorage to read).
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) dispatch(setActingAs(stored));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(value: string | null) {
    dispatch(setActingAs(value));
    if (value) {
      window.localStorage.setItem(STORAGE_KEY, value);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-label hidden text-muted-foreground sm:inline">Acting as</span>
      <Select value={actingAsId} onValueChange={handleChange} disabled={isLoading}>
        <SelectTrigger size="sm" className="min-w-36">
          {/* Base UI's SelectValue falls back to the raw value if it can't resolve a
              label itself (e.g. on localStorage-hydrated initial state) — resolve the
              display name explicitly from the already-fetched member list instead of
              relying on that. */}
          <SelectValue>
            {(value: string | null) =>
              members?.find((member) => member._id === value)?.full_name ?? 'Select yourself'
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {members?.map((member) => (
            <SelectItem key={member._id} value={member._id}>
              {member.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
