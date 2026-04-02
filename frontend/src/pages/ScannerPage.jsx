import BarcodeInput from "../components/BarcodeInput";

export default function ScannerPage({ inventory, onScan, isLoading }) {
  return (
    <>
      <section className="hero">
        <div>
          <span className="eyebrow">Scanning Workspace</span>
          <h1>Scanner Input</h1>
          <p>
            Use hardware scanner input in a dedicated workspace for batch-first item
            counting and live quantity updates.
          </p>
        </div>
      </section>

      <BarcodeInput inventory={inventory} onScan={onScan} isLoading={isLoading} />
    </>
  );
}
