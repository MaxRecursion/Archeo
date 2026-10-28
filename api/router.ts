import { handleAnalyze } from '../lib/server/routes/analyze.js'
import { handleHealth } from '../lib/server/routes/health.js'
import { handleSource } from '../lib/server/routes/source.js'

const handlers = {
  analyze: handleAnalyze,
  source: handleSource,
  health: handleHealth,
} as const

export default {
  async fetch(request: Request): Promise<Response> {
    const route = new URL(request.url).searchParams.get('route')
    if (!route || !Object.hasOwn(handlers, route)) return Response.json({ error: 'Not found.', code: 'NOT_FOUND' }, { status: 404 })
    return handlers[route as keyof typeof handlers](request)
  },
}
