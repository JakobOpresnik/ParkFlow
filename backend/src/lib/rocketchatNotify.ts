// Outbound notifications to RocketChat via an Incoming Webhook.
// The webhook URL is a secret: env only, never logged, never sent to the client.
const WEBHOOK_ENV = 'ROCKETCHAT_INCOMING_WEBHOOK_URL'

/**
 * Posts a direct message to @handle. Best-effort: returns true only on an OK
 * response. Never throws — a delivery failure must not break the caller.
 */
export async function pushChatMessage(
  handle: string,
  text: string,
): Promise<boolean> {
  const url = process.env[WEBHOOK_ENV]
  if (!url || !handle) return false
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: `@${handle}`, text }),
    })
    return res.ok
  } catch (err) {
    console.error(
      '[rocketchatNotify] push failed:',
      err instanceof Error ? err.message : String(err),
    )
    return false
  }
}
