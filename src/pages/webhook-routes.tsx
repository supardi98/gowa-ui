import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit2, Globe, HelpCircle, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  addWebhookRoute,
  deleteWebhookRoute,
  listWebhookRoutes,
  updateWebhookRoute,
  type UpsertWebhookRoutePayload,
  type WebhookRoute,
} from '@/api/webhook-routes'
import { ActionCard } from '@/components/shared/action-card'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DeviceGuard, useSelectedDevice } from '@/hooks/use-device-guard'

interface RouteFormState {
  name: string
  match_jid: string
  webhook_url: string
  webhook_events: string
  webhook_secret: string
  custom_params: [string, string][]
  custom_headers: [string, string][]
  exclusive: boolean
  enabled: boolean
}

const defaultFormState: RouteFormState = {
  name: '',
  match_jid: '',
  webhook_url: '',
  webhook_events: 'message',
  webhook_secret: '',
  custom_params: [['token', '']],
  custom_headers: [['Authorization', 'Bearer ']],
  exclusive: true,
  enabled: true,
}

export default function WebhookRoutesPage() {
  const deviceId = useSelectedDevice()
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRoute, setEditingRoute] = useState<WebhookRoute | null>(null)
  const [form, setForm] = useState<RouteFormState>(defaultFormState)

  const { data: routes = [], isLoading, error } = useQuery({
    queryKey: ['webhook-routes', deviceId],
    queryFn: () => (deviceId ? listWebhookRoutes(deviceId) : Promise.resolve([])),
    enabled: !!deviceId,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!deviceId) throw new Error('No device selected')

      const paramsObj: Record<string, string> = {}
      for (const [k, v] of form.custom_params) {
        if (k.trim()) paramsObj[k.trim()] = v.trim()
      }

      const headersObj: Record<string, string> = {}
      for (const [k, v] of form.custom_headers) {
        if (k.trim()) headersObj[k.trim()] = v.trim()
      }

      const payload: UpsertWebhookRoutePayload = {
        name: form.name.trim(),
        match_jid: form.match_jid.trim(),
        webhook_url: form.webhook_url.trim(),
        webhook_events: form.webhook_events.trim() || 'message',
        webhook_secret: form.webhook_secret.trim() || undefined,
        custom_params: paramsObj,
        custom_headers: headersObj,
        exclusive: form.exclusive,
        enabled: form.enabled,
      }

      if (editingRoute) {
        return updateWebhookRoute(deviceId, editingRoute.id, payload)
      }
      return addWebhookRoute(deviceId, payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['webhook-routes', deviceId] })
      toast.success(editingRoute ? 'Webhook route updated' : 'Webhook route created')
      setModalOpen(false)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to save webhook route')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (routeId: string) => {
      if (!deviceId) throw new Error('No device selected')
      return deleteWebhookRoute(deviceId, routeId)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['webhook-routes', deviceId] })
      toast.success('Route deleted')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete route')
    },
  })

  const handleOpenAdd = () => {
    setEditingRoute(null)
    setForm(defaultFormState)
    setModalOpen(true)
  }

  const handleOpenEdit = (route: WebhookRoute) => {
    setEditingRoute(route)
    setForm({
      name: route.name || '',
      match_jid: route.match_jid || '',
      webhook_url: route.webhook_url || '',
      webhook_events: route.webhook_events || 'message',
      webhook_secret: route.webhook_secret || '',
      custom_params: route.custom_params
        ? Object.entries(route.custom_params)
        : [['token', '']],
      custom_headers: route.custom_headers
        ? Object.entries(route.custom_headers)
        : [['Authorization', 'Bearer ']],
      exclusive: !!route.exclusive,
      enabled: route.enabled ?? true,
    })
    setModalOpen(true)
  }

  const handleDelete = (route: WebhookRoute) => {
    if (confirm(`Are you sure you want to delete route "${route.name || route.id}"?`)) {
      deleteMutation.mutate(route.id)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Webhook Routes"
        description="Route incoming WhatsApp events per sender JID or group to specific external webhooks."
        actions={
          deviceId && (
            <Button size="sm" onClick={handleOpenAdd}>
              <Plus className="size-4 mr-1.5" />
              Add Route
            </Button>
          )
        }
      />

      {!deviceId ? (
        <DeviceGuard />
      ) : (
        <div className="flex flex-col gap-4">
          <ActionCard
            title="Configured Routes"
            description="Events matching a pattern are forwarded to their designated destination URL."
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="size-6 animate-spin mr-2" />
                <span>Loading routes...</span>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-destructive text-sm">
                Failed to load routes: {(error as Error).message}
              </div>
            ) : routes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm space-y-1">
                <Globe className="size-8 mx-auto opacity-40 mb-2" />
                <p className="font-medium text-foreground">No custom webhook routes configured</p>
                <p className="text-xs">
                  All incoming events will fall back to the default device webhook.
                </p>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Route Name</TableHead>
                      <TableHead>Match Pattern</TableHead>
                      <TableHead>Destination Webhook</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {routes.map((route) => {
                      const isGroup =
                        route.match_jid?.includes('@g.us') || route.match_jid === '@g.us'
                      const paramCount = route.custom_params
                        ? Object.keys(route.custom_params).length
                        : 0
                      const headerCount = route.custom_headers
                        ? Object.keys(route.custom_headers).length
                        : 0

                      return (
                        <TableRow key={route.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <span>{route.name || 'Unnamed Route'}</span>
                              {route.exclusive && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] text-amber-500 border-amber-500/30 bg-amber-500/10"
                                >
                                  Exclusive
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={
                                isGroup
                                  ? 'font-mono text-xs bg-indigo-500/15 text-indigo-400 border border-indigo-500/20'
                                  : 'font-mono text-xs bg-cyan-500/15 text-cyan-400 border border-cyan-500/20'
                              }
                            >
                              {route.match_jid || '*'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[320px] truncate font-mono text-xs text-muted-foreground" title={route.webhook_url}>
                              {route.webhook_url}
                            </div>
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {paramCount > 0 && (
                                <Badge variant="outline" className="text-[10px]">
                                  {paramCount} param(s)
                                </Badge>
                              )}
                              {headerCount > 0 && (
                                <Badge variant="outline" className="text-[10px]">
                                  {headerCount} header(s)
                                </Badge>
                              )}
                              {route.webhook_events && (
                                <Badge variant="outline" className="text-[10px]">
                                  {route.webhook_events}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {route.enabled ? (
                              <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                Disabled
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenEdit(route)}
                              >
                                <Edit2 className="size-3.5 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(route)}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="size-3.5 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </ActionCard>

          {/* Pattern Guide Card */}
          <ActionCard
            title="Pattern Guide"
            description="Supported syntax for matching sender JID or Group in WhatsApp."
          >
            <div className="flex items-start gap-3 text-xs text-muted-foreground">
              <HelpCircle className="size-5 text-cyan-400 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <p>
                  <strong className="text-foreground">Exact Group:</strong>{' '}
                  <code className="text-cyan-400 font-mono bg-muted px-1.5 py-0.5 rounded">
                    120363429795720905@g.us
                  </code>{' '}
                  — only forwards events from this specific WhatsApp group.
                </p>
                <p>
                  <strong className="text-foreground">All Groups Wildcard:</strong>{' '}
                  <code className="text-cyan-400 font-mono bg-muted px-1.5 py-0.5 rounded">
                    @g.us
                  </code>{' '}
                  — forwards events from any WhatsApp group chat.
                </p>
                <p>
                  <strong className="text-foreground">Single Contact:</strong>{' '}
                  <code className="text-cyan-400 font-mono bg-muted px-1.5 py-0.5 rounded">
                    628123456789@s.whatsapp.net
                  </code>{' '}
                  — only forwards events from this specific phone number.
                </p>
                <p>
                  <strong className="text-foreground">All 1:1 Direct Chats:</strong>{' '}
                  <code className="text-cyan-400 font-mono bg-muted px-1.5 py-0.5 rounded">
                    @s.whatsapp.net
                  </code>{' '}
                  — forwards all individual direct messages.
                </p>
                <p>
                  <strong className="text-foreground">Global Wildcard:</strong>{' '}
                  <code className="text-cyan-400 font-mono bg-muted px-1.5 py-0.5 rounded">
                    *
                  </code>{' '}
                  — matches every event.
                </p>
              </div>
            </div>
          </ActionCard>
        </div>
      )}

      {/* Add / Edit Route Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRoute ? 'Edit Webhook Route' : 'Add Webhook Route'}</DialogTitle>
            <DialogDescription>
              Configure routing rules, target URL, query params, and headers.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              saveMutation.mutate()
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="route-name">Route Name</Label>
              <Input
                id="route-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Windmill Group Agent"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="route-jid">Match Pattern (JID / Group)</Label>
                <span className="text-[11px] text-muted-foreground font-mono">
                  exact JID or @g.us
                </span>
              </div>
              <Input
                id="route-jid"
                value={form.match_jid}
                onChange={(e) => setForm({ ...form, match_jid: e.target.value })}
                placeholder="e.g. 120363429795720905@g.us"
                className="font-mono text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="route-url">Destination Webhook URL</Label>
              <Input
                id="route-url"
                type="url"
                value={form.webhook_url}
                onChange={(e) => setForm({ ...form, webhook_url: e.target.value })}
                placeholder="http://localhost:8000/api/w/admins/jobs/run/..."
                className="font-mono text-xs"
                required
              />
            </div>

            {/* Custom Query Params */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Custom Query Parameters (?key=value)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-primary"
                  onClick={() =>
                    setForm({
                      ...form,
                      custom_params: [...form.custom_params, ['', '']],
                    })
                  }
                >
                  + Add Param
                </Button>
              </div>
              <div className="space-y-1.5">
                {form.custom_params.map((pair, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input
                      placeholder="Key (e.g. token)"
                      value={pair[0]}
                      onChange={(e) => {
                        const updated = [...form.custom_params]
                        updated[idx][0] = e.target.value
                        setForm({ ...form, custom_params: updated })
                      }}
                      className="h-8 text-xs font-mono"
                    />
                    <Input
                      placeholder="Value"
                      value={pair[1]}
                      onChange={(e) => {
                        const updated = [...form.custom_params]
                        updated[idx][1] = e.target.value
                        setForm({ ...form, custom_params: updated })
                      }}
                      className="h-8 text-xs font-mono"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        const updated = form.custom_params.filter((_, i) => i !== idx)
                        setForm({ ...form, custom_params: updated })
                      }}
                    >
                      &times;
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom HTTP Headers */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Custom HTTP Headers (Authorization, etc.)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-primary"
                  onClick={() =>
                    setForm({
                      ...form,
                      custom_headers: [...form.custom_headers, ['', '']],
                    })
                  }
                >
                  + Add Header
                </Button>
              </div>
              <div className="space-y-1.5">
                {form.custom_headers.map((pair, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input
                      placeholder="Header Name"
                      value={pair[0]}
                      onChange={(e) => {
                        const updated = [...form.custom_headers]
                        updated[idx][0] = e.target.value
                        setForm({ ...form, custom_headers: updated })
                      }}
                      className="h-8 text-xs font-mono"
                    />
                    <Input
                      placeholder="Header Value"
                      value={pair[1]}
                      onChange={(e) => {
                        const updated = [...form.custom_headers]
                        updated[idx][1] = e.target.value
                        setForm({ ...form, custom_headers: updated })
                      }}
                      className="h-8 text-xs font-mono"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        const updated = form.custom_headers.filter((_, i) => i !== idx)
                        setForm({ ...form, custom_headers: updated })
                      }}
                    >
                      &times;
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Route Options */}
            <div className="space-y-3 pt-2 border-t text-xs">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="route-exclusive"
                  checked={form.exclusive}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, exclusive: checked === true })
                  }
                />
                <Label htmlFor="route-exclusive" className="font-normal cursor-pointer">
                  <span className="font-medium text-foreground">Exclusive Route</span> — suppress
                  device default webhook when this route matches
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="route-enabled"
                  checked={form.enabled}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, enabled: checked === true })
                  }
                />
                <Label htmlFor="route-enabled" className="font-normal cursor-pointer">
                  <span className="font-medium text-foreground">Route Enabled</span> — actively
                  forward matching events
                </Label>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && (
                  <Loader2 className="size-4 animate-spin mr-1.5" />
                )}
                {editingRoute ? 'Save Changes' : 'Create Route'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
