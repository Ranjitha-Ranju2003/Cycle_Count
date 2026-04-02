import { useState } from "react";

export default function FileUpload({ onUpload, isLoading }) {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedFile) {
      return;
    }

    await onUpload(selectedFile);
    setSelectedFile(null);
    event.target.reset();
  };

  return (
    <div className="panel upload-panel">
      <div className="panel-header upload-panel-header">
        <div>
          <h2>Excel Upload</h2>
          <p>Import the warehouse count sheet before scanning items.</p>
        </div>
      </div>

      <form className="upload-form upload-form-card" onSubmit={handleSubmit}>
        <input
          id="excel-file-input"
          className="upload-hidden-input"
          type="file"
          accept=".xlsx"
          onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
        />

        <div className="upload-dropzone">
          <div className="upload-folder-icon" aria-hidden="true">
            <svg viewBox="0 0 64 64" className="upload-folder-svg">
              <path
                d="M10 18.5A4.5 4.5 0 0 1 14.5 14H28l5 6h16.5A4.5 4.5 0 0 1 54 24.5v4.2L46.8 48A4 4 0 0 1 43 50.5H14A4 4 0 0 1 10 46.4Z"
                fill="#4c5cff"
              />
              <path
                d="M15.5 24h38.2a2.3 2.3 0 0 1 2.2 3L49 48.8a3 3 0 0 1-2.8 2.2H13.5a2.5 2.5 0 0 1-2.4-3.2l6.2-21.4A3.2 3.2 0 0 1 20.4 24Z"
                fill="#3f4be0"
              />
              <path d="M32 31h14" stroke="#27339b" strokeWidth="3.8" strokeLinecap="round" />
              <path d="M30 39h14" stroke="#27339b" strokeWidth="3.8" strokeLinecap="round" />
            </svg>
          </div>

          <p className="upload-dropzone-copy">
            Click the button below to upload your Excel inventory file.
          </p>

          <div className="upload-divider" aria-hidden="true">
            <span />
            <strong>OR</strong>
            <span />
          </div>

          <label htmlFor="excel-file-input" className="upload-choose-button">
            Choose File
          </label>

          <p className="upload-selected-file">
            {selectedFile ? selectedFile.name : "No file selected yet"}
          </p>

          <button type="submit" className="upload-submit-button" disabled={!selectedFile || isLoading}>
            {isLoading ? "Uploading..." : "Upload Excel"}
          </button>
        </div>
      </form>
    </div>
  );
}
