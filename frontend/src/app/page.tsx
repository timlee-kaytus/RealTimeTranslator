import { cookies } from "next/headers";

import { AppShell } from "@/components/AppShell";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth/session";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const isAuthenticated = await verifyAuthToken(token);

  return isAuthenticated ? <AppShell /> : <LoginScreen />;
}
