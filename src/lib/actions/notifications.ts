'use server';

import { createClient } from '@/lib/supabase/server';

type NotificationType = 'payment_reminder' | 'maintenance_update' | 'lease_action' | 'trust_update' | 'system';
type Channel = 'push' | 'sms' | 'email';

export async function sendNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  channels: Channel[];
}) {
  const supabase = await createClient();

  // Store in database
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      channels: params.channels,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // Send via each channel
  const results = await Promise.allSettled(
    params.channels.map(async (channel) => {
      switch (channel) {
        case 'email':
          return sendEmail(params.userId, params.title, params.body);
        case 'sms':
          return sendSMS(params.userId, params.body);
        case 'push':
          return sendPush(params.userId, params.title, params.body);
      }
    })
  );

  return { data, results };
}

async function sendEmail(userId: string, subject: string, body: string) {
  const supabase = await createClient();
  const { data: user } = await supabase
    .from('users')
    .select('email')
    .eq('id', userId)
    .single();

  if (!user) return;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Rentova <noreply@nexushub.com>',
      to: user.email,
      subject,
      html: `<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0A0A0F, #1a1a2e); padding: 32px; border-radius: 16px;">
          <h1 style="color: #6C63FF; margin: 0 0 8px;">${subject}</h1>
          <p style="color: #94A3B8; line-height: 1.6;">${body}</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard"
             style="display: inline-block; background: #6C63FF; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
            View in Dashboard
          </a>
        </div>
      </div>`,
    }),
  });
}

async function sendSMS(userId: string, body: string) {
  const supabase = await createClient();
  const { data: user } = await supabase
    .from('users')
    .select('phone')
    .eq('id', userId)
    .single();

  if (!user?.phone) return;

  const params = new URLSearchParams();
  params.append('To', user.phone);
  params.append('From', process.env.TWILIO_PHONE_NUMBER!);
  params.append('Body', `[Rentova] ${body}`);

  await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    }
  );
}

async function sendPush(userId: string, title: string, body: string) {
  // Firebase Cloud Messaging — placeholder for FCM integration
  // In production, this would send via FCM with the user's device token
  console.log(`[Push] ${userId}: ${title} — ${body}`);
}

export async function getNotifications(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return { error: error.message, data: [] };
  return { data };
}

export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function snoozeNotification(notificationId: string, hours: number = 24) {
  const supabase = await createClient();

  const snoozedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from('notifications')
    .update({ snoozed_until: snoozedUntil })
    .eq('id', notificationId);

  if (error) return { error: error.message };
  return { success: true };
}
