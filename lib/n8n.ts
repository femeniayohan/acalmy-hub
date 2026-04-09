/**
 * n8n API client — SERVER-SIDE ONLY.
 * Never import this in Client Components or expose to the browser.
 *
 * All functions accept per-tenant { baseUrl, apiKey } so each client
 * uses their own dedicated n8n Docker instance.
 */

export interface N8nInstance {
  baseUrl: string
  apiKey: string
}

interface N8nFetchOptions extends RequestInit {
  body?: string
}

async function n8nFetch<T>(
  instance: N8nInstance,
  path: string,
  options: N8nFetchOptions = {}
): Promise<T> {
  const response = await fetch(`${instance.baseUrl}/api/v1${path}`, {
    ...options,
    headers: {
      'X-N8N-API-KEY': instance.apiKey,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`n8n API error ${response.status} on ${path}: ${body}`)
  }

  return response.json() as Promise<T>
}

interface N8nWorkflow {
  id: string
  name: string
  active: boolean
  createdAt: string
  updatedAt: string
}

interface N8nExecution {
  id: string
  workflowId: string
  finished: boolean
  mode: string
  startedAt: string
  stoppedAt: string | null
  status: 'success' | 'error' | 'running' | 'waiting'
}

interface N8nCredential {
  id: string
  name: string
  type: string
}

export async function activateWorkflow(
  instance: N8nInstance,
  workflowId: string
): Promise<N8nWorkflow> {
  return n8nFetch<N8nWorkflow>(instance, `/workflows/${workflowId}/activate`, {
    method: 'POST',
  })
}

export async function deactivateWorkflow(
  instance: N8nInstance,
  workflowId: string
): Promise<N8nWorkflow> {
  return n8nFetch<N8nWorkflow>(instance, `/workflows/${workflowId}/deactivate`, {
    method: 'POST',
  })
}

export async function getWorkflow(
  instance: N8nInstance,
  workflowId: string
): Promise<N8nWorkflow> {
  return n8nFetch<N8nWorkflow>(instance, `/workflows/${workflowId}`)
}

export async function getWorkflowExecutions(
  instance: N8nInstance,
  workflowId: string,
  limit = 20
): Promise<{ data: N8nExecution[] }> {
  return n8nFetch<{ data: N8nExecution[] }>(
    instance,
    `/executions?workflowId=${workflowId}&limit=${limit}`
  )
}

export async function createCredential(
  instance: N8nInstance,
  name: string,
  type: string,
  data: Record<string, unknown>
): Promise<N8nCredential> {
  return n8nFetch<N8nCredential>(instance, '/credentials', {
    method: 'POST',
    body: JSON.stringify({ name, type, data }),
  })
}

export async function updateCredential(
  instance: N8nInstance,
  credentialId: string,
  data: Record<string, unknown>
): Promise<N8nCredential> {
  return n8nFetch<N8nCredential>(instance, `/credentials/${credentialId}`, {
    method: 'PATCH',
    body: JSON.stringify({ data }),
  })
}

/**
 * Returns the global admin n8n instance from env vars.
 * This is the template library — client instances are stored in Supabase tenants table.
 */
export function getAdminInstance(): N8nInstance {
  const baseUrl = process.env.N8N_BASE_URL
  const apiKey = process.env.N8N_API_KEY
  if (!baseUrl || !apiKey) throw new Error('N8N_BASE_URL or N8N_API_KEY not set')
  return { baseUrl, apiKey }
}

/**
 * Deploy a template workflow from the admin n8n instance to a client's n8n instance.
 * Fetches the workflow definition from the admin instance, then creates it on the client's.
 */
export async function deployTemplateWorkflow(
  clientInstance: N8nInstance,
  templateId: string,
  tenantSlug: string
): Promise<{ workflowId: string }> {
  const adminInstance = getAdminInstance()

  // Fetch full workflow definition from admin instance
  const template = await n8nFetch<N8nWorkflow & {
    nodes: unknown[]
    connections: Record<string, unknown>
    settings?: Record<string, unknown>
  }>(adminInstance, `/workflows/${templateId}`)

  // Create workflow on client's instance
  const newWorkflow = await n8nFetch<N8nWorkflow>(clientInstance, '/workflows', {
    method: 'POST',
    body: JSON.stringify({
      name: `[${tenantSlug}] ${template.name}`,
      nodes: template.nodes ?? [],
      connections: template.connections ?? {},
      settings: template.settings ?? {},
    }),
  })

  return { workflowId: newWorkflow.id }
}

/**
 * Test connectivity to a given n8n instance.
 * Returns true if the instance is reachable and the API key is valid.
 */
export async function testConnection(instance: N8nInstance): Promise<boolean> {
  try {
    await n8nFetch(instance, '/workflows?limit=1')
    return true
  } catch {
    return false
  }
}
