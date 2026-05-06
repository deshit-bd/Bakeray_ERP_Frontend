import dynamic from "next/dynamic";
import PlaceholderPanel from "./PlaceholderPanel";

function SectionLoader({ label = "Loading..." }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">
      {label}
    </div>
  );
}

const sectionMap = {
  suppliers: dynamic(() => import("./SupplierManagement"), { loading: () => <SectionLoader label="Loading Suppliers..." /> }),
  "supplier-payment": dynamic(() => import("./SupplierPaymentManagement"), {
    loading: () => <SectionLoader label="Loading Supplier Payment..." />,
  }),
  customers: dynamic(() => import("./CustomerManagement"), {
    loading: () => <SectionLoader label="Loading Customers..." />,
  }),
  "customer-order": dynamic(() => import("./CustomerOrderManagement"), {
    loading: () => <SectionLoader label="Loading Customer Orders..." />,
  }),
  purchase: dynamic(() => import("./PurchaseManagement"), {
    loading: () => <SectionLoader label="Loading Purchase..." />,
  }),
  "materials-name": dynamic(() => import("./MaterialsNameManagement"), {
    loading: () => <SectionLoader label="Loading Materials..." />,
  }),
  "factory-issue": dynamic(() => import("./FactoryIssueManagement"), {
    loading: () => <SectionLoader label="Loading Factory Issue..." />,
  }),
  "mix-production": dynamic(() => import("./MixProductionManagement"), {
    loading: () => <SectionLoader label="Loading Mix Production..." />,
  }),
  "bulk-mix-stock": dynamic(() => import("./BulkMixStockManagement"), {
    loading: () => <SectionLoader label="Loading Bulk Mix Stock..." />,
  }),
  packaging: dynamic(() => import("./PackagingManagement"), {
    loading: () => <SectionLoader label="Loading Packaging..." />,
  }),
  "repack-product": dynamic(() => import("./RepackProductManagement"), {
    loading: () => <SectionLoader label="Loading Repack Product..." />,
  }),
  "finished-stock": dynamic(() => import("./FinishedStockManagement"), {
    loading: () => <SectionLoader label="Loading Finished Stock..." />,
  }),
  inventory: dynamic(() => import("./InventoryManagement"), {
    loading: () => <SectionLoader label="Loading Inventory..." />,
  }),
  production: dynamic(() => import("./ProductionManagement"), {
    loading: () => <SectionLoader label="Loading Production..." />,
  }),
  repacking: dynamic(() => import("./RepackingManagement"), {
    loading: () => <SectionLoader label="Loading Repacking..." />,
  }),
  "sales-pos": dynamic(() => import("./SalesPosManagement"), {
    loading: () => <SectionLoader label="Loading Sales..." />,
  }),
  expenses: dynamic(() => import("./ExpenseManagement"), {
    loading: () => <SectionLoader label="Loading Expenses..." />,
  }),
  miscellaneous: dynamic(() => import("./MiscellaneousManagement"), {
    loading: () => <SectionLoader label="Loading Miscellaneous..." />,
  }),
  accounts: dynamic(() => import("./AccountsFinanceManagement"), {
    loading: () => <SectionLoader label="Loading Accounts..." />,
  }),
  reports: dynamic(() => import("./ReportsAnalyticsManagement"), {
    loading: () => <SectionLoader label="Loading Reports..." />,
  }),
  settings: dynamic(() => import("./SettingsManagement"), {
    loading: () => <SectionLoader label="Loading Settings..." />,
  }),
};

export default function SectionPageContent({ section }) {
  const SectionComponent = sectionMap[section];

  if (!SectionComponent) {
    return <PlaceholderPanel title={section} />;
  }

  return <SectionComponent />;
}
