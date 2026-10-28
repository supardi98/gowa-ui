import { http, results } from '@/lib/http'

export interface WebhookRoute {
  id: string
  name: string
  match_jid: string
  webhook_url: string
  webhook_events?: string
  webhook_secret?: string
  custom_params?: Record<string, string>
  custom_headers?: Record<string, string>
  exclusive: boolean
  enabled: boolean
}

export interface UpsertWebhookRoutePayload {
  name: string
  match_jid: string
  webhook_url: string
  webhook_events?: string
  webhook_secret?: string
  custom_params?: Record<string, string>
  custom_headers?: Record<string, string>
  exclusive: boolean
  enabled: boolean
}

const enc = encodeURIComponent

export async function listWebhookRoutes(deviceId: string): Promise<WebhookRoute[]> {
  return (await results<WebhookRoute[]>(http.get(`/devices/${enc(deviceId)}/webhook/routes`))) ?? []
}

export async function addWebhookRoute(
  deviceId: string,
  payload: UpsertWebhookRoutePayload,
): Promise<WebhookRoute> {
  return results(http.post(`/devices/${enc(deviceId)}/webhook/routes`, payload))
}

export async function updateWebhookRoute(
  deviceId: string,
  routeId: string,
  payload: UpsertWebhookRoutePayload,
): Promise<WebhookRoute> {
  return results(http.put(`/devices/${enc(deviceId)}/webhook/routes/${enc(routeId)}`, payload))
}

export async function deleteWebhookRoute(deviceId: string, routeId: string): Promise<void> {
  await http.delete(`/devices/${enc(deviceId)}/webhook/routes/${enc(routeId)}`)
}
