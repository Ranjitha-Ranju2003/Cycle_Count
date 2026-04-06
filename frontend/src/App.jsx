import { useMemo, useState } from "react";
import DashboardPage from "./pages/DashboardPage";
import AuthPage from "./pages/AuthPage";
import {
  deleteUserProfile,
  loginUser,
  requestForgotPasswordOtp,
  requestSignupOtp,
  updateUserProfile,
  verifyForgotPasswordOtp,
  verifySignupOtp,
} from "./services/api";

const SESSION_KEY = "cycle_count_session";

const loadSession = () => {
  try {
    const parsedSession = JSON.parse(window.sessionStorage.getItem(SESSION_KEY) || "null");

    if (!parsedSession?.id) {
      return null;
    }

    return parsedSession;
  } catch (_error) {
    return null;
  }
};

export default function App() {
  const [session, setSession] = useState(() => loadSession());

  const currentUser = useMemo(() => session, [session]);

  const handleLogin = async ({ email, password }) => {
    const response = await loginUser({ email, password });
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(response.user));
    setSession(response.user);
  };

  const handleRequestSignupOtp = async ({ fullName, company, email, password }) => {
    return requestSignupOtp({ fullName, company, email, password });
  };

  const handleVerifySignupOtp = async ({ email, otp }) => {
    const response = await verifySignupOtp({ email, otp });
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(response.user));
    setSession(response.user);
    return response;
  };

  const handleRequestForgotPasswordOtp = async ({ email }) => {
    return requestForgotPasswordOtp({ email });
  };

  const handleVerifyForgotPasswordOtp = async ({ email, otp, password }) => {
    return verifyForgotPasswordOtp({ email, otp, password });
  };

  const handleProfileUpdate = async (updates) => {
    const response = await updateUserProfile(currentUser.id, updates);
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(response.user));
    setSession(response.user);
    return response.user;
  };

  const handleLogout = () => {
    window.sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
  };

  const handleDeleteProfile = async () => {
    await deleteUserProfile(currentUser.id);
    handleLogout();
  };

  if (!currentUser) {
    return (
      <AuthPage
        onLogin={handleLogin}
        onRequestForgotPasswordOtp={handleRequestForgotPasswordOtp}
        onRequestSignupOtp={handleRequestSignupOtp}
        onVerifyForgotPasswordOtp={handleVerifyForgotPasswordOtp}
        onVerifySignupOtp={handleVerifySignupOtp}
      />
    );
  }

  return (
    <DashboardPage
      currentUser={currentUser}
      onLogout={handleLogout}
      onDeleteProfile={handleDeleteProfile}
      onProfileUpdate={handleProfileUpdate}
    />
  );
}
