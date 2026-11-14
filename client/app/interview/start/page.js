import { requireUser } from "@/lib/requireUser";
import StartScheduled from "./StartScheduled";

export const metadata = { title: "Start interview · Rapport" };

export default async function StartPage({ searchParams }) {
  const { assignment } = await searchParams;
  await requireUser(`/interview/start?assignment=${encodeURIComponent(assignment || "")}`);
  return <StartScheduled assignmentId={typeof assignment === "string" ? assignment : ""} />;
}
