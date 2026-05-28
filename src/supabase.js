import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://gsikpangdiejzyzjwphx.supabase.co";
const supabaseAnonKey = "sb_publishable_C8gWRia7803CfnZNsx6nRQ_zIZF3sM4";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);