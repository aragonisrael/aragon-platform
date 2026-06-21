import { JWT } from 'npm:google-auth-library@9';

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

let cachedToken: { value: string; expiresAt: number } | null = null;

function getServiceAccount(): ServiceAccount {
  const raw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT secret is missing');
  return JSON.parse(raw) as ServiceAccount;
}

async function getAccessToken(): Promise<{ token: string; projectId: string }> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    const sa = getServiceAccount();
    return { token: cachedToken.value, projectId: sa.project_id };
  }

  const sa = getServiceAccount();
  const client = new JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  });

  const { access_token, expiry_date } = await client.authorize();
  if (!access_token) throw new Error('Failed to obtain Firebase access token');

  cachedToken = {
    value: access_token,
    expiresAt: expiry_date ?? now + 3_300_000,
  };

  return { token: access_token, projectId: sa.project_id };
}

export async function sendFcmToToken(deviceToken: string, payload: PushPayload) {
  const { token, projectId } = await getAccessToken();

  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        token: deviceToken,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data ?? {},
        apns: {
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
        android: {
          priority: 'HIGH',
          notification: {
            channel_id: 'aragon_default',
          },
        },
      },
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`FCM error ${response.status}: ${text}`);
  }

  return text;
}
