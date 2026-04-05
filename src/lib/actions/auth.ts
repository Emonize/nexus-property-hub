/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
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

export async function signInWithGoogle(intendedRole?: string) {
  const supabase = await createClient();
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (intendedRole) {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    cookieStore.set('nexus_intended_role', intendedRole, { path: '/', maxAge: 60 * 5 });
  }

  // Violently override ANY broken Vercel environment variables in production
  const origin = isProduction 
    ? 'https://nexus-property-hub.vercel.app' 
    : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');

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

export async function deleteAccount() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Scrub profile data (cascade dependencies handle the rest based on foreign keys)
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', user.id);

  if (error) return { error: error.message };

  // Destroy auth session
  await supabase.auth.signOut();
  
  return { success: true };
}
