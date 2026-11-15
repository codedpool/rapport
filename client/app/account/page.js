import { requireUser } from "@/lib/requireUser";
import DeleteData from "./DeleteData";
import ResumesManager from "./ResumesManager";

export const metadata = { title: "Account · Rapport" };

export default async function AccountPage() {
  const user = await requireUser("/account");
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 space-y-6">
      <h1 className="display text-4xl">Account</h1>
      <div className="card p-6 flex items-center gap-4">
        {user.picture && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.picture} alt="" className="h-14 w-14 rounded-full" referrerPolicy="no-referrer" />
        )}
        <div className="flex-1">
          <div className="font-semibold">{user.name}</div>
          <div className="text-sm text-muted">{user.email}</div>
        </div>
        <a href="/auth/logout" className="btn btn-ghost">Sign out</a>
      </div>
      <div className="card p-6">
        <h2 className="font-semibold">What we keep</h2>
        <p className="mt-2 text-ink-2 text-sm leading-relaxed">
          Your Google profile (name, email, picture) via Auth0, your interviews (transcripts, scores and feedback),
          the short summaries of your saved resumes, plus templates and invites if you hire. We never store API keys or audio.
        </p>
      </div>
      <ResumesManager />
      <DeleteData />
    </div>
  );
}
