export default function LastScannedCard({ item }) {
  return (
    <div className="panel last-scanned-panel">
      <div className="panel-header">
        <div>
          <h2>Last Scanned Item</h2>
          <p>Latest successful stock count recorded for the selected batch.</p>
        </div>
      </div>

      {item ? (
        <div className="details-grid">
          <div>
            <span className="detail-label">Stock Number</span>
            <strong>{item.stockNumber}</strong>
          </div>
          <div>
            <span className="detail-label">Batch Number</span>
            <strong>{item.batchNumber}</strong>
          </div>
          <div>
            <span className="detail-label">Expected Quantity</span>
            <strong>{item.expectedQuantity}</strong>
          </div>
          <div>
            <span className="detail-label">Scanned Quantity</span>
            <strong>{item.scannedQuantity}</strong>
          </div>
          <div>
            <span className="detail-label">Variance</span>
            <strong className={item.variance === 0 ? "success-text" : "danger-text"}>
              {item.variance}
            </strong>
          </div>
        </div>
      ) : (
        <p className="muted-text">No successful scans yet.</p>
      )}
    </div>
  );
}
