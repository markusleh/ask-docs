import 'server-only'
import { createClient } from '@supabase/supabase-js'

// maka sure env vars are set
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  throw new Error("SUPABASE_URL or SUPABASE_KEY not set, please set it in your .env file or in your environment variables");
}

const supabaseUrl = process.env.SUPABASE_URL as string
const supabaseKey = process.env.SUPABASE_KEY as string
export const supabaseServer = createClient(supabaseUrl, supabaseKey)
