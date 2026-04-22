import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lnqivdhbpzpeeqscyprb.supabase.co'
const supabaseKey = 'sb_publishable_uv7v8srPuiJEbuiT_wEztQ_kuGNI3To'

export const supabase = createClient(supabaseUrl, supabaseKey)