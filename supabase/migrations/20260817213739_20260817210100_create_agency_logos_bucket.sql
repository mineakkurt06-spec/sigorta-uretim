/*
# Agency Logos Storage Bucket

Create a public storage bucket for agency logo uploads.
*/
INSERT INTO storage.buckets (id, name, public) VALUES ('agency-logos', 'agency-logos', true) ON CONFLICT (id) DO NOTHING;
