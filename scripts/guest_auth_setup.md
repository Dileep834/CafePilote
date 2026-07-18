-- Optional: enable Google OAuth for QR guest sign-in
-- 1) Supabase Dashboard → Authentication → Providers → Google → Enable
-- 2) Add Client ID / Secret from Google Cloud Console
-- 3) Add redirect URLs:
--    http://localhost:5173/**
--    https://cafepilots.com/**
--    https://app.cafepilots.com/**
--    https://*.vercel.app/**

-- Email continue works without Auth providers (local guest session).
-- Google one-tap requires the Google provider above.

-- Domain split (landing vs app): see scripts/domain_setup.md

