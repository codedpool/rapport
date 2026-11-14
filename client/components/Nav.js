import { auth0 } from "@/lib/auth0";
import HeaderShell from "./HeaderShell";

export default async function Nav() {
  let user = null;
  try {
    const u = (await auth0.getSession())?.user;
    if (u) user = { name: u.name || u.email, email: u.email, picture: u.picture };
  } catch {
    user = null;
  }
  return <HeaderShell user={user} />;
}
