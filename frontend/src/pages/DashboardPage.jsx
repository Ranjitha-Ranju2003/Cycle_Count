import { lazy, Suspense, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import FileUpload from "../components/FileUpload";
import LastScannedCard from "../components/LastScannedCard";
import SummaryCards from "../components/SummaryCards";
const CameraPage = lazy(() => import("./CameraPage"));
const InventoryPage = lazy(() => import("./InventoryPage"));
const ProfilePage = lazy(() => import("./ProfilePage"));
const ScannerPage = lazy(() => import("./ScannerPage"));
import {
  adjustScannedQuantity,
  downloadExport,
  fetchInventory,
  resetInventory,
  scanInventoryItem,
  uploadExcel,
} from "../services/api";

const createBeep = () => {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    return;
  }

  const audioContext = new AudioContextClass();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = 880;
  gainNode.gain.value = 0.05;
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.08);
};

export default function DashboardPage({
  currentUser,
  onLogout,
  onProfileUpdate,
  onDeleteProfile,
}) {
  const profileMenuRef = useRef(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth > 980 : true
  );
  const [activePage, setActivePage] = useState("dashboard");
  const [inventory, setInventory] = useState([]);
  const [lastScannedItem, setLastScannedItem] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [varianceFilter, setVarianceFilter] = useState("all");
  const [isUploading, setIsUploading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [adjustingItemId, setAdjustingItemId] = useState(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isExportConfirmOpen, setIsExportConfirmOpen] = useState(false);

  const loadInventory = async () => {
    try {
      const data = await fetchInventory();
      setInventory(data);
    } catch (apiError) {
      setError(apiError.message);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 980) {
        setIsSidebarOpen(true);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (!message) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setMessage("");
    }, 3500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [message]);

  useEffect(() => {
    if (!error) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setError("");
    }, 4000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [error]);

  const handleUpload = async (file) => {
    try {
      setIsUploading(true);
      setError("");
      setMessage("Uploading Excel file...");

      const response = await uploadExcel(file);
      setInventory(response.inventory);
      setLastScannedItem(null);
      setMessage(`Uploaded ${response.count} rows successfully.`);
    } catch (apiError) {
      setError(apiError.message ? `Failed to upload file. ${apiError.message}` : "Failed to upload file.");
    } finally {
      setIsUploading(false);
    }
  };

  const syncScannedItem = (updatedItem) => {
    setInventory((currentInventory) =>
      currentInventory.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    );
  };

  const handleScan = async ({ batchNumber, stockNumber }) => {
    try {
      setIsScanning(true);
      setError("");
      setMessage("Submitting scan...");

      const response = await scanInventoryItem({ batchNumber, stockNumber });
      syncScannedItem(response.item);
      setLastScannedItem(response.item);
      setMessage(`Counted ${stockNumber} in batch ${batchNumber} successfully.`);
      createBeep();
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleReset = async () => {
    try {
      setIsResetting(true);
      setError("");
      setMessage("Resetting counts...");

      const response = await resetInventory();
      const refreshedInventory = response?.inventory || (await fetchInventory()) || [];

      setInventory(refreshedInventory);
      setLastScannedItem(null);
      setMessage(response?.message || "Scanned quantities reset successfully");
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsResetting(false);
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setError("");
      setMessage("Preparing Excel export...");

      const blob = await downloadExport();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "cycle-count-inventory.xlsx";
      link.click();

      window.URL.revokeObjectURL(url);
      setMessage("Exported updated inventory to Excel.");
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleRemoveOne = async (item) => {
    try {
      setAdjustingItemId(item.id);
      setError("");
      setMessage("");

      const response = await adjustScannedQuantity(item.id, -1);
      syncScannedItem(response.item);

      setLastScannedItem((currentItem) =>
        currentItem?.id === response.item.id ? response.item : currentItem
      );
      setMessage(`Removed 1 scanned unit from ${item.stockNumber} in ${item.batchNumber}.`);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setAdjustingItemId(null);
    }
  };

  const deferredSearchTerm = useDeferredValue(searchTerm);
  const normalizedSearch = deferredSearchTerm.trim().toLowerCase();
  const filteredInventory = useMemo(
    () =>
      inventory.filter((item) => {
        const matchesSearch =
          !normalizedSearch ||
          item.stockNumber.toLowerCase().includes(normalizedSearch) ||
          item.batchNumber.toLowerCase().includes(normalizedSearch);

        const matchesVariance =
          varianceFilter === "all" ||
          (varianceFilter === "matched" && item.variance === 0) ||
          (varianceFilter === "variance" && item.variance !== 0);

        return matchesSearch && matchesVariance;
      }),
    [inventory, normalizedSearch, varianceFilter]
  );

  const handleNavigate = (page) => {
    setActivePage(page);

    if (window.innerWidth <= 980) {
      setIsSidebarOpen(false);
    }
  };

  const renderProfileMenu = () => (
    <div
      className={`profile-menu-shell ${isProfileMenuOpen ? "profile-menu-open" : ""}`}
      ref={profileMenuRef}
    >
      <button
        type="button"
        className="profile-trigger-button"
        onClick={() => setIsProfileMenuOpen((current) => !current)}
        aria-label="Open profile menu"
        aria-expanded={isProfileMenuOpen}
      >
        <span className="profile-trigger-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="profile-trigger-svg">
            <path
              d="M12 12.2a4.1 4.1 0 1 0-4.1-4.1 4.1 4.1 0 0 0 4.1 4.1Zm0 2.05c-3.62 0-6.55 1.82-6.55 4.07v.63a.8.8 0 0 0 .8.8h11.5a.8.8 0 0 0 .8-.8v-.63c0-2.25-2.93-4.07-6.55-4.07Z"
              fill="currentColor"
            />
          </svg>
        </span>
        <span className="profile-trigger-copy">
          <strong>{currentUser.fullName}</strong>
          <small>Profile & Settings</small>
        </span>
        <span className="profile-trigger-caret" aria-hidden="true">
          ▼
        </span>
      </button>

      <div className="profile-dropdown">
        <button
          type="button"
          className="profile-dropdown-item"
          onClick={() => {
            setActivePage("profile");
            setIsProfileMenuOpen(false);
          }}
        >
          View Profile
        </button>
        <button
          type="button"
          className="profile-dropdown-item profile-dropdown-danger"
          onClick={onLogout}
        >
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <main className="dashboard-shell">
      <div className="app-layout">
        {isSidebarOpen ? (
          <button
            type="button"
            className="sidebar-overlay"
            aria-label="Close sidebar"
            onClick={() => setIsSidebarOpen(false)}
          />
        ) : null}

        <aside className={`sidebar ${isSidebarOpen ? "sidebar-open" : ""}`}>
          <button
            type="button"
            className="sidebar-close-button"
            aria-label="Close sidebar"
            onClick={() => setIsSidebarOpen(false)}
          >
            x
          </button>

          <div className="sidebar-brand">
            <span className="eyebrow sidebar-eyebrow">Warehouse Operations</span>
            <h2>Cycle Count</h2>
            <p>Navigate the scanner workflow from one place.</p>
          </div>

          <nav className="sidebar-nav" aria-label="Dashboard sections">
            <button
              type="button"
              className={`sidebar-link ${activePage === "dashboard" ? "sidebar-link-active" : ""}`}
              onClick={() => handleNavigate("dashboard")}
            >
              <span className="sidebar-link-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="sidebar-icon-svg">
                  <path
                    d="M4 5.5a1.5 1.5 0 0 1 1.5-1.5h5A1.5 1.5 0 0 1 12 5.5v5a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 4 10.5Zm8 0A1.5 1.5 0 0 1 13.5 4h5A1.5 1.5 0 0 1 20 5.5v2A1.5 1.5 0 0 1 18.5 9h-5A1.5 1.5 0 0 1 12 7.5Zm0 8A1.5 1.5 0 0 1 13.5 12h5a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5h-5a1.5 1.5 0 0 1-1.5-1.5Zm-8 1A2.5 2.5 0 0 1 6.5 12h3A2.5 2.5 0 0 1 12 14.5v3A2.5 2.5 0 0 1 9.5 20h-3A2.5 2.5 0 0 1 4 17.5Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <span>Dashboard</span>
            </button>
            <button
              type="button"
              className={`sidebar-link ${activePage === "inventory" ? "sidebar-link-active" : ""}`}
              onClick={() => handleNavigate("inventory")}
            >
              <span className="sidebar-link-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="sidebar-icon-svg">
                  <path
                    d="M5 4.5A1.5 1.5 0 0 1 6.5 3h11A1.5 1.5 0 0 1 19 4.5v15a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5Zm2 2v2h10v-2Zm0 4v2h10v-2Zm0 4v2h6v-2Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <span>Inventory Table</span>
            </button>
            <button
              type="button"
              className={`sidebar-link ${activePage === "scanner" ? "sidebar-link-active" : ""}`}
              onClick={() => handleNavigate("scanner")}
            >
              <span className="sidebar-link-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="sidebar-icon-svg">
                  <path
                    d="M7 4a3 3 0 0 0-3 3v1h2V7a1 1 0 0 1 1-1h2V4Zm8 0v2h2a1 1 0 0 1 1 1v1h2V7a3 3 0 0 0-3-3Zm3 12v1a1 1 0 0 1-1 1h-2v2h2a3 3 0 0 0 3-3v-1ZM9 18H7a1 1 0 0 1-1-1v-1H4v1a3 3 0 0 0 3 3h2Zm-1-7h8v2H8Zm1 4h6v2H9Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <span>Scanner Input</span>
            </button>
            <button
              type="button"
              className={`sidebar-link ${activePage === "camera" ? "sidebar-link-active" : ""}`}
              onClick={() => handleNavigate("camera")}
            >
              <span className="sidebar-link-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="sidebar-icon-svg">
                  <path
                    d="M9.1 5.5 10.2 4h3.6l1.1 1.5H17A2.5 2.5 0 0 1 19.5 8v8A2.5 2.5 0 0 1 17 18.5H7A2.5 2.5 0 0 1 4.5 16V8A2.5 2.5 0 0 1 7 5.5Zm2.9 2a4.25 4.25 0 1 0 4.25 4.25A4.25 4.25 0 0 0 12 7.5Zm0 2a2.25 2.25 0 1 1-2.25 2.25A2.25 2.25 0 0 1 12 9.5Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <span>Camera Scan</span>
            </button>
          </nav>

          <div className="sidebar-actions">
            <button
              type="button"
              onClick={() => setIsResetConfirmOpen(true)}
              disabled={isResetting}
            >
              {isResetting ? "Resetting..." : "Reset Counts"}
            </button>
            <button
              type="button"
              className="secondary-button sidebar-secondary"
              onClick={() => setIsExportConfirmOpen(true)}
              disabled={isExporting}
            >
              {isExporting ? "Exporting..." : "Export Excel"}
            </button>
          </div>

          <div className="sidebar-note">
            <span className="detail-label">Quick Note</span>
            <p>Upload the Excel sheet first, then count by Batch Number and Stock Number.</p>
          </div>
        </aside>

        <div className="main-content">
          {isResetConfirmOpen ? (
            <div className="profile-modal-backdrop">
              <div className="panel profile-confirm-modal" role="dialog" aria-modal="true">
                <h3>Reset Count</h3>
                <p>Are you sure you want to reset the count?</p>
                <div className="profile-confirm-actions">
                  <button
                    type="button"
                    className="danger-button"
                    onClick={async () => {
                      setIsResetConfirmOpen(false);
                      await handleReset();
                    }}
                    disabled={isResetting}
                  >
                    {isResetting ? "Resetting..." : "OK"}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setIsResetConfirmOpen(false)}
                    disabled={isResetting}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {isExportConfirmOpen ? (
            <div className="profile-modal-backdrop">
              <div className="panel profile-confirm-modal" role="dialog" aria-modal="true">
                <h3>Export Excel</h3>
                <p>Are you sure you want to export the Excel file?</p>
                <div className="profile-confirm-actions">
                  <button
                    type="button"
                    className="danger-button"
                    onClick={async () => {
                      setIsExportConfirmOpen(false);
                      await handleExport();
                    }}
                    disabled={isExporting}
                  >
                    {isExporting ? "Exporting..." : "OK"}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setIsExportConfirmOpen(false)}
                    disabled={isExporting}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {message || error ? (
            <div className="alert-toast-stack">
              {message ? (
                <div className="status-banner success-banner alert-toast">
                  <span>{message}</span>
                  <button
                    type="button"
                    className="banner-close-button"
                    onClick={() => setMessage("")}
                    aria-label="Close success message"
                  >
                    x
                  </button>
                </div>
              ) : null}
              {error ? (
                <div className="status-banner error-banner alert-toast">
                  <span>{error}</span>
                  <button
                    type="button"
                    className="banner-close-button"
                    onClick={() => setError("")}
                    aria-label="Close error message"
                  >
                    x
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="page-utility">
            <button
              type="button"
              className="sidebar-toggle-button"
              aria-label="Open sidebar"
              onClick={() => setIsSidebarOpen(true)}
            >
              <span />
              <span />
              <span />
            </button>
            {renderProfileMenu()}
          </div>

          {activePage === "dashboard" ? (
            <>
              <section className="hero" id="overview">
                <div className="hero-copy">
                  <span className="eyebrow">Warehouse Dashboard</span>
                  <h1>Cycle Count Scanner Web Application</h1>
                  <p>
                    Upload inventory, scan from a hardware scanner or camera, and watch
                    count variance update live across the floor.
                  </p>
                </div>
              </section>

              <SummaryCards inventory={inventory} />

              <section className="content-grid">
                <div className="left-column">
                  <div id="upload">
                    <FileUpload onUpload={handleUpload} isLoading={isUploading} />
                  </div>
                </div>

                <div className="right-column">
                  <div id="last-scan">
                    <LastScannedCard item={lastScannedItem} />
                  </div>
                </div>
              </section>
            </>
          ) : (
            <Suspense fallback={<div className="panel"><p className="muted-text">Loading...</p></div>}>
              {activePage === "inventory" ? (
                <InventoryPage
                  inventory={filteredInventory}
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  varianceFilter={varianceFilter}
                  onVarianceFilterChange={setVarianceFilter}
                  onRemoveOne={handleRemoveOne}
                  adjustingItemId={adjustingItemId}
                />
              ) : activePage === "scanner" ? (
                <ScannerPage inventory={inventory} onScan={handleScan} isLoading={isScanning} />
              ) : activePage === "camera" ? (
                <CameraPage inventory={inventory} onDetected={handleScan} isLoading={isScanning} />
              ) : (
                <ProfilePage
                  currentUser={currentUser}
                  onDeleteProfile={onDeleteProfile}
                  onLogout={onLogout}
                  onProfileUpdate={onProfileUpdate}
                />
              )}
            </Suspense>
          )}
        </div>
      </div>
    </main>
  );
}
