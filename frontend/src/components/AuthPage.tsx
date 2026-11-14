import { useState, type FormEvent } from "react";
import { BookOpenCheck, ClipboardList, Layers3, Sparkles } from "lucide-react";
import { apiRequest, type User } from "../lib/api";

interface AuthPageProps {
  onAuthenticated: (user: User) => void;
  notice?: string;
}

export function AuthPage({ onAuthenticated, notice }: AuthPageProps) {
  const [mode, setMode] = useState<"login" | "register">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const path = mode === "register" ? "/auth/register" : "/auth/login";
      const payload =
        mode === "register" ? { name, email, password } : { email, password };
      const result = await apiRequest<{ user: User }>(path, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      onAuthenticated(result.user);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="welcome-panel">
        <a className="brand brand-light" href="/" aria-label="Smart Paper Generator home">
          <span className="brand-mark"><BookOpenCheck size={20} /></span>
          <span>Smart Paper <strong>Generator</strong></span>
        </a>
        <div className="welcome-copy">
          <span className="eyebrow eyebrow-light"><Sparkles size={14} /> YOUR TEACHING WORKSPACE</span>
          <h1>Better papers.<br /><span>Less busywork.</span></h1>
          <p>Bring your teaching resources and exam preparation together in one calm, organized space.</p>
        </div>
        <div className="welcome-features">
          <div><span className="feature-icon"><Layers3 size={17} /></span><span><b>Everything in its place</b><small>Materials and questions, organized</small></span></div>
          <div><span className="feature-icon"><ClipboardList size={17} /></span><span><b>Made for your classroom</b><small>Build papers that fit your students</small></span></div>
        </div>
        <div className="welcome-decoration decoration-one" />
        <div className="welcome-decoration decoration-two" />
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <span className="eyebrow">GET STARTED</span>
          <h2>{mode === "register" ? "Create your account" : "Welcome back"}</h2>
          <p className="auth-subtitle">
            {mode === "register" ? "Set up your teacher workspace in a moment." : "Sign in to pick up where you left off."}
          </p>
          {notice && <p className="form-error" role="status">{notice}</p>}
          <form onSubmit={handleSubmit}>
            {mode === "register" && (
              <label>
                Your name
                <input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Ayesha Khan" required minLength={2} maxLength={80} />
              </label>
            )}
            <label>
              Email address
              <input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@school.edu" required />
            </label>
            <label>
              Password
              <input autoComplete={mode === "register" ? "new-password" : "current-password"} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" required minLength={8} />
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button button-primary auth-submit" disabled={submitting}>
              {submitting ? "Please wait…" : mode === "register" ? "Create account" : "Sign in"}
            </button>
          </form>
          <p className="auth-switch">
            {mode === "register" ? "Already have an account?" : "New to Smart Paper Generator?"}{" "}
            <button type="button" onClick={() => { setMode(mode === "register" ? "login" : "register"); setError(""); }}>
              {mode === "register" ? "Sign in" : "Create an account"}
            </button>
          </p>
          <p className="auth-note">Your account is private to you. You can add your school details later.</p>
        </div>
        <span className="auth-footer">A little more time for teaching.</span>
      </section>
    </main>
  );
}
