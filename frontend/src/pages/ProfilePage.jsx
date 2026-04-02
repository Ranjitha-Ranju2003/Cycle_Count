import { useEffect, useMemo, useState } from "react";

const createFormState = (user) => ({
  fullName: user.fullName || "",
  company: user.company || "",
  email: user.email || "",
});

export default function ProfilePage({
  currentUser,
  onLogout,
  onProfileUpdate,
  onDeleteProfile,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [formState, setFormState] = useState(() => createFormState(currentUser));

  useEffect(() => {
    setFormState(createFormState(currentUser));
  }, [currentUser]);

  const initials = useMemo(
    () =>
      currentUser.fullName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join(""),
    [currentUser.fullName]
  );

  const updateField = (field, value) => {
    setFormState((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!formState.fullName.trim() || !formState.company.trim() || !formState.email.trim()) {
      setError("Full name, company, and email are required.");
      return;
    }

    try {
      setIsSaving(true);
      await onProfileUpdate({
        fullName: formState.fullName,
        company: formState.company,
        email: formState.email,
      });
      setIsEditing(false);
      setMessage("Profile updated successfully.");
    } catch (profileError) {
      setError(profileError.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormState(createFormState(currentUser));
    setIsEditing(false);
    setError("");
    setMessage("");
  };

  const handleDeleteConfirm = async () => {
    try {
      setIsDeleting(true);
      await onDeleteProfile();
    } catch (deleteError) {
      setError(deleteError.message);
      setIsDeleting(false);
    }
  };

  return (
    <>
      <section className="profile-hero profile-hero-surface">
        <div className="profile-hero-layout">
          <div className="profile-hero-main">
            <div className="profile-avatar-shell">
              <div className="profile-avatar profile-avatar-large">{initials || "U"}</div>
              <button
                type="button"
                className="profile-avatar-edit-button"
                onClick={() => {
                  setIsEditing(true);
                  setError("");
                  setMessage("");
                }}
                aria-label="Edit profile"
                title="Edit profile"
              >
                <svg viewBox="0 0 24 24" className="profile-avatar-edit-icon" aria-hidden="true">
                  <path
                    d="m15.2 5.3 3.5 3.5-9.6 9.6-4 0.5 0.5-4Zm2.2-2.2a1.9 1.9 0 0 1 2.7 0l0.8 0.8a1.9 1.9 0 0 1 0 2.7l-1 1-3.5-3.5Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </div>
            <div className="profile-hero-copy">
              <span className="eyebrow profile-eyebrow">Account Overview</span>
              <h1>{currentUser.fullName}</h1>
              <p>{currentUser.company}</p>
              <span className="profile-email">{currentUser.email}</span>
            </div>
          </div>

          <div className="profile-hero-side">
            <div className="profile-hero-meta">
              <div className="profile-meta-pill">
                <span className="detail-label">Access Level</span>
                <strong>Warehouse Operator</strong>
              </div>
              <div className="profile-meta-pill">
                <span className="detail-label">Session</span>
                <strong>Active on this device</strong>
              </div>
            </div>

            <div className="profile-hero-actions">
              <button type="button" className="profile-logout-button" onClick={onLogout}>
                Logout
              </button>
              <button
                type="button"
                className="danger-button profile-delete-button"
                onClick={() => setIsDeleteConfirmOpen(true)}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Profile"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {message ? (
        <div className="status-banner success-banner profile-status-banner">
          <span>{message}</span>
          <button
            type="button"
            className="banner-close-button"
            onClick={() => setMessage("")}
            aria-label="Close profile success message"
          >
            x
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="status-banner error-banner profile-status-banner">
          <span>{error}</span>
          <button
            type="button"
            className="banner-close-button"
            onClick={() => setError("")}
            aria-label="Close profile error message"
          >
            x
          </button>
        </div>
      ) : null}

      {isDeleteConfirmOpen ? (
        <div className="profile-modal-backdrop">
          <div className="panel profile-confirm-modal" role="dialog" aria-modal="true">
            <h3>Delete Profile</h3>
            <p>Are you sure you want to delete the profile?</p>
            <div className="profile-confirm-actions">
              <button
                type="button"
                className="danger-button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "OK"}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="profile-layout">
        <div className="profile-primary">
          <article className="panel profile-information-card">
            <div className="panel-header">
              <div>
                <h2>{isEditing ? "Edit Profile" : "Profile Details"}</h2>
                <p>
                  {isEditing
                    ? "Update your account information and save it to the database."
                    : "Account information used for this warehouse workspace."}
                </p>
              </div>
            </div>

            {isEditing ? (
              <form className="profile-edit-form" onSubmit={handleSubmit}>
                <label className="auth-field">
                  <span>Full Name</span>
                  <input
                    type="text"
                    value={formState.fullName}
                    onChange={(event) => updateField("fullName", event.target.value)}
                  />
                </label>
                <label className="auth-field">
                  <span>Company / Site</span>
                  <input
                    type="text"
                    value={formState.company}
                    onChange={(event) => updateField("company", event.target.value)}
                  />
                </label>
                <label className="auth-field profile-form-wide">
                  <span>Email Address</span>
                  <input
                    type="email"
                    value={formState.email}
                    onChange={(event) => updateField("email", event.target.value)}
                  />
                </label>

                <div className="profile-form-actions">
                  <button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleCancel}
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="profile-info-grid">
                <div className="profile-info-tile">
                  <span className="detail-label">Full Name</span>
                  <strong>{currentUser.fullName}</strong>
                </div>
                <div className="profile-info-tile">
                  <span className="detail-label">Company / Site</span>
                  <strong>{currentUser.company}</strong>
                </div>
                <div className="profile-info-tile">
                  <span className="detail-label">Email Address</span>
                  <strong>{currentUser.email}</strong>
                </div>
                <div className="profile-info-tile">
                  <span className="detail-label">Account Access</span>
                  <strong>Database-backed session</strong>
                </div>
              </div>
            )}
          </article>
        </div>

        <aside className="profile-secondary">
          <article className="panel profile-status-card">
            <span className="eyebrow profile-status-badge">Workspace Status</span>
            <h3>Ready For Cycle Counting</h3>
            <p>
              Your account is configured for inventory uploads, scanner input, and
              camera-based counting from this dashboard.
            </p>

            <div className="profile-status-list">
              <div className="profile-status-item">
                <span className="profile-status-dot" />
                <strong>Scanner workflows enabled</strong>
              </div>
              <div className="profile-status-item">
                <span className="profile-status-dot" />
                <strong>Session currently active</strong>
              </div>
              <div className="profile-status-item">
                <span className="profile-status-dot" />
                <strong>Profile syncs to PostgreSQL</strong>
              </div>
            </div>
          </article>
        </aside>
      </section>
    </>
  );
}
