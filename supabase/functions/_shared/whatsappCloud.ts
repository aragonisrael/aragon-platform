import { createClient } from 'npm:@supabase/supabase-js@2';

const GRAPH_BASE = 'https://graph.facebook.com/v21.0';

export type OutboxRow = {
  id: number;
  phone: string;
  purpose: string;
  template_name: string | null;
  template_language: string | null;
  template_params: unknown;
  fallback_text: string | null;
  status: string;
  scheduled_followup_id: number | null;
};

export function getAdminClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Supabase service role env is missing');
  return createClient(url, key);
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function normalizeWaPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length >= 9) return `972${digits.slice(1)}`;
  if (digits.startsWith('972')) return digits;
  return digits;
}

export function isCloudConfigured(): boolean {
  return Boolean(
    Deno.env.get('WHATSAPP_CLOUD_TOKEN') &&
      Deno.env.get('WHATSAPP_PHONE_NUMBER_ID'),
  );
}

export function isCloudEnabledEnv(): boolean {
  const raw = (Deno.env.get('WHATSAPP_CLOUD_ENABLED') ?? '').toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

function asTextParams(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object' && 'text' in item) {
        return String((item as { text: unknown }).text ?? '');
      }
      return String(item ?? '');
    })
    .map((text) => text.trim())
    .filter(Boolean);
}

export async function graphSend(payload: Record<string, unknown>) {
  const token = Deno.env.get('WHATSAPP_CLOUD_TOKEN');
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
  if (!token || !phoneNumberId) {
    throw new Error('WhatsApp Cloud credentials are missing');
  }

  const response = await fetch(`${GRAPH_BASE}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      ...payload,
    }),
  });

  const body = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, body };
}

export async function sendTemplate(opts: {
  to: string;
  name: string;
  language: string;
  params: string[];
}) {
  const parameters = opts.params.map((text) => ({ type: 'text', text: text.slice(0, 1024) }));
  return graphSend({
    to: opts.to,
    type: 'template',
    template: {
      name: opts.name,
      language: { code: opts.language || 'he' },
      components: parameters.length
        ? [{ type: 'body', parameters }]
        : [],
    },
  });
}

export async function sendSessionText(opts: { to: string; text: string }) {
  return graphSend({
    to: opts.to,
    type: 'text',
    text: { preview_url: false, body: opts.text.slice(0, 4096) },
  });
}

export function extractMessageId(body: unknown): string | null {
  const record = body as {
    messages?: Array<{ id?: string }>;
  };
  return record?.messages?.[0]?.id ?? null;
}

export function extractGraphError(body: unknown): string {
  const record = body as {
    error?: { message?: string; error_user_msg?: string; code?: number };
  };
  return (
    record?.error?.error_user_msg ||
    record?.error?.message ||
    JSON.stringify(body)
  );
}

export async function hasOpenCustomerWindow(phone: string): Promise<boolean> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from('whatsapp_inbound')
    .select('received_at')
    .eq('phone', phone)
    .order('received_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.received_at) return false;
  const ageMs = Date.now() - new Date(data.received_at).getTime();
  return ageMs < 24 * 60 * 60 * 1000;
}

export { asTextParams };
