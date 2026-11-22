import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'

const env = loadEnv('development', process.cwd(), '')
const url = env.VITE_SUPABASE_URL?.trim()
const key = (env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_ANON_KEY)?.trim()
const config = await readFile(resolve('supabase/config.toml'), 'utf8')
const configuredRef = config.match(/^project_id\s*=\s*"([a-z0-9]+)"/m)?.[1]

if (!url || !key || !configuredRef) {
  console.error('Supabase verification could not start: configuration is incomplete.')
  process.exit(1)
}

const urlRef = new URL(url).hostname.split('.')[0]
if (urlRef !== configuredRef) {
  console.error('Supabase verification stopped: URL and migration project references do not match.')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const categories = await supabase.from('categories').select('id', { count: 'exact', head: true })
const listings = await supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'active')
const images = await supabase.from('listing_images').select('id', { count: 'exact', head: true })

if (categories.error || listings.error || images.error) {
  console.error(`Supabase Data API verification failed (categories: ${categories.error?.code ?? 'ok'}, listings: ${listings.error?.code ?? 'ok'}, images: ${images.error?.code ?? 'ok'}).`)
  process.exit(1)
}

console.log(`Supabase project ${urlRef}: connected through the public client key.`)
console.log(`Categories visible to anon: ${categories.count ?? 0}.`)
console.log(`Active listings visible to anon: ${listings.count ?? 0}.`)
console.log(`Public listing image metadata query: ok (${images.count ?? 0} visible rows).`)
