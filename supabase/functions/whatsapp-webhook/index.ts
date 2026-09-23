import {
  getAdminClient,
  jsonResponse,
  normalizeWaPhone,
} from '../_shared/whatsappCloud.ts';

type MetaChange = {
  value?: {
    metadata?: { display_phone_number?: string; phone_number_id?: string };
    statuses?: Array<{
      id?: string;
      status?: string;
      timestamp?: string;
      errors?: Array<{ code?: number; title?: string; message?: string }>;
    }>;
    messages?: Array<{
      from?: string;
      id?: string;
      timestamp?: string;
      type?: string;
      text?: { body?: string };
    }>;
    contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
  };
};

function verifyMetaSignature(_req: Request, _rawBody: string) {
  const appSecret = Deno.env.get('WHATSAPP_APP_SECRET');
  if (!appSecret) return true;
  // Optional: add HMAC SHA256 of raw body vs x-hub-signature-256 when app secret is set.
  return true;
}

async function handleStatuses(
  statuses: NonNullable<NonNullable<MetaChange['value']>['statuses']>,
) {
  const supabase = getAdminClient();
  for (const status of statuses) {
    if (!status.id) continue;
    const mapped =
      status.status === 'delivered' || status.status === 'read'
        ? status.status
        : status.status === 'failed'
          ? 'failed'
          : status.status === 'sent'
            ? 'sent'
            : null;

    const last_error = status.errors?.[0]
      ? `${status.errors[0].code ?? ''} ${status.errors[0].title ?? status.errors[0].message ?? ''}`.trim()
      : null;

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (mapped) patch.status = mapped;
    if (last_error) patch.last_error = last_error;
    if (status.status === 'delivered') patch.delivered_at = new Date().toISOString();

    await supabase
      .from('whatsapp_outbox')
      .update(patch)
      .eq('provider_message_id', status.id);
  }
}

async function handleInbound(
  messages: NonNullable<NonNullable<MetaChange['value']>['messages']>,
) {
  const supabase = getAdminClient();
  for (const message of messages) {
    const phone = normalizeWaPhone(message.from ?? '');
    if (!phone) continue;
    await supabase.from('whatsapp_inbound').insert({
      phone,
      provider_message_id: message.id ?? null,
      message_type: message.type ?? 'unknown',
      message_text: message.text?.body ?? null,
      received_at: message.timestamp
        ? new Date(Number(message.timestamp) * 1000).toISOString()
        : new Date().toISOString(),
      raw: message,
    });
  }
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    const expected = Deno.env.get('WHATSAPP_VERIFY_TOKEN');

    if (mode === 'subscribe' && expected && token === expected && challenge) {
      return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
    return jsonResponse({ ok: false, error: 'Verification failed' }, 403);
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const raw = await req.text();
    if (!verifyMetaSignature(req, raw)) {
      return jsonResponse({ ok: false, error: 'Bad signature' }, 401);
    }

    const payload = JSON.parse(raw || '{}') as {
      entry?: Array<{ changes?: MetaChange[] }>;
    };

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        if (value?.statuses?.length) await handleStatuses(value.statuses);
        if (value?.messages?.length) await handleInbound(value.messages);
      }
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[whatsapp-webhook]', message);
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
