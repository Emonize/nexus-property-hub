 
/* eslint-disable @typescript-eslint/no-unused-vars */
import { vi } from 'vitest';

/**
 * Creates a mock Supabase client with chainable query builder.
 * Each query method returns `this` for chaining, and the terminal
 * method (.single(), final .select(), etc.) resolves the mock data.
 */
export function createMockSupabaseClient(overrides?: {
  authUser?: { id: string } | null;
  queryResults?: Record<string, { data?: unknown; error?: { message: string } | null }>;
  rpcResults?: Record<string, { data?: unknown; error?: { message: string } | null }>;
}) {
  const authUser = overrides?.authUser ?? { id: 'test-user-id' };
  const queryResults = overrides?.queryResults ?? {};
  const rpcResults = overrides?.rpcResults ?? {};

  // Tracks the current table for result lookup
  let currentTable = '';

  const queryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(() => {
      const result = queryResults[currentTable];
      return Promise.resolve(result ?? { data: null, error: null });
    }),
    then: undefined as unknown, // Will be set dynamically
  };

  // Make the query builder itself thenable (for queries without .single())
  queryBuilder.select = vi.fn(function () {
    // When select is the terminal call, return a thenable
    const self = {
      ...queryBuilder,
      then(resolve: (value: unknown) => void) {
        const result = queryResults[currentTable];
        resolve(result ?? { data: [], error: null });
      },
    };
    return self;
  });

  // Re-chain after insert/update/delete
  queryBuilder.insert = vi.fn().mockImplementation(() => ({
    ...queryBuilder,
    select: vi.fn().mockReturnValue({
      ...queryBuilder,
      single: vi.fn(() => {
        const result = queryResults[`${currentTable}_insert`] ?? queryResults[currentTable];
        return Promise.resolve(result ?? { data: { id: 'new-id' }, error: null });
      }),
    }),
  }));

  queryBuilder.update = vi.fn().mockImplementation(() => ({
    ...queryBuilder,
    eq: vi.fn().mockReturnValue({
      ...queryBuilder,
      select: vi.fn().mockReturnValue({
        ...queryBuilder,
        single: vi.fn(() => {
          const result = queryResults[`${currentTable}_update`] ?? queryResults[currentTable];
          return Promise.resolve(result ?? { data: { id: 'updated-id' }, error: null });
        }),
      }),
    }),
  }));

  queryBuilder.delete = vi.fn().mockImplementation(() => ({
    ...queryBuilder,
    eq: vi.fn().mockReturnValue(
      Promise.resolve(queryResults[`${currentTable}_delete`] ?? { error: null })
    ),
  }));

  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: authUser },
        error: null,
      }),
      signUp: vi.fn().mockResolvedValue({ data: { user: authUser }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: authUser }, error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({ data: { url: 'https://oauth.example.com' }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn((table: string) => {
      currentTable = table;
      return {
        ...queryBuilder,
        select: vi.fn().mockImplementation(() => {
          const chainable = {
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            ilike: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            single: vi.fn(() => {
              const result = queryResults[table];
              return Promise.resolve(result ?? { data: null, error: null });
            }),
            then(resolve: (value: unknown) => void) {
              const result = queryResults[table];
              resolve(result ?? { data: [], error: null });
            },
          };
          return chainable;
        }),
        insert: queryBuilder.insert,
        update: queryBuilder.update,
        delete: queryBuilder.delete,
        upsert: vi.fn().mockResolvedValue({ error: null }),
      };
    }),
    rpc: vi.fn((fnName: string, params?: Record<string, unknown>) => {
      const result = rpcResults[fnName];
      return Promise.resolve(result ?? { data: null, error: null });
    }),
  };

  return client;
}

/**
 * Sets up the Supabase mock for server-side usage.
 * Call this in beforeEach with the desired mock configuration.
 */
export function mockSupabaseModule(client: ReturnType<typeof createMockSupabaseClient>) {
  vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(() => Promise.resolve(client)),
    createServiceClient: vi.fn(() => Promise.resolve(client)),
  }));
}
