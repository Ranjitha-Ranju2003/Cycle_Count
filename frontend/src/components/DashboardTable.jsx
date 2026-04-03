import { memo } from "react";

function DashboardTable({
  inventory,
  searchTerm,
  onSearchChange,
  varianceFilter,
  onVarianceFilterChange,
  onRemoveOne,
  adjustingItemId,
}) {
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
        <table>
          <thead>
            <tr>
              <th>Stock Number</th>
              <th>Batch Number</th>
              <th>Expected Qty</th>
              <th>Scanned Qty</th>
              <th>Variance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {inventory.length ? (
              inventory.map((item) => (
                <tr
                  key={item.id}
                  className={item.variance === 0 ? "row-match" : "row-variance"}
                >
                  <td>{item.stockNumber}</td>
                  <td>{item.batchNumber}</td>
                  <td>{item.expectedQuantity}</td>
                  <td>{item.scannedQuantity}</td>
                  <td>{item.variance}</td>
                  <td>
                    <button
                      type="button"
                      className="danger-button table-action-button"
                      onClick={() => onRemoveOne(item)}
                      disabled={item.scannedQuantity === 0 || adjustingItemId === item.id}
                    >
                      {adjustingItemId === item.id ? "Updating..." : "Remove 1"}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="empty-cell">
                  No rows match the current search or filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default memo(DashboardTable);
