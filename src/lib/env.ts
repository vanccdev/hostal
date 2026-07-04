const readEnv = (key: string) => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }

  return value;
};

export const publicEnv = {
  supabaseUrl: () => readEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
};

export const serverEnv = {
  supabaseServiceRoleKey: () => readEnv("SUPABASE_SERVICE_ROLE_KEY"),
  webhookReservasUrl: () => process.env.WEBHOOK_RESERVAS_URL,
  webhookPagosUrl: () => process.env.WEBHOOK_PAGOS_URL,
  webhookAuthEventsUrl: () => process.env.WEBHOOK_AUTH_EVENTS_URL,
};

