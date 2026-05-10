import { ResearchDashboard } from "@/components/dashboard/research-dashboard";
import { getDashboardData } from "@/lib/server/reports";

export default async function Page() {
  const data = await getDashboardData();

  return (
    <main className="terminal-grid min-h-screen p-3 md:p-5">
      <ResearchDashboard
        reports={data.reports}
        initialReport={data.selected}
        latestByTicker={data.latestByTicker}
        initialDiff={data.diff}
      />
    </main>
  );
}
