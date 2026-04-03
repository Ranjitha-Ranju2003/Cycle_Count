import { memo, useEffect, useMemo, useRef, useState } from "react";

const normalizeValue = (value) =>
  String(value ?? "")
    .trim()
    .replace(/[\n\r\t]/g, "")
    .replace(/\s+/g, "")
    .toUpperCase();

const getUniqueSuggestions = (values) => [...new Set(values.filter(Boolean))].sort();

function BarcodeInput({ inventory, onScan, isLoading }) {
  const [batchNumber, setBatchNumber] = useState("");
  const [stockNumber, setStockNumber] = useState("");
  const [isBatchSuggestionsOpen, setIsBatchSuggestionsOpen] = useState(false);
  const [isStockSuggestionsOpen, setIsStockSuggestionsOpen] = useState(false);
  const batchInputRef = useRef(null);
  const stockInputRef = useRef(null);
  const batchSuggestionsRef = useRef(null);
  const stockSuggestionsRef = useRef(null);

  const normalizedBatch = normalizeValue(batchNumber);
  const normalizedStock = normalizeValue(stockNumber);
  const inventoryLookup = useMemo(() => {
    const normalizedItems = inventory.map((item) => ({
      ...item,
      normalizedBatchNumber: normalizeValue(item.batchNumber),
      normalizedStockNumber: normalizeValue(item.stockNumber),
    }));
    const batchSet = new Set();
    const batchStockMap = new Map();
    const batchLabelMap = new Map();
    const stockLabelMap = new Map();

    for (const item of normalizedItems) {
      batchSet.add(item.normalizedBatchNumber);

      if (!batchStockMap.has(item.normalizedBatchNumber)) {
        batchStockMap.set(item.normalizedBatchNumber, new Set());
        batchLabelMap.set(item.normalizedBatchNumber, item.batchNumber);
      }

      batchStockMap.get(item.normalizedBatchNumber).add(item.normalizedStockNumber);

      if (!stockLabelMap.has(item.normalizedBatchNumber)) {
        stockLabelMap.set(item.normalizedBatchNumber, new Map());
      }

      stockLabelMap
        .get(item.normalizedBatchNumber)
        .set(item.normalizedStockNumber, item.stockNumber);
    }

    return {
      batchSet,
      batchStockMap,
      batchLabelMap,
      stockLabelMap,
    };
  }, [inventory]);
  const batchSuggestions = useMemo(
    () =>
      getUniqueSuggestions([...inventoryLookup.batchLabelMap.values()]).filter((item) =>
        normalizeValue(item).includes(normalizedBatch)
      ),
    [inventoryLookup, normalizedBatch]
  );
  const stockSuggestions = useMemo(() => {
    const batchStockLabels = inventoryLookup.stockLabelMap.get(normalizedBatch);

    if (!batchStockLabels) {
      return [];
    }

    return getUniqueSuggestions([...batchStockLabels.values()]).filter((item) =>
      normalizeValue(item).includes(normalizedStock)
    );
  }, [inventoryLookup, normalizedBatch, normalizedStock]);

  useEffect(() => {
    batchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!batchSuggestionsRef.current?.contains(event.target)) {
        setIsBatchSuggestionsOpen(false);
      }

      if (!stockSuggestionsRef.current?.contains(event.target)) {
        setIsStockSuggestionsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const moveToStockInput = () => {
    stockInputRef.current?.focus();
    stockInputRef.current?.select();
  };

  const submitScan = async () => {
    const normalizedBatchNumber = normalizeValue(batchNumber);
    const normalizedStockNumber = normalizeValue(stockNumber);

    if (!normalizedBatchNumber || !normalizedStockNumber) {
      return;
    }

    await onScan({
      batchNumber: normalizedBatchNumber,
      stockNumber: normalizedStockNumber,
    });

    setStockNumber("");
    setIsStockSuggestionsOpen(false);
    moveToStockInput();
  };

  const handleBatchKeyDown = (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    if (normalizedBatch) {
      setIsBatchSuggestionsOpen(false);
      moveToStockInput();
    }
  };

  const handleStockKeyDown = async (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      await submitScan();
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2>Scanner Input</h2>
          <p>
            Scan or type the Batch Number first, then the Stock Number inside that
            batch.
          </p>
        </div>
      </div>

      <div className="scanner-flow-card">
        <div className="scanner-fields">
          <div className="scanner-field-row">
            <label htmlFor="scanner-batch-number" className="scanner-field-label">
              Batch Number
            </label>
            <div className="scanner-input-wrap" ref={batchSuggestionsRef}>
              <input
                id="scanner-batch-number"
                ref={batchInputRef}
                type="text"
                value={batchNumber}
                placeholder="Scan or enter batch number"
                autoComplete="off"
                onChange={(event) => {
                  const nextBatchNumber = event.target.value;
                  setBatchNumber(nextBatchNumber);
                  setStockNumber("");
                  setIsStockSuggestionsOpen(false);
                  setIsBatchSuggestionsOpen(Boolean(normalizeValue(nextBatchNumber)));

                  if (inventoryLookup.batchSet.has(normalizeValue(nextBatchNumber))) {
                    window.requestAnimationFrame(moveToStockInput);
                  }
                }}
                onKeyDown={handleBatchKeyDown}
                disabled={isLoading}
              />

              {isBatchSuggestionsOpen && batchSuggestions.length ? (
                <div className="scanner-suggestions">
                  {batchSuggestions.slice(0, 8).map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="scanner-suggestion-item"
                      onClick={() => {
                        setBatchNumber(suggestion);
                        setStockNumber("");
                        setIsBatchSuggestionsOpen(false);
                        window.requestAnimationFrame(moveToStockInput);
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="scanner-field-row">
            <label htmlFor="scanner-stock-number" className="scanner-field-label">
              Stock Number
            </label>
            <div className="scanner-input-wrap" ref={stockSuggestionsRef}>
              <input
                id="scanner-stock-number"
                ref={stockInputRef}
                type="text"
                value={stockNumber}
                placeholder={
                  normalizedBatch
                    ? "Scan or enter stock number"
                    : "Select a batch number first"
                }
                autoComplete="off"
                onChange={(event) => {
                  setStockNumber(event.target.value);
                  setIsStockSuggestionsOpen(Boolean(normalizeValue(event.target.value)));
                }}
                onKeyDown={handleStockKeyDown}
                disabled={isLoading || !normalizedBatch}
              />

              {isStockSuggestionsOpen && stockSuggestions.length ? (
                <div className="scanner-suggestions">
                  {stockSuggestions.slice(0, 8).map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="scanner-suggestion-item"
                      onClick={() => {
                        setStockNumber(suggestion);
                        setIsStockSuggestionsOpen(false);
                        window.requestAnimationFrame(() => {
                          stockInputRef.current?.focus();
                        });
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="scanner-actions-row">
          <button type="button" onClick={submitScan} disabled={isLoading || !normalizedBatch || !stockNumber.trim()}>
            {isLoading ? "Counting..." : "Count Item"}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setBatchNumber("");
              setStockNumber("");
              setIsBatchSuggestionsOpen(false);
              setIsStockSuggestionsOpen(false);
              batchInputRef.current?.focus();
            }}
            disabled={isLoading}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(BarcodeInput);
