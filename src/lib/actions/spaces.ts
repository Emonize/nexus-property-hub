'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Space, SpaceType, SpaceStatus } from '@/types/database';

const MAX_DEPTH = 6;

async function getSpaceDepth(supabase: Awaited<ReturnType<typeof createClient>>, parentId: string): Promise<number> {
  let depth = 0;
  let currentId: string | null = parentId;
  while (currentId) {
    const result = await supabase
      .from('spaces')
      .select('parent_id')
      .eq('id', currentId)
      .single();
    const row = result.data as { parent_id: string | null } | null;
    if (!row) break;
    currentId = row.parent_id;
    depth++;
  }
  return depth;
}

export async function createSpace(formData: {
  name: string;
  type: SpaceType;
  parent_id?: string | null;
  address?: Record<string, unknown>;
  area_sqft?: number;
  base_rent?: number;
  amenities?: string[];
  status?: SpaceStatus;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  if (formData.parent_id) {
    const depth = await getSpaceDepth(supabase, formData.parent_id);
    if (depth >= MAX_DEPTH) {
      return { error: `Maximum nesting depth of ${MAX_DEPTH} exceeded` };
    }
  }

  const { data, error } = await supabase
    .from('spaces')
    .insert({
      ...formData,
      owner_id: user.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  revalidatePath('/spaces');
  return { data: data as Space };
}

export async function updateSpace(id: string, updates: Partial<Space>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data, error } = await supabase
    .from('spaces')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  revalidatePath('/spaces');
  return { data: data as Space };
}

export async function deleteSpace(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('spaces')
    .delete()
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  revalidatePath('/spaces');
  return { success: true };
}

export async function reparentSpace(spaceId: string, newParentId: string | null) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  if (newParentId) {
    const depth = await getSpaceDepth(supabase, newParentId);
    if (depth >= MAX_DEPTH - 1) {
      return { error: 'Cannot reparent: would exceed maximum nesting depth' };
    }
    if (newParentId === spaceId) {
      return { error: 'Cannot set a space as its own parent' };
    }
  }

  const { data, error } = await supabase
    .from('spaces')
    .update({ parent_id: newParentId })
    .eq('id', spaceId)
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  revalidatePath('/spaces');
  return { data: data as Space };
}

export async function getSpaceTree(rootId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_space_tree', { root_id: rootId });
  if (error) return { error: error.message };
  return { data };
}

export async function getSpaces() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized', data: [] };

  const { data, error } = await supabase
    .from('spaces')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) return { error: error.message, data: [] };
  return { data: data as Space[] };
}

export async function getSpaceById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('spaces')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return { error: error.message };
  return { data: data as Space };
}

export async function microListSpaces(payload: {
  parent_space_id: string;
  rooms: Array<{
    name: string;
    type: SpaceType;
    area_sqft: number;
    rentable: boolean;
    base_rent: number;
    amenities: string[];
  }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const spacesToInsert = payload.rooms.map((room) => ({
    parent_id: payload.parent_space_id,
    owner_id: user.id,
    name: room.name,
    type: room.type,
    area_sqft: room.area_sqft,
    base_rent: room.base_rent,
    amenities: room.amenities,
    status: room.rentable ? 'listed' as const : 'unlisted' as const,
  }));

  const { data, error } = await supabase
    .from('spaces')
    .insert(spacesToInsert)
    .select();

  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  revalidatePath('/spaces');
  return { data: data as Space[] };
}
