'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export async function signUp(formData: {
  email: string;
  password: string;
  full_name: string;
  role: 'owner' | 'tenant' | 'manager' | 'vendor';
}) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: formData.email,
    password: formData.password,
    options: {
      data: {
        full_name: formData.full_name,
        role: formData.role,
      },
    },
  });

  if (error) return { error: error.message };
  return { data: { user: data.user } };
}

export async function signIn(formData: { email: string; password: string }) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: formData.email,
    password: formData.password,
  });

  if (error) return { error: error.message };
  revalidatePath('/', 'layout');
  return { data: { user: data.user } };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/auth/login');
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const headersList = await headers();
  // Next.js Server actions occasionally drop 'origin' on same-origin POSTs. 'host' is bulletproof.
  const protocol = headersList.get('x-forwarded-proto') || 'https';
  const host = headersList.get('host') || headersList.get('x-forwarded-host');
  const dynamicOrigin = host ? `${protocol}://${host}` : undefined;
  
  const origin = dynamicOrigin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) return { error: error.message };
  return { data: { url: data.url } };
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile;
}
