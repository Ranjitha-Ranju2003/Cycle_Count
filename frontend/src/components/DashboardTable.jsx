import { memo, useMemo, useState } from "react";

const VIRTUALIZATION_THRESHOLD = 80;
const ROW_HEIGHT = 72;
const OVERSCAN_COUNT = 6;
const SCROLLER_HEIGHT = 560;

function DashboardTable({
  inventory,
  searchTerm,
  onSearchChange,
  varianceFilter,
  onVarianceFilterChange,
  onRemoveOne,
  adjustingItemId,
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const shouldVirtualize = inventory.length > VIRTUALIZATION_THRESHOLD;
  const totalHeight = inventory.length * ROW_HEIGHT;

  const virtualRows = useMemo(() => {
    if (!shouldVirtualize) {
      return {
        items: inventory,
        offsetTop: 0,
        offsetBottom: 0,
      };
    }

    const visibleCount = Math.ceil(SCROLLER_HEIGHT / ROW_HEIGHT);
    const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_COUNT);
    const endIndex = Math.min(
      inventory.length,
      startIndex + visibleCount + OVERSCAN_COUNT * 2
    );

    return {
      items: inventory.slice(startIndex, endIndex),
      offsetTop: startIndex * ROW_HEIGHT,
      offsetBottom: Math.max(0, totalHeight - endIndex * ROW_HEIGHT),
    };
  }, [inventory, scrollTop, shouldVirtualize, totalHeight]);

  return (
    <div className="panel table-panel">
      <div className="panel-header">
        <div>
          <h2>Inventory Dashboard</h2>
          <p>Track expected versus scanned stock for each stock and batch combination.</p>
        </div>
      </div>

      <div className="table-toolbar">
        <input
          type="text"
          value={searchTerm}
          placeholder="Search stock number or batch number"
          onChange={(event) => onSearchChange(event.target.value)}
        />

        <select
          className="table-filter"
          value={varianceFilter}
          onChange={(event) => onVarianceFilterChange(event.target.value)}
        >
          <option value="all">All Rows</option>
          <option value="matched">Matched Only</option>
          <option value="variance">Variance Only</option>
        </select>
      </div>

      <div className="table-wrapper">
        <div className="table-grid-header" role="row">
          <div>Stock Number</div>
          <div>Batch Number</div>
          <div>Expected Qty</div>
          <div>Scanned Qty</div>
          <div>Variance</div>
          <div>Actions</div>
        </div>

        {inventory.length ? (
          <div
            className={`table-grid-scroller ${shouldVirtualize ? "table-grid-scroller-virtual" : ""}`}
            onScroll={
              shouldVirtualize ? (event) => setScrollTop(event.currentTarget.scrollTop) : undefined
            }
            style={shouldVirtualize ? { maxHeight: `${SCROLLER_HEIGHT}px` } : undefined}
          >
            <div style={{ paddingTop: virtualRows.offsetTop, paddingBottom: virtualRows.offsetBottom }}>
              {virtualRows.items.map((item) => (
                <div
                  key={item.id}
                  className={`table-grid-row ${item.variance === 0 ? "row-match" : "row-variance"}`}
                  role="row"
                >
                  <div>{item.stockNumber}</div>
                  <div>{item.batchNumber}</div>
                  <div>{item.expectedQuantity}</div>
                  <div>{item.scannedQuantity}</div>
                  <div>{item.variance}</div>
                  <div>
                    <button
                      type="button"
                      className="danger-button table-action-button"
                      onClick={() => onRemoveOne(item)}
                      disabled={item.scannedQuantity === 0 || adjustingItemId === item.id}
                    >
                      {adjustingItemId === item.id ? "Updating..." : "Remove 1"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-cell">
            No rows match the current search or filter.
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(DashboardTable);
