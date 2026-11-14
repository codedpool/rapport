import { requireUser } from "@/lib/requireUser";
import CandidateDashboard from "./CandidateDashboard";

export const metadata = { title: "Interviewing · Rapport" };

export default async function CandidatePage() {
  const user = await requireUser("/candidate");
  return <CandidateDashboard name={user.given_name || user.name || ""} email={user.email} />;
}
