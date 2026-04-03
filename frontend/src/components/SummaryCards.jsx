import { memo, useMemo } from "react";

function SummaryCards({ inventory }) {
  const totalItems = inventory.length;
  const cards = useMemo(() => {
    const matchedItems = inventory.filter((item) => item.variance === 0).length;
    const pendingItems = totalItems - matchedItems;
    const totalExpected = inventory.reduce((sum, item) => sum + item.expectedQuantity, 0);
    const totalScanned = inventory.reduce((sum, item) => sum + item.scannedQuantity, 0);

    return [
      { label: "Inventory Rows", value: totalItems },
      { label: "Matched Rows", value: matchedItems },
      { label: "Pending Rows", value: pendingItems },
      { label: "Expected Units", value: totalExpected },
      { label: "Scanned Units", value: totalScanned },
    ];
  }, [inventory, totalItems]);

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

export default memo(SummaryCards);
