import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";

// Server-side gate for signed-in pages. The API enforces ownership on every call;
// this only spares signed-out visitors an empty page.
export async function requireUser(returnTo) {
  const session = await auth0.getSession();
  if (!session?.user) {
    redirect(`/auth/login?connection=google-oauth2&returnTo=${encodeURIComponent(returnTo)}`);
  }
  return session.user;
}
