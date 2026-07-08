import { createClient } from "@supabase/supabase-js";

// .env.local에 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 미설정 시에도
// (createClient가 URL 형식을 검증하므로) 빌드/개발 서버가 죽지 않도록 더미 값으로 대체한다.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  (window as unknown as { __supabase?: typeof supabase }).__supabase = supabase;
}
