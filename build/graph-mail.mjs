/* Send mail as a real archissance.com mailbox through Microsoft Graph.

   Why: the domain's mail is hosted by Microsoft 365, so mail relayed by
   GoDaddy's gateway claiming an archissance.com sender fails Microsoft's
   SPF/DKIM checks and can be quarantined. Sending via Graph over HTTPS
   (allowed from the GoDaddy container, unlike SMTP) makes Microsoft itself
   the sender, so it is authenticated and lands normally.

   Needs four env vars (GoDaddy Publish secrets) from an Entra app
   registration with the Mail.Send *application* permission:
     MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET, MS_SENDER (mailbox to send as)
   With any of them unset, isGraphConfigured() is false and the handler keeps
   using the GoDaddy gateway, so this file is inert until they exist. */

const REQUEST_TIMEOUT_MS = 30_000;

let cachedToken = null; // { value, expiresAt }

export function isGraphConfigured() {
  return Boolean(
    process.env.MS_TENANT_ID &&
    process.env.MS_CLIENT_ID &&
    process.env.MS_CLIENT_SECRET &&
    process.env.MS_SENDER
  );
}

async function getToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const res = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(process.env.MS_TENANT_ID)}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.MS_CLIENT_ID,
        client_secret: process.env.MS_CLIENT_SECRET,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    throw new Error(`graph token failed: HTTP ${res.status} ${body.error || ""}`.trim());
  }
  cachedToken = { value: body.access_token, expiresAt: Date.now() + (body.expires_in || 3600) * 1000 };
  return cachedToken.value;
}

export async function sendGraphMail({ to, replyTo, subject, text }) {
  let token;
  try {
    token = await getToken();
  } catch (err) {
    throw err instanceof Error && err.message.startsWith("graph token")
      ? err
      : new Error(`graph token unreachable: ${err instanceof Error ? err.message : String(err)}`);
  }

  const message = {
    subject,
    body: { contentType: "Text", content: text },
    toRecipients: [{ emailAddress: { address: to } }],
  };
  if (replyTo) message.replyTo = [{ emailAddress: { address: replyTo } }];

  let res;
  try {
    res = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(process.env.MS_SENDER)}/sendMail`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ message, saveToSentItems: false }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      }
    );
  } catch (err) {
    throw new Error(`graph send unreachable: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Graph answers 202 Accepted with an empty body on success.
  if (res.status !== 202) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) cachedToken = null;
    throw new Error(`graph send failed: HTTP ${res.status} ${body?.error?.code || ""}`.trim());
  }
  return { provider: "graph" };
}
