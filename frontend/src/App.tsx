import { useEffect, useState } from "react";
import { AuthPage } from "./components/AuthPage";
import { Dashboard } from "./components/Dashboard";
import { ApiError, apiRequest, type User } from "./lib/api";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [startupError, setStartupError] = useState("");

  useEffect(() => {
    apiRequest<{ user: User }>("/auth/me")
      .then(({ user: currentUser }) => setUser(currentUser))
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          setUser(null);
          return;
        }
        setStartupError("Unable to connect to the server. Please check that the API is running, then try again.");
      })
      .finally(() => setCheckingSession(false));
  }, []);

  async function signOut() {
    await apiRequest<void>("/auth/logout", { method: "POST" });
    setUser(null);
  }

  if (checkingSession) {
    return <main className="loading-screen">Preparing your workspace…</main>;
  }

  return user ? (
    <Dashboard user={user} onSignOut={signOut} />
  ) : (
    <AuthPage onAuthenticated={setUser} notice={startupError} />
  );
}
