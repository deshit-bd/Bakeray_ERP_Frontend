import { notFound } from "next/navigation";
import SectionPageContent from "../../components/SectionPageContent";

const validSections = new Set([
  "suppliers",
  "supplier-payment",
  "customers",
  "purchase",
  "materials-name",
  "factory-issue",
  "mix-production",
  "bulk-mix-stock",
  "packaging",
  "repack-product",
  "expenses",
  "miscellaneous",
  "accounts",
  "reports",
  "settings",
]);

export default async function SectionPage({ params }) {
  const { section } = await params;

  if (!validSections.has(section)) {
    notFound();
  }

  return <SectionPageContent section={section} />;
}
