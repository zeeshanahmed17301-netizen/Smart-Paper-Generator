import { useEffect, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  FileText,
  FolderOpen,
  LogOut,
  Plus,
  Printer,
  Sparkles,
} from "lucide-react";
import { MaterialsPage } from "./MaterialsPage";
import { QuestionBankPage } from "./QuestionBankPage";
import { ExamPaperPage } from "./ExamPaperPage";
import { apiRequest, type Material, type Question, type QuestionStatus, type User } from "../lib/api";

type DashboardView = "overview" | "materials" | "questions" | "papers";
type QuestionFilter = QuestionStatus;

const dashboardViews: DashboardView[] = ["overview", "materials", "questions", "papers"];
const questionFilters: QuestionFilter[] = ["draft", "approved"];

interface DashboardProps {
  user: User;
  onSignOut: () => Promise<void>;
}

const viewTitles: Record<DashboardView, string> = {
  overview: "Overview",
  materials: "Teaching materials",
  questions: "Question bank",
  papers: "Examination papers",
};

export function Dashboard({ user, onSignOut }: DashboardProps) {
  const viewStorageKey = `smart-paper-generator:${user.id}:dashboard-view`;
  const questionFilterStorageKey = `smart-paper-generator:${user.id}:question-filter`;
  const [view, setView] = useState<DashboardView>(() => {
    const savedView = window.localStorage.getItem(viewStorageKey);
    return dashboardViews.find((candidate) => candidate === savedView) ?? "overview";
  });
  const [questionFilter, setQuestionFilter] = useState<QuestionFilter>(() => {
    const savedFilter = window.localStorage.getItem(questionFilterStorageKey);
    return questionFilters.find((candidate) => candidate === savedFilter) ?? "draft";
  });
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [counts, setCounts] = useState({ materials: 0, questions: 0, approved: 0 });
  const [overviewError, setOverviewError] = useState("");
  const [signOutError, setSignOutError] = useState("");
  const firstName = user.name.split(" ")[0] || "Teacher";
  const initials = user.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  useEffect(() => {
    window.localStorage.setItem(viewStorageKey, view);
  }, [view, viewStorageKey]);

  useEffect(() => {
    window.localStorage.setItem(questionFilterStorageKey, questionFilter);
  }, [questionFilter, questionFilterStorageKey]);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest<{ materials: Material[] }>("/materials"),
      apiRequest<{ questions: Question[] }>("/questions"),
    ])
      .then(([materialsResult, questionsResult]) => {
        if (!active) return;
        setCounts({
          materials: materialsResult.materials.length,
          questions: questionsResult.questions.length,
          approved: questionsResult.questions.filter((question) => question.status === "approved").length,
        });
        setOverviewError("");
      })
      .catch((error: unknown) => {
        if (active) {
          setOverviewError(error instanceof Error ? error.message : "Unable to load workspace totals.");
        }
      });
    return () => { active = false; };
  }, [refreshVersion]);

  function refreshOverview() {
    setRefreshVersion((version) => version + 1);
  }

  function openQuestionBank(filter: QuestionStatus = "draft") {
    setQuestionFilter(filter);
    setView("questions");
  }

  async function handleSignOut() {
    setSignOutError("");
    try {
      await onSignOut();
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : "Unable to sign out. Please try again.");
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand sidebar-brand" href="/" aria-label="Smart Paper Generator dashboard">
          <span className="brand-mark"><BookOpen size={19} /></span>
          <span>Smart Paper <strong>Generator</strong></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <button type="button" className={`nav-item ${view === "overview" ? "active" : ""}`} onClick={() => setView("overview")}>
            <span className="nav-icon"><BookOpen size={17} /></span>Overview
          </button>
          <button type="button" className={`nav-item ${view === "materials" ? "active" : ""}`} onClick={() => setView("materials")}>
            <span className="nav-icon"><FolderOpen size={17} /></span>My materials
          </button>
          <button type="button" className={`nav-item ${view === "questions" ? "active" : ""}`} onClick={() => openQuestionBank()}>
            <span className="nav-icon"><CircleHelp size={17} /></span>Question bank
          </button>
          <button type="button" className={`nav-item ${view === "papers" ? "active" : ""}`} onClick={() => setView("papers")}>
            <span className="nav-icon"><Printer size={17} /></span>Examination papers
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="tip-icon"><Sparkles size={16} /></span>
            <b>Questions, your way</b>
            <p>Review drafts and organize approved questions by type.</p>
          </div>
          <button className="profile-button" onClick={() => void handleSignOut()}>
            <span className="avatar">{initials}</span>
            <span className="profile-name"><b>{user.name}</b><small>{user.email}</small></span>
            <LogOut size={16} aria-label="Sign out" />
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="topbar">
          <div className="breadcrumbs">Workspace <span>/</span> <b>{viewTitles[view]}</b></div>
          <button className="topbar-profile" onClick={() => void handleSignOut()} aria-label="Sign out">
            <span className="avatar avatar-small">{initials}</span><ChevronDown size={15} />
          </button>
        </header>
        <div className="dashboard-content">
          {signOutError && <p className="form-error dashboard-error" role="alert">{signOutError}</p>}
          {view === "materials" ? (
            <MaterialsPage onChanged={refreshOverview} />
          ) : view === "questions" ? (
            <QuestionBankPage
              onChanged={refreshOverview}
              initialFilter={questionFilter}
              onFilterChange={setQuestionFilter}
              onBuildPaper={() => setView("papers")}
            />
          ) : view === "papers" ? (
            <ExamPaperPage onReviewQuestions={() => openQuestionBank("draft")} />
          ) : (
            <section className="workspace-page overview-page">
              <header className="page-heading overview-heading">
                <div>
                  <span className="eyebrow">YOUR TEACHER WORKSPACE</span>
                  <h1>Good to see you, {firstName}</h1>
                  <p>Organize your teaching materials and build a question bank ready for review.</p>
                </div>
                <span className="phase-label">PHASE 3</span>
              </header>

              {overviewError && <p className="form-error page-message" role="alert">{overviewError}</p>}

              <section className="welcome-banner phase-two-banner">
                <div className="banner-copy">
                  <span className="banner-pill"><Sparkles size={13} /> YOUR WORKSPACE</span>
                  <h2>From lesson notes<br />to reviewed questions.</h2>
                  <p>Upload teaching materials and build a question bank with questions you can review and approve.</p>
                  <button className="button button-primary" onClick={() => setView("materials")}>
                    <Plus size={16} /> Add teaching material
                  </button>
                </div>
                <div className="banner-art" aria-hidden="true">
                  <div className="art-glow" />
                  <div className="art-paper paper-back"><span /><span /><span /></div>
                  <div className="art-paper paper-front"><span className="art-check"><Check size={13} /></span><span /><span /><span /></div>
                  <div className="art-sparkle sparkle-top"><Sparkles size={19} /></div>
                  <div className="art-sparkle sparkle-side"><Sparkles size={13} /></div>
                </div>
              </section>

              <section className="stats-grid" aria-label="Workspace summary">
                <article className="stat-card">
                  <span className="stat-icon stat-violet"><FolderOpen size={18} /></span>
                  <span className="stat-label">Teaching materials</span>
                  <span className="stat-value">{counts.materials}</span>
                  <span className="stat-footnote">Private to your account</span>
                </article>
                <article className="stat-card">
                  <span className="stat-icon stat-peach"><CircleHelp size={18} /></span>
                  <span className="stat-label">Questions collected</span>
                  <span className="stat-value">{counts.questions}</span>
                  <span className="stat-footnote">Drafts and approved</span>
                </article>
                <article className="stat-card">
                  <span className="stat-icon stat-mint"><FileText size={18} /></span>
                  <span className="stat-label">Questions approved</span>
                  <span className="stat-value">{counts.approved}</span>
                  <span className="stat-footnote">Reviewed by you</span>
                </article>
              </section>

              <section className="steps-section">
                <div className="section-heading">
                  <div><h2>Get started</h2><p>Choose what you want to work on.</p></div>
                </div>
                <div className="steps-grid">
                  <button type="button" className="step-card step-card-button" onClick={() => setView("materials")}>
                    <span className="step-icon lavender"><FolderOpen size={19} /></span>
                    <h3>Add teaching materials</h3>
                    <p>Upload PDF, DOCX, TXT, or Markdown documents.</p>
                    <span className="step-status"><span />Open materials</span>
                  </button>
                  <button type="button" className="step-card step-card-button" onClick={() => openQuestionBank()}>
                    <span className="step-icon peach"><CircleHelp size={19} /></span>
                    <h3>Build your question bank</h3>
                    <p>Create questions manually and review them before use.</p>
                    <span className="step-status"><span />Open question bank</span>
                  </button>
                  <button type="button" className="step-card step-card-button" onClick={() => setView("papers")}>
                    <span className="step-icon mint"><FileText size={19} /></span>
                    <h3>Prepare examination papers</h3>
                    <p>Assemble approved questions into a paper you can print or save as PDF.</p>
                    <span className="step-status"><span />Build an examination paper</span>
                  </button>
                </div>
              </section>
              <footer className="dashboard-footer">Made for teachers, with care <span>·</span> Smart Paper Generator</footer>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
