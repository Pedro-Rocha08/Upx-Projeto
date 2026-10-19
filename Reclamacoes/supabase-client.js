
const SUPABASE_URL = "https://cmzovqlmypbcbnttkrdw.supabase.co";

// Cole aqui sua chave pública sb_publishable_.
// Não use uma chave secreta ou service_role.
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_nXjRTeAs1c85k8s8_9uubQ_G7iNLvbQ";

window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
