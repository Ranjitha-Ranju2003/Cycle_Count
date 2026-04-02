import { useEffect, useMemo, useRef, useState } from "react";

const DETECTION_COOLDOWN_MS = 800;
const DETECTION_INTERVAL_MS = 75;
const DETECTION_FORMATS = [
  "code_128",
  "code_39",
  "code_93",
  "codabar",
  "ean_13",
  "ean_8",
  "itf",
  "upc_a",
  "upc_e",
  "qr_code",
];

const CAMERA_CONSTRAINTS = [
  {
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      aspectRatio: { ideal: 1.7777777778 },
      advanced: [
        {
          exposureMode: "continuous",
          whiteBalanceMode: "continuous",
          exposureCompensation: 1,
          brightness: 1.5,
        },
      ],
    },
    audio: false,
  },
  {
    video: {
      facingMode: "environment",
    },
    audio: false,
  },
  {
    video: true,
    audio: false,
  },
];

const normalizeValue = (value) =>
  String(value ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/[\n\r\t]/g, "")
    .replace(/\s+/g, "")
    .toUpperCase();
const getUniqueSuggestions = (values) => [...new Set(values.filter(Boolean))].sort();
const normalizeDetectedValue = (value) => normalizeValue(value);
const SCAN_STEP = {
  BATCH: "BATCH",
  STOCK: "STOCK",
};

export default function CameraScanner({ inventory, onDetected, isLoading }) {
  const videoRef = useRef(null);
  const batchInputRef = useRef(null);
  const stockInputRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const fallbackScannerRef = useRef(null);
  const fallbackReaderIdRef = useRef(`reader-${Math.random().toString(36).slice(2)}`);
  const animationFrameRef = useRef(null);
  const detectTimeoutRef = useRef(null);
  const scanPauseTimeoutRef = useRef(null);
  const isProcessingRef = useRef(false);
  const lastDetectedRef = useRef({ value: "", step: "", timestamp: 0 });
  const lastSuccessfulStockBeepRef = useRef({ value: "", timestamp: 0 });
  const lastSuccessfulStockScanRef = useRef({ batch: "", stock: "", timestamp: 0 });
  const lastInvalidFeedbackRef = useRef({ value: "", step: "", timestamp: 0 });
  const currentScanStepRef = useRef(SCAN_STEP.BATCH);
  const activeBatchRef = useRef(null);
  const batchNumberRef = useRef("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraMode, setCameraMode] = useState("");
  const [lastDetectedCode, setLastDetectedCode] = useState("");
  const [cameraStatus, setCameraStatus] = useState("Ready to capture a batch number");
  const [activeBatch, setActiveBatch] = useState(null);
  const [batchNumber, setBatchNumber] = useState("");
  const [stockNumber, setStockNumber] = useState("");
  const [currentScanStep, setCurrentScanStep] = useState(SCAN_STEP.BATCH);
  const [isScanLinePaused, setIsScanLinePaused] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVariant, setToastVariant] = useState("success");

  const normalizedBatch = normalizeValue(activeBatch || batchNumber);
  const normalizedStock = normalizeValue(stockNumber);
  const normalizedInventory = useMemo(
    () =>
      inventory.map((item) => ({
        ...item,
        normalizedBatchNumber: normalizeValue(item.batchNumber),
        normalizedStockNumber: normalizeValue(item.stockNumber),
      })),
    [inventory]
  );
  const batchSuggestions = useMemo(
    () => getUniqueSuggestions(inventory.map((item) => item.batchNumber)),
    [inventory]
  );
  const selectedBatchInventory = useMemo(
    () =>
      normalizedInventory.filter(
        (item) => item.normalizedBatchNumber === normalizedBatch
      ),
    [normalizedInventory, normalizedBatch]
  );
  const stockSuggestions = useMemo(
    () => getUniqueSuggestions(selectedBatchInventory.map((item) => item.stockNumber)),
    [selectedBatchInventory]
  );

  useEffect(() => {
    currentScanStepRef.current = currentScanStep;
  }, [currentScanStep]);

  useEffect(() => {
    activeBatchRef.current = activeBatch;
  }, [activeBatch]);

  useEffect(() => {
    batchNumberRef.current = batchNumber;
  }, [batchNumber]);

  const focusStockInput = () => {
    stockInputRef.current?.focus();
    stockInputRef.current?.select();
  };

  const focusBatchInput = () => {
    batchInputRef.current?.focus();
    batchInputRef.current?.select();
  };

  const playSuccessBeep = () => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.type = "sine";
    oscillator.frequency.value = 960;
    gainNode.gain.value = 0.05;
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.09);
  };

  const playStockSuccessBeepOnce = (stockValue) => {
    const now = Date.now();
    const normalizedStockValue = normalizeValue(stockValue);
    const sameRecentStock =
      lastSuccessfulStockBeepRef.current.value === normalizedStockValue &&
      now - lastSuccessfulStockBeepRef.current.timestamp < 1500;

    if (sameRecentStock) {
      return;
    }

    lastSuccessfulStockBeepRef.current = {
      value: normalizedStockValue,
      timestamp: now,
    };
    playSuccessBeep();
  };

  const showInvalidScanFeedback = (message, scannedValue = "") => {
    const now = Date.now();
    const normalizedScannedValue = normalizeValue(scannedValue);
    const currentStep = currentScanStepRef.current;
    const sameRecentInvalidFeedback =
      lastInvalidFeedbackRef.current.value === normalizedScannedValue &&
      lastInvalidFeedbackRef.current.step === currentStep &&
      now - lastInvalidFeedbackRef.current.timestamp < 1200;

    if (!sameRecentInvalidFeedback) {
      lastInvalidFeedbackRef.current = {
        value: normalizedScannedValue,
        step: currentStep,
        timestamp: now,
      };
      playSuccessBeep();
    }

    setToastVariant("error");
    setToastMessage(message);
  };

  const pauseScanLine = (durationMs = 650) => {
    setIsScanLinePaused(true);

    if (scanPauseTimeoutRef.current) {
      clearTimeout(scanPauseTimeoutRef.current);
    }

    scanPauseTimeoutRef.current = window.setTimeout(() => {
      setIsScanLinePaused(false);
      scanPauseTimeoutRef.current = null;
    }, durationMs);
  };

  const batchExists = (value) =>
    normalizedInventory.some((item) => item.normalizedBatchNumber === normalizeValue(value));

  const stockExistsInBatch = (batchValue, stockValue) =>
    normalizedInventory.some(
      (item) =>
        item.normalizedBatchNumber === normalizeValue(batchValue) &&
        item.normalizedStockNumber === normalizeValue(stockValue)
    );

  const submitScan = async (overrideBatch = batchNumber, overrideStock = stockNumber) => {
    const nextBatchNumber = normalizeValue(activeBatch || overrideBatch);
    const nextStockNumber = normalizeValue(overrideStock);
    const batchData = normalizedInventory.filter(
      (item) => item.normalizedBatchNumber === nextBatchNumber
    );

    console.log("RAW Scanned Stock:", overrideStock);
    console.log("NORMALIZED Scanned Stock:", nextStockNumber);
    console.log("Excel Stocks:", batchData.map((item) => item.stockNumber));
    console.log(
      "Normalized Excel Stocks:",
      batchData.map((item) => item.normalizedStockNumber)
    );

    if (!nextBatchNumber) {
      setCameraStatus("Scan or enter the Batch Number first.");
      focusBatchInput();
      return;
    }

    if (batchData.length === 0) {
      setCameraStatus("Batch not found in Excel");
      showInvalidScanFeedback("Data not present", nextBatchNumber);
      focusBatchInput();
      return;
    }

    if (!nextStockNumber) {
      setCameraStatus("Scan or enter the Stock Number for the selected batch.");
      focusStockInput();
      return;
    }

    if (!stockExistsInBatch(nextBatchNumber, nextStockNumber)) {
      setCameraStatus("Stock does not belong to selected batch");
      showInvalidScanFeedback("Data not present", nextStockNumber);
      focusStockInput();
      return;
    }

    try {
      setCameraStatus("Counting selected stock item...");
      await onDetected({
        batchNumber: nextBatchNumber,
        stockNumber: nextStockNumber,
      });
      lastSuccessfulStockScanRef.current = {
        batch: nextBatchNumber,
        stock: nextStockNumber,
        timestamp: Date.now(),
      };
      playStockSuccessBeepOnce(nextStockNumber);
      setToastVariant("success");
      setToastMessage("Barcode Scanned Successfully");
      setStockNumber("");
      setCameraStatus(`Counted ${nextStockNumber} inside ${nextBatchNumber}. Ready for next stock.`);
      focusStockInput();
    } catch (error) {
      setCameraStatus(error.message || "Unable to record the count.");
      throw error;
    }
  };

  const processDetectedValue = async (decodedText) => {
    const normalizedText = normalizeDetectedValue(decodedText);
    const currentStep = currentScanStepRef.current;
    const currentActiveBatch = activeBatchRef.current;
    const effectiveBatch = currentActiveBatch || batchNumberRef.current;

    if (!normalizedText) {
      return;
    }

    const now = Date.now();
    const sameAsLastScan =
      lastDetectedRef.current.value === normalizedText &&
      lastDetectedRef.current.step === currentStep &&
      now - lastDetectedRef.current.timestamp < DETECTION_COOLDOWN_MS;

    if (isProcessingRef.current || sameAsLastScan) {
      return;
    }

    const recentSuccessfulStockMatch =
      currentStep === SCAN_STEP.STOCK &&
      currentActiveBatch &&
      lastSuccessfulStockScanRef.current.batch === normalizeValue(currentActiveBatch) &&
      lastSuccessfulStockScanRef.current.stock === normalizedText &&
      now - lastSuccessfulStockScanRef.current.timestamp < 1800;

    if (recentSuccessfulStockMatch) {
      return;
    }

    isProcessingRef.current = true;
    pauseScanLine();
    lastDetectedRef.current = { value: normalizedText, step: currentStep, timestamp: now };
    setLastDetectedCode(normalizedText);
    console.log("Step:", currentStep);
    console.log("Scanned:", normalizedText);
    console.log("Active Batch:", currentActiveBatch);
    console.log("Processed Scan:", normalizedText);

    try {
      if (currentStep === SCAN_STEP.BATCH && !currentActiveBatch) {
        console.log("RAW Scanned Batch:", decodedText);
        console.log("NORMALIZED Scanned Batch:", normalizedText);
        console.log("Excel Batches:", normalizedInventory.map((item) => item.batchNumber));
        console.log(
          "Normalized Excel Batches:",
          normalizedInventory.map((item) => item.normalizedBatchNumber)
        );

        if (!batchExists(normalizedText)) {
          setCameraStatus("Batch not found in Excel");
          showInvalidScanFeedback("Data not present", normalizedText);
          focusBatchInput();
          return;
        }

        activeBatchRef.current = normalizedText;
        batchNumberRef.current = normalizedText;
        currentScanStepRef.current = SCAN_STEP.STOCK;
        playSuccessBeep();
        setActiveBatch(normalizedText);
        setBatchNumber(normalizedText);
        setStockNumber("");
        setCurrentScanStep(SCAN_STEP.STOCK);
        setToastVariant("success");
        setToastMessage("Batch scanned. Now scan stock items");
        setCameraStatus(`Batch ${normalizedText} captured. Now scan stock items.`);
        window.requestAnimationFrame(focusStockInput);
        return;
      }

      if (currentStep === SCAN_STEP.STOCK && currentActiveBatch) {
        if (
          batchExists(normalizedText) &&
          normalizedText !== normalizeValue(currentActiveBatch)
        ) {
          setToastMessage("Complete current batch before scanning a new one");
          setCameraStatus("Complete current batch before scanning a new one.");
          focusStockInput();
          return;
        }

        if (normalizedText === normalizeValue(currentActiveBatch)) {
          setToastMessage("Same batch scanned again. Please scan stock.");
          setCameraStatus("Same batch scanned again. Please scan stock.");
          focusStockInput();
          return;
        }
      }

      setStockNumber(normalizedText);
      await submitScan(effectiveBatch, normalizedText);
    } finally {
      isProcessingRef.current = false;
    }
  };

  const completeBatch = () => {
    activeBatchRef.current = null;
    batchNumberRef.current = "";
    currentScanStepRef.current = SCAN_STEP.BATCH;
    setActiveBatch(null);
    setBatchNumber("");
    setStockNumber("");
    setCurrentScanStep(SCAN_STEP.BATCH);
    setCameraStatus("Batch completed. Scan next batch");
    setToastMessage("Batch completed. Scan next batch");
    window.requestAnimationFrame(focusBatchInput);
  };

  const stopHtml5QrcodeFallback = async () => {
    if (fallbackScannerRef.current) {
      const scanner = fallbackScannerRef.current;
      fallbackScannerRef.current = null;

      try {
        if (typeof scanner.stop === "function") {
          await Promise.resolve(scanner.stop());
        }
      } catch (_error) {
        // html5-qrcode can throw when shutdown happens during a partial start.
      }

      try {
        if (typeof scanner.clear === "function") {
          await Promise.resolve(scanner.clear());
        }
      } catch (_error) {
        // Clearing after a partial start should not block the rest of cleanup.
      }
    }
  };

  const stopNativeScanner = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (detectTimeoutRef.current) {
      clearTimeout(detectTimeoutRef.current);
      detectTimeoutRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    detectorRef.current = null;
    setIsCameraReady(false);
  };

  const applyTrackEnhancements = async (stream) => {
    const [track] = stream.getVideoTracks();

    if (track?.getSettings) {
      console.log("Camera track settings:", track.getSettings());
    }

    if (!track?.getCapabilities || !track.applyConstraints) {
      return;
    }

    try {
      const capabilities = track.getCapabilities();
      const advanced = [];

      if (capabilities.focusMode?.includes("continuous")) {
        advanced.push({ focusMode: "continuous" });
      }

      if (typeof capabilities.zoom?.max === "number" && capabilities.zoom.max >= 2) {
        advanced.push({ zoom: Math.min(2.2, capabilities.zoom.max) });
      }

      if (capabilities.exposureMode?.includes("continuous")) {
        advanced.push({ exposureMode: "continuous" });
      }

      if (capabilities.whiteBalanceMode?.includes("continuous")) {
        advanced.push({ whiteBalanceMode: "continuous" });
      }

      if (typeof capabilities.exposureCompensation?.max === "number") {
        const exposureValue = Math.min(
          capabilities.exposureCompensation.max,
          Math.max(0, capabilities.exposureCompensation.max * 0.35)
        );
        advanced.push({ exposureCompensation: exposureValue });
      }

      if (capabilities.torch) {
        advanced.push({ torch: true });
      }

      if (advanced.length) {
        await track.applyConstraints({ advanced });
      }
    } catch (_error) {
      // Support varies by browser/device; enhancement failures are non-fatal.
    }
  };

  useEffect(() => {
    return () => {
      stopNativeScanner();
      void stopHtml5QrcodeFallback();

      if (scanPauseTimeoutRef.current) {
        clearTimeout(scanPauseTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!toastMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage("");
    }, 2600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toastMessage]);

  const runDetectionLoop = () => {
    const scanFrame = async () => {
      const video = videoRef.current;
      const detector = detectorRef.current;

      if (!video || !detector || video.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      try {
        const detectedCodes = await detector.detect(video);

        if (detectedCodes.length) {
          const rawValue = detectedCodes[0].rawValue;

          if (rawValue) {
            await processDetectedValue(rawValue);
          }
        }
      } catch (error) {
        setCameraError(error.message || "Camera code detection failed");
      }

      detectTimeoutRef.current = setTimeout(() => {
        animationFrameRef.current = requestAnimationFrame(scanFrame);
      }, DETECTION_INTERVAL_MS);
    };

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  };

  const getCameraStream = async () => {
    let lastError = null;

    for (const constraints of CAMERA_CONSTRAINTS) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Unable to access camera stream");
  };

  const startNativeBarcodeDetector = async () => {
    if (!("BarcodeDetector" in window)) {
      return false;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("This browser does not support camera access");
    }

    const supportedFormats =
      typeof window.BarcodeDetector.getSupportedFormats === "function"
        ? await window.BarcodeDetector.getSupportedFormats()
        : DETECTION_FORMATS;

    const formats = DETECTION_FORMATS.filter((format) => supportedFormats.includes(format));
    const detector = new window.BarcodeDetector({
      formats: formats.length ? formats : undefined,
    });

    const stream = await getCameraStream();
    await applyTrackEnhancements(stream);

    streamRef.current = stream;
    detectorRef.current = detector;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }

    runDetectionLoop();
    setCameraMode("native");
    setIsCameraReady(true);
    setCameraStatus(
      currentScanStep === SCAN_STEP.BATCH
        ? "Camera active. Align the Batch Number inside the scan area."
        : "Camera active. Align the Stock Number inside the scan area."
    );

    return true;
  };

  const startHtml5QrcodeFallback = async () => {
    const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
    setCameraMode("fallback");

    await new Promise((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });

    const scanner = new Html5Qrcode(fallbackReaderIdRef.current);
    fallbackScannerRef.current = scanner;

    await scanner.start(
      { facingMode: "environment" },
      {
        fps: 20,
        disableFlip: false,
        aspectRatio: 1.7777777778,
        qrbox: (viewfinderWidth, viewfinderHeight) => ({
          width: Math.floor(viewfinderWidth * 0.7),
          height: Math.max(150, Math.floor(viewfinderHeight * 0.42)),
        }),
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      },
      async (decodedText, decodedResult) => {
        const detectedValue =
          decodedResult?.decodedText ||
          decodedResult?.codeResult?.code ||
          decodedText;

        await processDetectedValue(detectedValue);
      },
      () => null
    );

    setIsCameraReady(true);
    setCameraStatus(
      currentScanStep === SCAN_STEP.BATCH
        ? "Camera active. Align the Batch Number inside the scan area."
        : "Camera active. Align the Stock Number inside the scan area."
    );
  };

  const startCamera = async () => {
    let nativeError = null;
    let fallbackError = null;

    try {
      setCameraError("");
      setLastDetectedCode("");
      setIsCameraReady(false);
      setCameraStatus("Starting camera...");
      await stopHtml5QrcodeFallback();
      stopNativeScanner();

      try {
        const started = await startNativeBarcodeDetector();

        if (started) {
          setIsCameraActive(true);
          return;
        }
      } catch (error) {
        nativeError = error;
        stopNativeScanner();
      }

      try {
        await startHtml5QrcodeFallback();
        setIsCameraActive(true);
        return;
      } catch (error) {
        fallbackError = error;
        await stopHtml5QrcodeFallback();
      }

      try {
        await startHtml5QrcodeFallback();
        setIsCameraActive(true);
        return;
      } catch (error) {
        fallbackError = fallbackError || error;
      }
    } catch (error) {
      fallbackError = fallbackError || error;
    }

    stopNativeScanner();
    await stopHtml5QrcodeFallback();
    setCameraMode("");
    setIsCameraActive(false);
    setIsCameraReady(false);
    setCameraStatus("Camera unavailable");

    const finalError = fallbackError || nativeError;
    const secureContextHint = !window.isSecureContext
      ? " Open the app on localhost or HTTPS."
      : "";

    setCameraError(
      finalError?.message
        ? `${finalError.message}.${secureContextHint}`
        : `Unable to access the camera. Check browser permission and close other apps using the camera.${secureContextHint}`
    );
  };

  const stopCamera = async () => {
    try {
      stopNativeScanner();
      await stopHtml5QrcodeFallback();
      setCameraMode("");
      setIsCameraActive(false);
      setIsCameraReady(false);
      setCameraError("");
      setCameraStatus("Camera stopped");
    } catch (error) {
      setCameraError(error.message || "Unable to stop the camera");
    }
  };

  const currentStepLabel =
    currentScanStep === SCAN_STEP.BATCH ? "Batch Number" : "Stock Number";
  const showScanOverlay = Boolean(cameraMode);
  const showAnimatedScanLine = isCameraActive && isCameraReady && !isScanLinePaused;

  return (
    <div className="panel">
      {toastMessage ? (
        <div
          className={`camera-toast ${toastVariant === "error" ? "camera-toast-error" : ""}`}
          role="status"
          aria-live="polite"
        >
          {toastMessage}
        </div>
      ) : null}

      <div className="panel-header">
        <div>
          <h2>Camera Scan</h2>
          <p>Capture the batch number first and then capture the stock number in that batch.</p>
        </div>
      </div>

      <div className="camera-actions">
        {!isCameraActive ? (
          <button type="button" onClick={startCamera} disabled={isLoading}>
            Start Camera
          </button>
        ) : (
          <button type="button" className="secondary-button" onClick={stopCamera}>
            Stop Camera
          </button>
        )}
      </div>

      <div className="camera-workspace">
        <div className="camera-view-column">
          <div className="camera-summary-row">
            <div className="camera-summary-card">
              <span className="detail-label">Current Step</span>
              <p className="camera-data-value">{currentStepLabel}</p>
            </div>

            <div className="camera-summary-card">
              <span className="detail-label">Active Batch</span>
              <p className="camera-data-value">
                {activeBatch || "No active batch"}
              </p>
            </div>

            <div className="camera-summary-card">
              <span className="detail-label">Last Captured Code</span>
              <p className="camera-data-value">
                {lastDetectedCode || "No code detected yet"}
              </p>
            </div>
          </div>

          <div className="camera-preview-shell">
            {cameraMode === "native" ? (
              <div className={`camera-stage ${isCameraReady ? "camera-stage-active" : ""}`}>
                <video ref={videoRef} className="camera-video" muted playsInline />
              </div>
            ) : null}

            {cameraMode === "fallback" ? (
              <div
                id={fallbackReaderIdRef.current}
                className={`camera-reader ${isCameraReady ? "camera-reader-active" : ""}`}
              />
            ) : null}

            {!cameraMode ? <div className="camera-reader camera-placeholder" /> : null}

            {showScanOverlay ? (
              <div className="camera-overlay" aria-hidden="true">
                <span className="camera-corner camera-corner-top-left" />
                <span className="camera-corner camera-corner-top-right" />
                <span className="camera-corner camera-corner-bottom-left" />
                <span className="camera-corner camera-corner-bottom-right" />
                {showAnimatedScanLine ? <span className="camera-scan-line" /> : null}
              </div>
            ) : null}
          </div>

          <div className="camera-info-card camera-status-panel">
            <span className="detail-label">Live Status</span>
            <p className="camera-status">{cameraStatus}</p>
          </div>
        </div>

        <aside className="camera-info-column">
          <div className="camera-info-card">
            <span className="detail-label">Batch Number</span>
            <input
              ref={batchInputRef}
              list="camera-batch-number-suggestions"
              type="text"
              value={batchNumber}
              placeholder={
                activeBatch ? "Complete the current batch to unlock this field" : "Scan or enter batch number"
              }
              onChange={(event) => {
                if (activeBatch) {
                  return;
                }

                const nextBatchNumber = event.target.value;
                batchNumberRef.current = nextBatchNumber;
                setBatchNumber(nextBatchNumber);
                setStockNumber("");
                currentScanStepRef.current = SCAN_STEP.BATCH;
                setCurrentScanStep(SCAN_STEP.BATCH);

                if (batchExists(nextBatchNumber)) {
                  const normalizedBatchNumber = normalizeValue(nextBatchNumber);
                  activeBatchRef.current = normalizedBatchNumber;
                  currentScanStepRef.current = SCAN_STEP.STOCK;
                  setActiveBatch(normalizedBatchNumber);
                  setCurrentScanStep(SCAN_STEP.STOCK);
                  setCameraStatus(
                    `Batch ${normalizedBatchNumber} selected. Now capture the Stock Number.`
                  );
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();

                  if (normalizeValue(batchNumber) && !activeBatch) {
                    if (batchExists(batchNumber)) {
                      const normalizedBatchNumber = normalizeValue(batchNumber);
                      activeBatchRef.current = normalizedBatchNumber;
                      currentScanStepRef.current = SCAN_STEP.STOCK;
                      setActiveBatch(normalizedBatchNumber);
                      setCurrentScanStep(SCAN_STEP.STOCK);
                      setCameraStatus(
                        `Batch ${normalizedBatchNumber} selected. Now capture the Stock Number.`
                      );
                      focusStockInput();
                    } else {
                      setCameraStatus("Batch not found in Excel");
                      focusBatchInput();
                    }
                  }
                }
              }}
              disabled={isLoading || Boolean(activeBatch)}
            />
            <datalist id="camera-batch-number-suggestions">
              {batchSuggestions.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
          </div>

          <div className="camera-info-card">
            <span className="detail-label">Stock Number</span>
            <input
              ref={stockInputRef}
              list="camera-stock-number-suggestions"
              type="text"
              value={stockNumber}
              placeholder="Scan or enter stock number"
              onChange={(event) => {
                currentScanStepRef.current = SCAN_STEP.STOCK;
                setCurrentScanStep(SCAN_STEP.STOCK);
                setStockNumber(event.target.value);
              }}
              onKeyDown={async (event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  await submitScan();
                }
              }}
              disabled={isLoading || !normalizedBatch}
            />
            <datalist id="camera-stock-number-suggestions">
              {stockSuggestions.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
          </div>

          <div className="camera-actions camera-inline-actions">
            <button
              type="button"
              onClick={() => submitScan()}
              disabled={isLoading || !activeBatch || !normalizedStock}
            >
              {isLoading ? "Counting..." : "Count Item"}
            </button>
            <button
              type="button"
              onClick={completeBatch}
              disabled={isLoading || !activeBatch}
            >
              Complete Batch
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                activeBatchRef.current = null;
                batchNumberRef.current = "";
                currentScanStepRef.current = SCAN_STEP.BATCH;
                setActiveBatch(null);
                setBatchNumber("");
                setStockNumber("");
                setCurrentScanStep(SCAN_STEP.BATCH);
                setCameraStatus("Ready to capture a batch number");
                focusBatchInput();
              }}
              disabled={isLoading}
            >
              Clear
            </button>
          </div>

          <div className="camera-info-card">
            <span className="detail-label">Scanning Tips</span>
            <p className="muted-text">
              Hold the code steady, keep it inside the scan area, and capture the batch
              first before the stock number.
            </p>
          </div>

          {cameraError ? (
            <div className="camera-info-card camera-error-card">
              <span className="detail-label">Camera Error</span>
              <p className="error-text">{cameraError}</p>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
