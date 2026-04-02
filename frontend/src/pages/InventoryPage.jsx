import DashboardTable from "../components/DashboardTable";

export default function InventoryPage({
  inventory,
  searchTerm,
  onSearchChange,
  varianceFilter,
  onVarianceFilterChange,
  onRemoveOne,
  adjustingItemId,
}) {
  return (
    <>
      <section className="hero">
        <div>
          <span className="eyebrow">Inventory Workspace</span>
          <h1>Inventory Table</h1>
          <p>
            Search rows, filter matched versus pending counts, and correct mistaken
            extra counts directly from the table.
          </p>
        </div>
      </section>

      <DashboardTable
        inventory={inventory}
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        varianceFilter={varianceFilter}
        onVarianceFilterChange={onVarianceFilterChange}
        onRemoveOne={onRemoveOne}
        adjustingItemId={adjustingItemId}
      />
    </>
  );
}
