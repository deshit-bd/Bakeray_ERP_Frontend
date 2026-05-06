import { notFound } from "next/navigation";
import ReportsPageShell, {
  isValidReportKey,
  reportTabs,
} from "@/components/reports/ReportsPageShell";

export const dynamicParams = false;

export function generateStaticParams() {
  return reportTabs.map((tab) => ({ report: tab.key }));
}

export default async function ReportPage({ params }) {
  const { report } = await params;

  if (!isValidReportKey(report)) {
    notFound();
  }

  return <ReportsPageShell activeReportKey={report} />;
}
