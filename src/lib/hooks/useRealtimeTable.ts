import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Subscribes to Supabase Realtime changes on a table.
 * Calls `onchange` whenever an INSERT, UPDATE, or DELETE occurs.
 * Automatically cleans up the subscription on unmount.
 */
export function useRealtimeTable(
  table: string,
  onChange: () => void,
  options?: {
    event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    filter?: string; // e.g. "owner_id=eq.abc-123"
  }
) {
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const supabase = createClient();
    const event = options?.event || '*';

    const channelConfig: {
      event: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
      schema: string;
      table: string;
      filter?: string;
    } = {
      event: event as '*' | 'INSERT' | 'UPDATE' | 'DELETE',
      schema: 'public',
      table,
    };

    if (options?.filter) {
      channelConfig.filter = options.filter;
    }

    const channel = supabase
      .channel(`realtime:${table}:${options?.filter || 'all'}`)
      .on('postgres_changes', channelConfig, () => {
        onChangeRef.current();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, options?.event, options?.filter]);
}
