import { useEffect, useState } from "react";

const initialLoginForm = {
  email: "",
  password: "",
};

const initialSignupForm = {
  fullName: "",
  company: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const initialForgotPasswordForm = {
  email: "",
  password: "",
  confirmPassword: "",
};

const getPasswordStrength = (password) => {
  const value = password.trim();

  if (!value) {
    return null;
  }

  let score = 0;

  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  if (score <= 2) {
    return {
      level: "weak",
      message: "Weak password. Use 8+ characters with upper/lowercase, a number, and a symbol.",
    };
  }

  if (score <= 4) {
    return {
      level: "medium",
      message: "Good password. Add a symbol or more length for stronger protection.",
    };
  }

  return {
    level: "strong",
    message: "Strong password.",
  };
};

export default function AuthPage({
  onLogin,
  onRequestSignupOtp,
  onVerifySignupOtp,
  onRequestForgotPasswordOtp,
  onVerifyForgotPasswordOtp,
}) {
  const [mode, setMode] = useState("login");
  const [loginForm, setLoginForm] = useState(initialLoginForm);
  const [signupForm, setSignupForm] = useState(initialSignupForm);
  const [forgotPasswordForm, setForgotPasswordForm] = useState(initialForgotPasswordForm);
  const [signupOtp, setSignupOtp] = useState("");
  const [forgotPasswordOtp, setForgotPasswordOtp] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState("");
  const [hasTriedForgotPasswordSubmit, setHasTriedForgotPasswordSubmit] = useState(false);
  const [isSignupOtpSent, setIsSignupOtpSent] = useState(false);
  const [isForgotPasswordOtpSent, setIsForgotPasswordOtpSent] = useState(false);
  const shouldShowForgotPasswordError =
    mode === "forgot" &&
    hasTriedForgotPasswordSubmit &&
    Boolean(forgotPasswordError.trim());

  useEffect(() => {
    setError("");
    setMessage("");
  }, [mode]);

  useEffect(() => {
    if (mode !== "forgot") {
      setForgotPasswordError("");
      setHasTriedForgotPasswordSubmit(false);
    }
  }, [mode]);

  const openForgotPasswordMode = () => {
    setError("");
    setMessage("");
    setForgotPasswordForm(initialForgotPasswordForm);
    setForgotPasswordOtp("");
    setForgotPasswordError("");
    setIsForgotPasswordOtpSent(false);
    setHasTriedForgotPasswordSubmit(false);
    setMode("forgot");
  };

  const updateLoginField = (field, value) => {
    setLoginForm((current) => ({ ...current, [field]: value }));
  };

  const updateSignupField = (field, value) => {
    setSignupForm((current) => ({ ...current, [field]: value }));
    setSignupOtp("");
    setIsSignupOtpSent(false);
  };

  const updateForgotPasswordField = (field, value) => {
    setForgotPasswordForm((current) => ({ ...current, [field]: value }));

    if (field === "email") {
      setForgotPasswordOtp("");
      setIsForgotPasswordOtpSent(false);
    }

    setForgotPasswordError("");
  };

  const signupPasswordStrength = getPasswordStrength(signupForm.password);
  const forgotPasswordStrength = getPasswordStrength(forgotPasswordForm.password);

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!loginForm.email.trim() || !loginForm.password.trim()) {
      setError("Enter both email and password to continue.");
      return;
    }

    try {
      setIsSubmitting(true);
      await onLogin(loginForm);
    } catch (authError) {
      setError(authError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignupSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (
      !signupForm.fullName.trim() ||
      !signupForm.company.trim() ||
      !signupForm.email.trim() ||
      !signupForm.password.trim()
    ) {
      setError("Fill in all signup fields to create your workspace access.");
      return;
    }

    if (signupForm.password.length < 6) {
      setError("Password should be at least 6 characters.");
      return;
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      setError("Password and confirm password must match.");
      return;
    }

    try {
      setIsSubmitting(true);

      if (!isSignupOtpSent) {
        const response = await onRequestSignupOtp(signupForm);
        setMessage(
          response?.otpPreview
            ? `${response.message} Demo OTP: ${response.otpPreview}`
            : response?.message || "OTP sent to your email."
        );
        setIsSignupOtpSent(true);
        return;
      }

      if (!signupOtp.trim()) {
        setError("Enter the OTP sent to your email to complete signup.");
        return;
      }

      await onVerifySignupOtp({
        email: signupForm.email,
        otp: signupOtp,
      });
    } catch (authError) {
      setError(authError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setForgotPasswordError("");
    setHasTriedForgotPasswordSubmit(true);

    try {
      setIsSubmitting(true);

      if (!forgotPasswordForm.email.trim()) {
        setForgotPasswordError("Enter your email to receive the OTP.");
        return;
      }

      if (!isForgotPasswordOtpSent) {
        const response = await onRequestForgotPasswordOtp({
          email: forgotPasswordForm.email,
        });
        setMessage(
          response?.otpPreview
            ? `${response.message} Demo OTP: ${response.otpPreview}`
            : response?.message || "OTP sent to your email."
        );
        setIsForgotPasswordOtpSent(true);
        return;
      }

      if (
        !forgotPasswordOtp.trim() ||
        !forgotPasswordForm.password.trim() ||
        !forgotPasswordForm.confirmPassword.trim()
      ) {
        setForgotPasswordError("Enter your email, OTP, new password, and confirm password.");
        return;
      }

      if (forgotPasswordForm.password.length < 6) {
        setForgotPasswordError("Password should be at least 6 characters.");
        return;
      }

      if (forgotPasswordForm.password !== forgotPasswordForm.confirmPassword) {
        setForgotPasswordError("Password and confirm password must match.");
        return;
      }

      const response = await onVerifyForgotPasswordOtp({
        email: forgotPasswordForm.email,
        otp: forgotPasswordOtp,
        password: forgotPasswordForm.password,
      });
      setMessage(response?.message || "Password updated successfully.");
      setForgotPasswordForm(initialForgotPasswordForm);
      setForgotPasswordOtp("");
      setIsForgotPasswordOtpSent(false);
      setMode("login");
    } catch (authError) {
      setError(authError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="auth-mobile-heading">
          <span className="eyebrow auth-eyebrow">Cycle Count Platform</span>
          <h1>Cycle Count Scanner Web Application</h1>
          <p>Login or create an account to access your warehouse dashboard.</p>
        </div>

        <div className="auth-panel-header">
          <h2>
            {mode === "login"
              ? "Welcome back"
              : mode === "forgot"
                ? "Reset your password"
                : "Create your account"}
          </h2>
          <p>
            {mode === "login"
              ? "Sign in to access the cycle count dashboard."
              : mode === "forgot"
                ? "Use this only if you do not remember your old password. We will verify your email OTP before letting you reset it."
                : "Verify your email with OTP before creating your workspace access."}
          </p>
        </div>

        <div className="auth-toggle">
          <button
            type="button"
            className={`auth-toggle-button ${mode === "login" ? "auth-toggle-active" : ""}`}
            onClick={() => {
              setError("");
              setMessage("");
              setHasTriedForgotPasswordSubmit(false);
              setSignupOtp("");
              setIsSignupOtpSent(false);
              setMode("login");
            }}
          >
            Login
          </button>
          <button
            type="button"
            className={`auth-toggle-button ${mode === "signup" ? "auth-toggle-active" : ""}`}
            onClick={() => {
              setError("");
              setMessage("");
              setHasTriedForgotPasswordSubmit(false);
              setSignupOtp("");
              setIsSignupOtpSent(false);
              setMode("signup");
            }}
          >
            Sign Up
          </button>
        </div>

        {message ? (
          <div className="status-banner success-banner">
            <span>{message}</span>
            <button
              type="button"
              className="banner-close-button"
              onClick={() => setMessage("")}
              aria-label="Close auth success"
            >
              x
            </button>
          </div>
        ) : null}

        {error ? (
          <div className="status-banner error-banner">
            <span>{error}</span>
            <button
              type="button"
              className="banner-close-button"
              onClick={() => setError("")}
              aria-label="Close auth error"
            >
              x
            </button>
          </div>
        ) : null}

        {shouldShowForgotPasswordError ? (
          <div className="status-banner error-banner">
            <span>{forgotPasswordError}</span>
            <button
              type="button"
              className="banner-close-button"
              onClick={() => {
                setForgotPasswordError("");
                setHasTriedForgotPasswordSubmit(false);
              }}
              aria-label="Close forgot password error"
            >
              x
            </button>
          </div>
        ) : null}

        {mode === "login" ? (
          <form
            className="auth-form"
            onSubmit={handleLoginSubmit}
            autoComplete="on"
            method="post"
            noValidate
          >
            <label className="auth-field">
              <span>Email Address</span>
              <input
                type="email"
                id="login-username"
                name="username"
                autoComplete="username"
                value={loginForm.email}
                placeholder="warehouse.admin@example.com"
                onChange={(event) => updateLoginField("email", event.target.value)}
              />
            </label>

            <label className="auth-field">
              <span>Password</span>
              <input
                type="password"
                id="login-password"
                name="password"
                autoComplete="current-password"
                value={loginForm.password}
                placeholder="Enter your password"
                onChange={(event) => updateLoginField("password", event.target.value)}
              />
            </label>

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing In..." : "Sign In"}
            </button>

            <button
              type="button"
              className="auth-link-button"
              onClick={openForgotPasswordMode}
            >
              Forgot Password?
            </button>
          </form>
        ) : mode === "forgot" ? (
          <form
            className="auth-form"
            onSubmit={handleForgotPasswordSubmit}
            autoComplete="on"
            method="post"
            noValidate
          >
            <label className="auth-field">
              <span>Email Address</span>
              <input
                type="email"
                name="username"
                autoComplete="username"
                value={forgotPasswordForm.email}
                placeholder="warehouse.admin@example.com"
                onChange={(event) => updateForgotPasswordField("email", event.target.value)}
              />
            </label>

            {isForgotPasswordOtpSent ? (
              <>
                <label className="auth-field">
                  <span>Email OTP</span>
                  <input
                    type="text"
                    name="forgotPasswordOtp"
                    inputMode="numeric"
                    value={forgotPasswordOtp}
                    placeholder="Enter the OTP sent to your email"
                    onChange={(event) => setForgotPasswordOtp(event.target.value)}
                  />
                </label>

                <label className="auth-field">
                  <span>New Password</span>
                  <input
                    type="password"
                    name="newPassword"
                    autoComplete="new-password"
                    value={forgotPasswordForm.password}
                    placeholder="Create a new password"
                    onChange={(event) => updateForgotPasswordField("password", event.target.value)}
                  />
                  {forgotPasswordStrength ? (
                    <small
                      className={`password-strength password-strength-${forgotPasswordStrength.level}`}
                    >
                      {forgotPasswordStrength.message}
                    </small>
                  ) : null}
                </label>

                <label className="auth-field">
                  <span>Confirm Password</span>
                  <input
                    type="password"
                    name="confirmPassword"
                    autoComplete="new-password"
                    value={forgotPasswordForm.confirmPassword}
                    placeholder="Re-enter your new password"
                    onChange={(event) =>
                      updateForgotPasswordField("confirmPassword", event.target.value)
                    }
                  />
                </label>
              </>
            ) : null}

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isForgotPasswordOtpSent
                  ? "Resetting Password..."
                  : "Sending OTP..."
                : isForgotPasswordOtpSent
                  ? "Verify OTP & Reset Password"
                  : "Send OTP"}
            </button>

            <button
              type="button"
              className="auth-link-button"
              onClick={() => {
                setError("");
                setMessage("");
                setForgotPasswordForm(initialForgotPasswordForm);
                setForgotPasswordOtp("");
                setForgotPasswordError("");
                setIsForgotPasswordOtpSent(false);
                setHasTriedForgotPasswordSubmit(false);
                setMode("login");
              }}
            >
              Back to Sign In
            </button>
          </form>
        ) : (
          <form
            className="auth-form"
            onSubmit={handleSignupSubmit}
            autoComplete="on"
            method="post"
            noValidate
          >
            <label className="auth-field">
              <span>Full Name</span>
              <input
                type="text"
                name="fullName"
                autoComplete="name"
                value={signupForm.fullName}
                placeholder="Warehouse Supervisor"
                onChange={(event) => updateSignupField("fullName", event.target.value)}
              />
            </label>

            <label className="auth-field">
              <span>Company / Site</span>
              <input
                type="text"
                name="organization"
                autoComplete="organization"
                value={signupForm.company}
                placeholder="Main Distribution Center"
                onChange={(event) => updateSignupField("company", event.target.value)}
              />
            </label>

            <label className="auth-field">
              <span>Email Address</span>
              <input
                type="email"
                name="username"
                autoComplete="username"
                value={signupForm.email}
                placeholder="warehouse.admin@example.com"
                onChange={(event) => updateSignupField("email", event.target.value)}
              />
            </label>

            <label className="auth-field">
              <span>Password</span>
              <input
                type="password"
                name="newPassword"
                autoComplete="new-password"
                value={signupForm.password}
                placeholder="Create a password"
                onChange={(event) => updateSignupField("password", event.target.value)}
              />
              {signupPasswordStrength ? (
                <small
                  className={`password-strength password-strength-${signupPasswordStrength.level}`}
                >
                  {signupPasswordStrength.message}
                </small>
              ) : null}
            </label>

            <label className="auth-field">
              <span>Confirm Password</span>
              <input
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                value={signupForm.confirmPassword}
                placeholder="Re-enter your password"
                onChange={(event) => updateSignupField("confirmPassword", event.target.value)}
              />
            </label>

            {isSignupOtpSent ? (
              <label className="auth-field">
                <span>Email OTP</span>
                <input
                  type="text"
                  name="signupOtp"
                  inputMode="numeric"
                  value={signupOtp}
                  placeholder="Enter the OTP sent to your email"
                  onChange={(event) => setSignupOtp(event.target.value)}
                />
              </label>
            ) : null}

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isSignupOtpSent
                  ? "Verifying OTP..."
                  : "Sending OTP..."
                : isSignupOtpSent
                  ? "Verify OTP & Create Account"
                  : "Send OTP"}
            </button>
          </form>
        )}
      </section>

      <section className="auth-showcase">
        <span className="eyebrow auth-eyebrow">Cycle Count Platform</span>
        <h1>Warehouse counting, scanning, and variance tracking in one workspace.</h1>
        <p>
          Secure the cycle count process with a clean operator login, structured
          uploads, camera scanning, and a live inventory dashboard built for warehouse
          teams.
        </p>

        <div className="auth-feature-list">
          <div className="auth-feature-card">
            <strong>Live Count Control</strong>
            <span>Track expected versus scanned quantity in real time.</span>
          </div>
          <div className="auth-feature-card">
            <strong>Faster Floor Scanning</strong>
            <span>Use hardware scanners or camera capture for batch and stock counting.</span>
          </div>
          <div className="auth-feature-card">
            <strong>Cleaner Adjustments</strong>
            <span>Fix mistaken scans manually and export the updated stock sheet.</span>
          </div>
        </div>
      </section>
    </main>
  );
}
