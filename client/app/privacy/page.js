export const metadata = { title: "Privacy and data · Rapport" };

const rows = [
  ["Your Gnani and LLM API keys", "Held in server memory for one interview, then dropped", "Never written to a database, logs, analytics or error reports. Each session only sees its own key."],
  ["Your voice", "Streamed to Gnani for live transcription", "Rapport does not record or store audio."],
  ["Camera", "Preview on your screen only", "Video never leaves your browser."],
  ["Transcript, scores, feedback", "Saved in Rapport's database", "Guest interviews expire after 48 hours unless you sign in and save them. Signed-in interviews stay until you delete them."],
  ["Transcript sent to your LLM", "OpenRouter or Google Gemini, using your key", "Used to run the interview and write feedback, under that provider's terms."],
  ["Google profile (name, email, picture)", "Auth0 sign-in, and Rapport's database", "Deleted with 'Delete my data' on your account page."],
  ["Recruiter templates and invites", "Rapport's database", "Deleted with the recruiter's account. Candidates keep their own interview records."],
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      <h1 className="display text-4xl sm:text-5xl">Privacy and data</h1>
      <p className="mt-3 text-ink-2 max-w-2xl">
        Plainly: what Rapport touches, where it goes, and when it is deleted.
      </p>
      <div className="card mt-8 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted border-b border-line">
            <tr>
              <th className="p-4 font-medium">What</th>
              <th className="p-4 font-medium">Where</th>
              <th className="p-4 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map(([a, b, c]) => (
              <tr key={a}>
                <td className="p-4 font-medium align-top">{a}</td>
                <td className="p-4 align-top text-ink-2">{b}</td>
                <td className="p-4 align-top text-ink-2">{c}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-8 space-y-3 text-ink-2 leading-relaxed">
        <p>
          <strong>Bring your own keys.</strong> Your keys are typed into this page and sent over HTTPS to the Rapport
          server, which needs them to open the realtime voice connection to Gnani (browsers cannot set the required
          headers). The optional &ldquo;remember in this tab&rdquo; box keeps them in this tab&apos;s session storage
          only.
        </p>
        <p>
          <strong>Fair scoring.</strong> Feedback is told to judge the substance of answers only. Language choice,
          accent, grammar and code-mixing must never lower a score, and every quote is checked word for word against
          the transcript.
        </p>
        <p>
          <strong>Deletion.</strong> &ldquo;Delete my data&rdquo; removes your interviews, templates, invites and
          profile from Rapport&apos;s database and asks Auth0 to delete your sign-in profile. Gnani and your LLM
          provider retain data under their own policies.
        </p>
      </div>
    </div>
  );
}
