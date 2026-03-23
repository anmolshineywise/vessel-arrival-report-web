import { Report, ReportSummary, VesselArrival } from '../types'
import { DEMO_ARRIVALS_DATA } from '../demoData'


const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

async function request<T>(path: string): Promise<T> {
  const headers: Record<string,string> = { 'Accept': 'application/json' }
  const url = `${BASE}${path}`
  console.log('[request] API Call:', { url, method: 'GET', headers })
  const res = await fetch(url, { headers })
  console.log('[request] API Response:', { status: res.status, statusText: res.statusText })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error('[request] API Error:', { status: res.status, body: text })
    throw new Error(`API Error: ${res.status}`)
  }
  const data = await res.json()
  console.log('[request] Response data:', data)
  return data
}

export async function searchReports(imo: string): Promise<{ total:number; results: ReportSummary[] }> {
  const q = new URLSearchParams({ imo })
  return request(`/reports?${q.toString()}`)
}

export async function getReport(reportId: string): Promise<Report> {
  return request(`/reports/${reportId}`)
}

export async function saveReport(reportId: string, payload: any): Promise<any> {
  // Requirement: send payload directly to external Cloudhub via POST, with fallback to local server if blocked
  const externalUrl = (import.meta.env as any).VITE_EXTERNAL_UPDATE_URL || 'https://vms-data-processing-jgjm9r.5sc6y6-4.usa-e2.cloudhub.io/api/update'
  console.log('[saveReport] API Call (external):', { url: externalUrl, method: 'POST', reportId, payloadKeys: Object.keys(payload) })

  const controller = new AbortController()
  const timeoutMs = Number((import.meta.env as any).VITE_SAVE_TIMEOUT_MS) || 15000
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  let outcome: any = null
  try {
    console.log('[saveReport] Attempting direct external POST...')
    const res = await fetch(externalUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    })

    clearTimeout(timeout)

    let body: any
    try { body = await res.json() } catch (_) { body = await res.text().catch(() => '') }

    console.log('[saveReport] External response:', { status: res.status, statusText: res.statusText, body })
    outcome = { success: res.ok, status: res.status, body }
  } catch (err: any) {
    clearTimeout(timeout)
    console.error('[saveReport] External API error:', err?.message || err)
    outcome = { success: false, error: err && err.name === 'AbortError' ? 'timeout' : String(err) }
  }

  // If direct forward succeeded, return result
  if (outcome && outcome.success) {
    console.log('[saveReport] Success via direct external POST')
    return { success: true, method: 'direct', status: outcome.status, body: outcome.body }
  }

  // Otherwise, fallback to local server which will forward server-side
  console.log('[saveReport] Attempting fallback to local server...')
  try {
    const localUrl = `${BASE}/reports/${encodeURIComponent(reportId)}`
    console.log('[saveReport] Local fallback API Call:', { url: localUrl, method: 'POST', reportId })
    const lr = await fetch(localUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    })

    let localBody: any
    try { localBody = await lr.json() } catch (_) { localBody = await lr.text().catch(() => '') }

    console.log('[saveReport] Local response:', { status: lr.status, statusText: lr.statusText, body: localBody })

    if (!lr.ok) {
      console.error('[saveReport] Local server error:', { status: lr.status })
      return { success: false, method: 'via-server', forwarded: false, localStatus: lr.status, localBody, originalOutcome: outcome }
    }

    console.log('[saveReport] Success via local server')
    return { success: true, method: 'via-server', forwarded: true, localStatus: lr.status, localBody, originalOutcome: outcome }
  } catch (err: any) {
    console.error('[saveReport] Local fallback error:', err?.message || err)
    return { success: false, method: 'none', error: String(err), originalOutcome: outcome }
  }
}

// Fetch vessel details from proxied server endpoint and map to our internal Report shape
export async function fetchVesselByImo(imo: string): Promise<Report> {
  // The user requested the browser perform a GET to the external VMS endpoint.
  // Try direct fetch first (this will fail with CORS/network in many environments),
  // and fall back to the server-side proxy `/vessel/:imo` if needed.
  interface VesselPayload {
    imo: string
    vessel_name: string
    inspector_name?: string
    date: string
    category?: string
    inspections?: Array<{
      subsection: string
      details?: string
      action?: string
      rating?: string | number
      due_after_weeks?: string | number
      images?: string[]
      updated_at?: string
    }>
  }

  async function mapToReport(data: VesselPayload): Promise<Report> {
    const reportId = `vms-${data.imo}-${data.date}`

    // Support two external shapes:
    // 1) old: { category: 'HULL', inspections: [...] }
    // 2) new: { categories: [{ category: 'HULL', inspections: [...] }, ...] }
    const categories = (data as any).categories && Array.isArray((data as any).categories)
      ? (data as any).categories.map((cat: any, cidx: number) => ({
          categoryId: `cat-${cat.category}-${cidx}`,
          name: cat.category,
          subsections: (cat.inspections || []).map((ins: any, idx: number) => ({
            subsectionId: `${reportId}-cat-${cidx}-sub-${idx}`,
            name: ins.subsection,
            details: ins.details || `${ins.action ? ins.action + '\n' : ''}`,
            action: ins.action,
            due_after_weeks: ins.due_after_weeks,
            updated_at: ins.updated_at,
            rating: (() => {
              const r = typeof ins.rating === 'string' ? Number(ins.rating) : ins.rating
              return (typeof r === 'number' && !Number.isNaN(r)) ? r : undefined
            })(),
            images: (ins.images || []).map((u: string) => ({ url: u }))
          }))
        }))
      : (data.category ? [{
          categoryId: `cat-${data.category}`,
          name: data.category,
          subsections: (data.inspections || []).map((ins: any, idx: number) => ({
            subsectionId: `${reportId}-sub-${idx}`,
            name: ins.subsection,
            details: ins.details || `${ins.action ? ins.action + '\n' : ''}`,
            action: ins.action,
            due_after_weeks: ins.due_after_weeks,
            updated_at: ins.updated_at,
            rating: (() => {
              const r = typeof ins.rating === 'string' ? Number(ins.rating) : ins.rating
              return (typeof r === 'number' && !Number.isNaN(r)) ? r : undefined
            })(),
            images: (ins.images || []).map((u: string) => ({ url: u }))
          }))
        }] : [])

    const report: Report = {
      reportId,
      imo: data.imo,
      vesselName: data.vessel_name,
      inspector: data.inspector_name,
      inspectionDate: data.date,
      categories,
    }

    return report
  }

  // Use the local proxy only (previous working behavior). This avoids CORS and ensures consistent responses.
  // On Vercel the serverless function lives under `/api/vessel/:imo` so call that path in production.
  const proxyUrl = `/api/vessel/${encodeURIComponent(imo)}`

  // 1) Try proxy first (Vite proxy or local server)
  try {
    console.debug('fetch proxy URL', proxyUrl)
    const pres = await fetch(proxyUrl, { headers: { Accept: 'application/json' } })
    console.debug('proxy response status', pres.status)
    if (pres.ok) {
      try {
        const payload = await pres.json()
        if (payload && payload.status === 'NOT_FOUND') throw new Error(`NO_DATA:${payload.message || 'No inspection found'}`)
        console.debug('Proxy payload', payload)
        return mapToReport(payload)
      } catch (parseErr: any) {
        console.warn('Proxy returned non-JSON payload', parseErr)
        // fallthrough to try direct fetch
        throw parseErr
      }
    } else {
      let bodyText = ''
      try { bodyText = JSON.stringify(await pres.json()) } catch (_) { bodyText = await pres.text().catch(() => '') }
      console.warn('Proxy returned non-OK status', pres.status, bodyText)
      // fallthrough to try direct fetch
      throw new Error(`PROXY_ERROR:${pres.status}:${bodyText}`)
    }
  } catch (proxyErr: any) {
    console.warn('Proxy attempt failed', proxyErr?.message || proxyErr)

    // In development only: attempt direct fetch to external URL as a fallback to aid debugging.
    if (import.meta.env.DEV) {
      console.warn('Attempting direct external fetch (DEV only)')
      const externalUrl = `https://vms-data-processing-jgjm9r.5sc6y6-4.usa-e2.cloudhub.io/api/vessel/${encodeURIComponent(imo)}`
      try {
        const res = await fetch(externalUrl, { headers: { Accept: 'application/json' } })
        if (!res.ok) {
          let maybe = ''
          try { maybe = JSON.stringify(await res.json()) } catch (_) { maybe = await res.text().catch(() => '') }
          throw new Error(`EXTERNAL_ERROR:${res.status}:${maybe}`)
        }
        const data = await res.json()
        if (data && data.status === 'NOT_FOUND') throw new Error(`NO_DATA:${data.message || 'No inspection found'}`)
        return mapToReport(data)
      } catch (extErr: any) {
        const pmsg = proxyErr?.message || String(proxyErr)
        const emsg = extErr?.message || String(extErr)
        throw new Error(`Failed to retrieve vessel data. Proxy error: ${pmsg}. External error: ${emsg}`)
      }
    }

    // In production, fail fast and avoid triggering browser CORS errors by trying the external URL.
    const pmsg = proxyErr?.message || String(proxyErr)
    throw new Error(`Failed to retrieve vessel data via proxy (production). Proxy error: ${pmsg}`)
  }
}

// Fetch vessel arrivals by date from the arrivals API
export async function fetchArrivals(date: string): Promise<VesselArrival[]> {
  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Invalid date format. Use YYYY-MM-DD')
  }

  // FOR DEMO: Return static data for 2026-03-23
  if (date === '2026-03-23') {
    console.log('[fetchArrivals] DEMO MODE - Returning static data for 2026-03-23')
    // Simulate API delay for realistic demo experience
    await new Promise(resolve => setTimeout(resolve, 500))
    return DEMO_ARRIVALS_DATA
  }

  const isProduction = !import.meta.env.DEV

  // In development, use local proxy first
  // In production (GitHub Pages), use direct API call (which proxies through server)
  const externalUrl = `https://oceans-x.mpa.gov.sg/api/v1/vessel/arrivals/1.0.0/date/${encodeURIComponent(date)}`
  const proxyUrl = `/api/arrivals/${encodeURIComponent(date)}`

  // In development, try local proxy first (more reliable)
  if (!isProduction) {
    try {
      const headers: Record<string, string> = { 'Accept': 'application/json' }

      console.log('[fetchArrivals] DEV - attempting local proxy:', proxyUrl)
      const res = await fetch(proxyUrl, { headers })

      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          console.log('[fetchArrivals] Success via local proxy -', data.length, 'arrivals')
          return data as VesselArrival[]
        }
      }
    } catch (err) {
      console.warn('[fetchArrivals] Local proxy failed, trying direct call:', err)
    }
  }

  // Fallback to direct external API call
  // Note: Token refresh is handled server-side by the proxy
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json'
    }

    console.log('[fetchArrivals] API Call:', {
      url: externalUrl,
      method: 'GET',
      environment: isProduction ? 'production' : 'development',
      authType: 'OAuth2 (server-side)',
      date
    })

    const res = await fetch(externalUrl, { headers, mode: 'cors' })

    console.log('[fetchArrivals] API Response:', {
      status: res.status,
      statusText: res.statusText,
      url: res.url
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('[fetchArrivals] API Error Response:', text)
      throw new Error(`API Error: ${res.status} - ${text}`)
    }

    const data = await res.json()

    console.log('[fetchArrivals] API Response Data:', {
      count: Array.isArray(data) ? data.length : 'not-array',
      data
    })

    // Validate response is an array
    if (!Array.isArray(data)) {
      throw new Error('Invalid response format: expected array')
    }

    console.log('[fetchArrivals] Success - received', data.length, 'arrivals')
    return data as VesselArrival[]
  } catch (err: any) {
    console.error('[fetchArrivals] Error:', err)
    throw err
  }
}

