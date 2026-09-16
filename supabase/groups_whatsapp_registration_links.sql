-- Per-group links for WhatsApp templates (trial registration + WhatsApp group invite)
-- Run once in Supabase SQL editor.

ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS registration_url TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_group_url TEXT;

COMMENT ON COLUMN public.groups.registration_url IS
  'Link to register for this group (used in trial confirmation / post-trial reminder templates).';

COMMENT ON COLUMN public.groups.whatsapp_group_url IS
  'WhatsApp invite link for this group chat (used after paid/full registration).';
