import { requireUser } from "@/lib/requireUser";
import RecruiterDashboard from "./RecruiterDashboard";

export const metadata = { title: "Hiring · Rapport" };

export default async function RecruiterPage() {
  await requireUser("/recruiter");
  return <RecruiterDashboard />;
}
