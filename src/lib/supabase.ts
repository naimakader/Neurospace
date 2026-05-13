"use client";

import { createClient } from "@supabase/supabase-js";
import { useAuth } from "@clerk/nextjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function useSupabase() {
  const { getToken } = useAuth();

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: async (url, options = {}) => {
        const token = await getToken({ template: "supabase" });

        const headers = new Headers(options.headers);

        if (token) {
          headers.set("Authorization", `Bearer ${token}`);
        }

        return fetch(url, {
          ...options,
          headers,
        });
      },
    },
  });

  return client;
}
