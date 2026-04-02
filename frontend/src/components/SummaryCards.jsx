export default function SummaryCards({ inventory }) {
  const totalItems = inventory.length;
  const matchedItems = inventory.filter((item) => item.variance === 0).length;
  const pendingItems = totalItems - matchedItems;
  const totalExpected = inventory.reduce((sum, item) => sum + item.expectedQuantity, 0);
  const totalScanned = inventory.reduce((sum, item) => sum + item.scannedQuantity, 0);

  const cards = [
    { label: "Inventory Rows", value: totalItems },
    { label: "Matched Rows", value: matchedItems },
    { label: "Pending Rows", value: pendingItems },
    { label: "Expected Units", value: totalExpected },
    { label: "Scanned Units", value: totalScanned },
  ];

  return (
    <div className="summary-grid">
      {cards.map((card) => (
        <div className="summary-card" key={card.label}>
          <span>{card.label}</span>
          <strong>{card.value}</strong>
        </div>
      ))}
    </div>
  );
}
