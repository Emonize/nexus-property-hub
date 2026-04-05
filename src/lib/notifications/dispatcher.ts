/* eslint-disable @typescript-eslint/no-explicit-any */
 
import { createServiceClient } from '@/lib/supabase/server';

type NotificationType = 'payment_reminder' | 'maintenance_update' | 'lease_action' | 'trust_update' | 'system';
type NotificationChannel = 'app' | 'sms' | 'email';

interface DispatchOptions {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  channels?: NotificationChannel[];
  meta?: Record<string, any>;
}

/**
 * Universal Notification Dispatcher
 * Instantly broadcasts mult-channel alerts (In-App, SMS, Email).
 * Includes automatic Mock Fallback for local development.
 */
export async function dispatchNotification({
  userId,
  type,
  title,
  body,
  channels = ['app'],
  meta = {}
}: DispatchOptions) {
  const supabase = await createServiceClient();

  try {
    // 1. ALWAYS dispatch to the In-App Notification Center
    if (channels.includes('app')) {
      await supabase.from('notifications').insert({
        user_id: userId,
        type,
        title,
        body,
        channels,
        meta
      });
    }

    // Attempt external channels?
    if (channels.includes('sms') || channels.includes('email')) {
      // Need user's contact info
      const { data: user } = await supabase
        .from('users')
        .select('phone, email, full_name')
        .eq('id', userId)
        .single();
        
      if (!user) {
        console.error(`❌ DispatchFailed: User ${userId} not found.`);
        return;
      }

      // 2. Dispatch SMS via TWILIO
      if (channels.includes('sms')) {
        const twilioSid = process.env.TWILIO_ACCOUNT_SID;
        const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
        const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

        if (!twilioSid || twilioSid === 'your-twilio-sid' || !user.phone) {
          console.log(`\x1b[36m[MOCK SMS]\x1b[0m 📱 To: ${user.full_name} (${user.phone || 'No Phone Number'})\n   Body: "${title} - ${body}"`);
        } else {
          // Real Twilio API Call
          const params = new URLSearchParams();
          params.append('To', user.phone);
          params.append('From', twilioPhone!);
          params.append('Body', `${title}\n\n${body}`);

          const encodedAuth = Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64');

          await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Basic ${encodedAuth}`
            },
            body: params.toString()
          }).catch(err => console.error('Twilio Error:', err));
        }
      }

      // 3. Dispatch Email via RESEND
      if (channels.includes('email') && user.email) {
        const resendKey = process.env.RESEND_API_KEY;

        if (!resendKey || resendKey === 'your-resend-api-key') {
          console.log(`\x1b[35m[MOCK EMAIL]\x1b[0m 📧 To: ${user.email} (Subject: ${title})\n   Body: "${body}"`);
        } else {
          // Real Resend API Call
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${resendKey}`
            },
            body: JSON.stringify({
              from: 'Rentova Hub <nexus@yourdomain.com>',
              to: [user.email],
              subject: title,
              html: `<div style="font-family:sans-serif; padding: 20px;"><h2>${title}</h2><p>${body}</p><br/><hr/><small>Rentova Automated System</small></div>`
            })
          }).catch(err => console.error('Resend Error:', err));
        }
      }
    }

  } catch (error) {
    console.error('CRITICAL: Notification Dispatcher Failed', error);
  }
}
