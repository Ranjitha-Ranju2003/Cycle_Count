import CameraScanner from "../components/CameraScanner";

export default function CameraPage({ inventory, onDetected, isLoading }) {
  return (
    <>
      <section className="hero">
        <div>
          <span className="eyebrow">Scanning Workspace</span>
          <h1>Camera Scan</h1>
          <p>
            Use the device camera in a dedicated workspace to capture the batch number
            first and then the stock number inside that batch.
          </p>
        </div>
      </section>

      <CameraScanner inventory={inventory} onDetected={onDetected} isLoading={isLoading} />
    </>
  );
}
