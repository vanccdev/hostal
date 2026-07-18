UPDATE auth.users
SET
  phone = raw_user_meta_data->>'telefono',
  phone_confirmed_at = COALESCE(phone_confirmed_at, now())
WHERE (phone IS NULL OR btrim(phone) = '')
  AND raw_user_meta_data ? 'telefono'
  AND btrim(raw_user_meta_data->>'telefono') <> '';
