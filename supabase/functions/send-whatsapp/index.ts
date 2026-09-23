import {
  asTextParams,
  extractGraphError,
  extractMessageId,
  getAdminClient,
  hasOpenCustomerWindow,
  isCloudConfigured,
  isCloudEnabledEnv,
  jsonResponse,
  normalizeWaPhone,
  sendSessionText,
  sendTemplate,
  type OutboxRow,
} from '../_shared/whatsappCloud.ts';

type TriggerPayload = {
  outbox_id?: number;
  id?: number;
};

function verifyInternalSecret(req: Request) {
  const expected = Deno.env.get('WHATSAPP_WEBHOOK_SECRET');
  if (!expected) return;
  const got = req.headers.get('x-webhook-secret');
  if (got !== expected) {
    throw new Error('Unauthorized webhook');
  }
}

async function cloudEnabledInDb(): Promise<boolean> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from('whatsapp_cloud_settings')
    .select('enabled')
    .eq('id', 1)
    .maybeSingle();
  return data?.enabled === true;
}

async function markOutbox(
  id: number,
  patch: Record<string, unknown>,
) {
  const supabase = getAdminClient();
  const { error } = await supabase.from('whatsapp_outbox').update(patch).eq('id', id);
  if (error) throw error;
}

async function sendOne(row: OutboxRow) {
  const to = normalizeWaPhone(row.phone);
  if (!to) {
    await markOutbox(row.id, {
      status: 'failed',
      last_error: 'invalid phone',
      updated_at: new Date().toISOString(),
    });
    return { id: row.id, ok: false, reason: 'invalid phone' };
  }

  await markOutbox(row.id, {
    status: 'sending',
    updated_at: new Date().toISOString(),
  });

  const params = asTextParams(row.template_params);
  const templateName = row.template_name?.trim();
  const language = row.template_language?.trim() || 'he';

  let result: { ok: boolean; status: number; body: unknown };

  if (templateName) {
    result = await sendTemplate({
      to,
      name: templateName,
      language,
      params,
    });
  } else if (row.fallback_text && (await hasOpenCustomerWindow(to))) {
    result = await sendSessionText({ to, text: row.fallback_text });
  } else {
    await markOutbox(row.id, {
      status: 'failed',
      last_error:
        'No approved template and no 24h customer window. Official Cloud API cannot send free-form first contact.',
      updated_at: new Date().toISOString(),
    });
    return { id: row.id, ok: false, reason: 'template required' };
  }

  if (!result.ok) {
    const last_error = extractGraphError(result.body);
    await markOutbox(row.id, {
      status: 'failed',
      last_error,
      provider_response: result.body,
      updated_at: new Date().toISOString(),
    });
    return { id: row.id, ok: false, status: result.status, error: last_error };
  }

  const provider_message_id = extractMessageId(result.body);
  await markOutbox(row.id, {
    status: 'sent',
    provider_message_id,
    provider_response: result.body,
    sent_at: new Date().toISOString(),
    last_error: null,
    updated_at: new Date().toISOString(),
  });

  if (row.scheduled_followup_id) {
    const supabase = getAdminClient();
    await supabase
      .from('scheduled_followups')
      .update({ status: 'sent' })
      .eq('id', row.scheduled_followup_id);
  }

  return { id: row.id, ok: true, provider_message_id };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    verifyInternalSecret(req);

    if (!isCloudConfigured()) {
      return jsonResponse({
        ok: true,
        skipped: 'cloud_not_configured',
        hint: 'Set WHATSAPP_CLOUD_TOKEN and WHATSAPP_PHONE_NUMBER_ID, then enable sending.',
      });
    }

    const enabled = isCloudEnabledEnv() || (await cloudEnabledInDb());
    if (!enabled) {
      return jsonResponse({
        ok: true,
        skipped: 'cloud_disabled',
        hint: 'Set whatsapp_cloud_settings.enabled = true after Meta templates are approved.',
      });
    }

    const payload = (await req.json().catch(() => ({}))) as TriggerPayload;
    const supabase = getAdminClient();
    const outboxId = Number(payload.outbox_id ?? payload.id ?? 0);

    let query = supabase
      .from('whatsapp_outbox')
      .select(
        'id, phone, purpose, template_name, template_language, template_params, fallback_text, status, scheduled_followup_id',
      )
      .in('status', ['queued', 'failed'])
      .order('id', { ascending: true })
      .limit(25);

    if (outboxId > 0) {
      query = supabase
        .from('whatsapp_outbox')
        .select(
          'id, phone, purpose, template_name, template_language, template_params, fallback_text, status, scheduled_followup_id',
        )
        .eq('id', outboxId)
        .limit(1);
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []) as OutboxRow[];
    if (!rows.length) {
      return jsonResponse({ ok: true, sent: 0, reason: 'empty queue' });
    }

    const summary = [];
    for (const row of rows) {
      summary.push(await sendOne(row));
    }

    return jsonResponse({ ok: true, processed: rows.length, summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[send-whatsapp]', message);
    const status = message.includes('Unauthorized') ? 401 : 500;
    return jsonResponse({ ok: false, error: message }, status);
  }
});
