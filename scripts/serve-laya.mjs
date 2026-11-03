import { spawn } from 'node:child_process'
import { loadEnv } from 'vite'
const local = loadEnv('development', process.cwd(), '')
const env = { ...process.env }
for (const name of ['LAYA_API_KEY', 'LAYA_DEVICE', 'LAYA_HOST', 'LAYA_PORT']) if (!env[name] && local[name]) env[name] = local[name]
env.LAYA_HOST ||= '127.0.0.1'
env.LAYA_PORT ||= '8000'
env.LAYA_MODELS = 'typed-decisions'
env.LAYA_MAX_LOADED = '1'
env.LAYA_PRELOAD = '1'
// Keep native truncation diagnostics in every response.
delete env.LAYA_JEV_STRICT
if (!['127.0.0.1', 'localhost', '::1'].includes(env.LAYA_HOST) && !env.LAYA_API_KEY) throw new Error('Set LAYA_API_KEY before exposing the model server to a network.')
const child = spawn('.venv-laya/bin/laya-serve', [], { env, stdio: 'inherit' })
child.on('error', () => { console.error('Run npm run laya:setup first (Python 3.12+ required).'); process.exitCode = 1 })
child.on('exit', code => { process.exitCode = code ?? 1 })
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
