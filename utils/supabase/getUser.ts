import { cookies } from "next/headers";
import { createClient } from "./server";

export async function getUser() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
