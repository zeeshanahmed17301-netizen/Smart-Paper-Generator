import { useEffect, useState, type FormEvent } from "react";
import { Check, CircleHelp, Edit3, FileText, Trash2, Undo2 } from "lucide-react";
import {
  apiRequest,
  type Material,
  type Question,
  type QuestionLanguage,
  type QuestionStatus,
  type QuestionType,
} from "../lib/api";

interface QuestionBankPageProps {
  onChanged: () => void;
  initialFilter?: QuestionStatus;
  onFilterChange?: (filter: QuestionStatus) => void;
  onBuildPaper?: () => void;
}

const questionTypes: QuestionType[] = ["mcq", "short", "long", "true_false", "fill_blank"];
const questionTypeLabels: Record<QuestionType, string> = {
  mcq: "Multiple choice",
  short: "Short answer",
  long: "Long answer",
  true_false: "True / false",
  fill_blank: "Fill in the blank",
};

interface QuestionForm {
  prompt: string;
  type: QuestionType;
  options: string;
  answer: string;
  explanation: string;
  language: QuestionLanguage;
  materialId: string;
}

function optionsToText(options: string[]): string {
  return options.join("\n");
}

function trueFalseOptions(language: QuestionLanguage): [string, string] {
  return language === "ur" ? ["درست", "غلط"] : ["True", "False"];
}

function defaultOptions(type: QuestionType, language: QuestionLanguage): string {
  if (type === "true_false") return trueFalseOptions(language).join("\n");
  if (type === "mcq") return "Option 1\nOption 2\nOption 3\nOption 4";
  return "";
}

function QuestionCard({
  question,
  materials,
  onChanged,
}: {
  question: Question;
  materials: Material[];
  onChanged: (notice?: string, status?: QuestionStatus, type?: QuestionType) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<QuestionForm>({
    prompt: question.prompt,
    type: question.type,
    options: optionsToText(question.options),
    answer: question.answer,
    explanation: question.explanation,
    language: question.language,
    materialId: question.materialId ?? "",
  });

  async function saveQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiRequest<{ question: Question }>(`/questions/${question.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          prompt: form.prompt,
          type: form.type,
          options: form.type === "mcq"
            ? form.options.split("\n").map((option) => option.trim()).filter(Boolean)
            : form.type === "true_false" ? trueFalseOptions(form.language) : [],
          answer: form.answer,
          explanation: form.explanation,
          language: form.language,
          materialId: form.materialId || null,
          status: "draft",
        }),
      });
      setEditing(false);
      await onChanged("Question updated and moved to Needs review.", "draft", form.type);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update this question.");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(status: QuestionStatus) {
    setError("");
    try {
      await apiRequest<{ question: Question }>(`/questions/${question.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          prompt: question.prompt,
          type: question.type,
          options: question.options,
          answer: question.answer,
          explanation: question.explanation,
          language: question.language,
          materialId: question.materialId,
          status,
        }),
      });
      await onChanged(status === "approved"
        ? "Question approved and moved to its section in Approved questions."
        : "Question moved back to Needs review.", status, question.type);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update question status.");
    }
  }

  async function deleteQuestion() {
    if (!window.confirm("Delete this question permanently?")) return;
    setError("");
    try {
      await apiRequest<void>(`/questions/${question.id}`, { method: "DELETE" });
      await onChanged();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete this question.");
    }
  }

  const materialTitle = materials.find((material) => material.id === question.materialId)?.title;

  function updateFormType(type: QuestionType) {
    if (type === "true_false") {
      const options = trueFalseOptions(form.language);
      setForm({ ...form, type, options: options.join("\n"), answer: options[0] });
      return;
    }
    setForm({ ...form, type });
  }

  function updateFormLanguage(language: QuestionLanguage) {
    if (form.type !== "true_false") {
      setForm({ ...form, language });
      return;
    }
    const currentOptions = trueFalseOptions(form.language);
    const nextOptions = trueFalseOptions(language);
    const correctIndex = currentOptions.indexOf(form.answer);
    setForm({
      ...form,
      language,
      options: nextOptions.join("\n"),
      answer: nextOptions[correctIndex === 1 ? 1 : 0],
    });
  }

  return (
    <article className="question-card">
      <header className="question-card-header">
        <div className="question-badges">
          <span className={`status-badge ${question.status}`}>{question.status === "approved" ? "Approved" : "Needs review"}</span>
          <span className="type-badge">{questionTypeLabels[question.type]}</span>
          <span className="type-badge">{question.language === "ur" ? "Urdu" : "English"}</span>
        </div>
        <div className="question-actions">
          {question.status === "draft" ? (
            <button type="button" className="small-action approve-action" onClick={() => void changeStatus("approved")}><Check size={14} /> Approve</button>
          ) : (
            <button
              type="button"
              className="small-action remove-approval-action"
              title="Remove from approved questions and keep as a draft"
              onClick={() => void changeStatus("draft")}
            >
              <Undo2 size={14} /> Remove from approved
            </button>
          )}
          <button type="button" className="icon-button" onClick={() => setEditing((current) => !current)} aria-label="Edit question" title="Edit"><Edit3 size={15} /></button>
          <button type="button" className="icon-button danger-button" onClick={() => void deleteQuestion()} aria-label="Delete question permanently" title="Delete permanently"><Trash2 size={15} /></button>
        </div>
      </header>

      {editing ? (
        <form className="question-edit-form" onSubmit={(event) => void saveQuestion(event)}>
          <label className="field-label">Question
            <textarea dir={form.language === "ur" ? "rtl" : "ltr"} required minLength={1} maxLength={2000} value={form.prompt} onChange={(event) => setForm({ ...form, prompt: event.target.value })} />
          </label>
          <div className="form-grid">
            <label className="field-label">Type
              <select value={form.type} onChange={(event) => updateFormType(event.target.value as QuestionType)}>
                {questionTypes.map((type) => <option value={type} key={type}>{questionTypeLabels[type]}</option>)}
              </select>
            </label>
            <label className="field-label">Language
              <select value={form.language} onChange={(event) => updateFormLanguage(event.target.value as QuestionLanguage)}>
                <option value="en">English</option>
                <option value="ur">Urdu</option>
              </select>
            </label>
          </div>
          {form.type === "mcq" && (
            <label className="field-label">Options <span className="field-optional">one per line</span>
              <textarea dir={form.language === "ur" ? "rtl" : "ltr"} required value={form.options} onChange={(event) => setForm({ ...form, options: event.target.value })} />
            </label>
          )}
          {form.type === "true_false" && (
            <p className="helper-text">True/False choices are fixed. Choose which one is correct below.</p>
          )}
          <label className="field-label">{form.type === "true_false" ? "Correct answer" : "Answer"}
            {form.type === "true_false" ? (
              <select required value={form.answer} onChange={(event) => setForm({ ...form, answer: event.target.value })}>
                {trueFalseOptions(form.language).map((option) => <option value={option} key={option}>{option}</option>)}
              </select>
            ) : (
              <textarea dir={form.language === "ur" ? "rtl" : "ltr"} required maxLength={4000} value={form.answer} onChange={(event) => setForm({ ...form, answer: event.target.value })} />
            )}
          </label>
          <label className="field-label">Explanation <span className="field-optional">optional</span>
            <textarea maxLength={4000} value={form.explanation} onChange={(event) => setForm({ ...form, explanation: event.target.value })} />
          </label>
          <label className="field-label">Source material <span className="field-optional">optional</span>
            <select value={form.materialId} onChange={(event) => setForm({ ...form, materialId: event.target.value })}>
              <option value="">None</option>
              {materials.map((material) => <option key={material.id} value={material.id}>{material.title}</option>)}
            </select>
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-actions">
            <button className="button button-primary" disabled={saving}>{saving ? "Saving…" : "Save as draft"}</button>
            <button className="button button-secondary" type="button" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <div className="question-card-body" dir={question.language === "ur" ? "rtl" : "ltr"}>
          <h3>{question.prompt}</h3>
          {question.options.length > 0 && (
            <ul className="question-options">
              {question.options.map((option) => <li className={option === question.answer ? "correct-option" : ""} key={option}>{option}</li>)}
            </ul>
          )}
          <p className="question-answer"><strong>Answer:</strong> {question.answer}</p>
          {question.explanation && <p className="question-explanation">{question.explanation}</p>}
          <footer className="question-card-footer">
            <span>{materialTitle ? `From ${materialTitle}` : "Added to your question bank"}</span>
            <span>{new Date(question.createdAt).toLocaleDateString()}</span>
          </footer>
        </div>
      )}
      {error && !editing && <p className="form-error question-inline-error" role="alert">{error}</p>}
    </article>
  );
}

export function QuestionBankPage({
  onChanged,
  initialFilter = "draft",
  onFilterChange,
  onBuildPaper,
}: QuestionBankPageProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [filter, setFilter] = useState<QuestionStatus>(initialFilter);
  const [selectedType, setSelectedType] = useState<QuestionType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [savingManual, setSavingManual] = useState(false);
  const [manualPrompt, setManualPrompt] = useState("");
  const [manualType, setManualType] = useState<QuestionType>("short");
  const [manualLanguage, setManualLanguage] = useState<QuestionLanguage>("en");
  const [manualOptions, setManualOptions] = useState("");
  const [manualAnswer, setManualAnswer] = useState("");
  const [manualExplanation, setManualExplanation] = useState("");
  const [manualMaterial, setManualMaterial] = useState("");

  async function loadData(successNotice?: string) {
    setLoading(true);
    setError("");
    try {
      const [questionResult, materialResult] = await Promise.all([
        apiRequest<{ questions: Question[] }>("/questions"),
        apiRequest<{ materials: Material[] }>("/materials"),
      ]);
      setQuestions(questionResult.questions);
      setMaterials(materialResult.materials);
      if (successNotice) setNotice(successNotice);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load your question bank.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    setFilter(initialFilter);
  }, [initialFilter]);

  function updateFilter(nextFilter: QuestionStatus) {
    setFilter(nextFilter);
    setSelectedType(null);
    onFilterChange?.(nextFilter);
  }

  async function refreshQuestionCard(
    successNotice?: string,
    nextStatus?: QuestionStatus,
    nextType?: QuestionType,
  ) {
    if (nextStatus) updateFilter(nextStatus);
    if (nextType) setSelectedType(nextType);
    await loadData(successNotice);
    onChanged();
  }

  function updateManualType(type: QuestionType) {
    setManualType(type);
    setManualOptions(defaultOptions(type, manualLanguage));
    if (type === "true_false") setManualAnswer(trueFalseOptions(manualLanguage)[0]);
  }

  function updateManualLanguage(value: QuestionLanguage) {
    const previousOptions = trueFalseOptions(manualLanguage);
    setManualLanguage(value);
    if (manualType === "true_false") {
      const nextOptions = trueFalseOptions(value);
      const correctIndex = previousOptions.indexOf(manualAnswer);
      setManualOptions(nextOptions.join("\n"));
      setManualAnswer(nextOptions[correctIndex === 1 ? 1 : 0]);
    }
  }

  async function createManualQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingManual(true);
    setError("");
    setNotice("");
    try {
      await apiRequest<{ question: Question }>("/questions", {
        method: "POST",
        body: JSON.stringify({
          prompt: manualPrompt,
          type: manualType,
          options: manualType === "mcq"
            ? manualOptions.split("\n").map((option) => option.trim()).filter(Boolean)
            : manualType === "true_false" ? trueFalseOptions(manualLanguage) : [],
          answer: manualAnswer,
          explanation: manualExplanation,
          language: manualLanguage,
          materialId: manualMaterial || null,
        }),
      });
      setManualPrompt("");
      setManualOptions(defaultOptions(manualType, manualLanguage));
      setManualAnswer(manualType === "true_false" ? trueFalseOptions(manualLanguage)[0] : "");
      setManualExplanation("");
      setManualMaterial("");
      updateFilter("draft");
      setSelectedType(manualType);
      setNotice("Question saved as a draft for review.");
      await loadData();
      onChanged();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save this question.");
    } finally {
      setSavingManual(false);
    }
  }

  const statusQuestions = questions.filter((question) => question.status === filter);
  const draftCount = questions.filter((question) => question.status === "draft").length;
  const approvedCount = questions.length - draftCount;
  const activeType = selectedType
    ?? questionTypes.find((type) => statusQuestions.some((question) => question.type === type))
    ?? "mcq";
  const visibleQuestions = statusQuestions.filter((question) => question.type === activeType);
  const typeCounts = Object.fromEntries(
    questionTypes.map((type) => [type, statusQuestions.filter((question) => question.type === type).length]),
  ) as Record<QuestionType, number>;
  const filterOptions: { value: QuestionStatus; label: string; count: number }[] = [
    { value: "draft", label: "Needs review", count: draftCount },
    { value: "approved", label: "Approved questions", count: approvedCount },
  ];

  return (
    <section className="workspace-page">
      <header className="page-heading question-bank-heading">
        <div>
          <span className="eyebrow">BUILD YOUR BANK</span>
          <h1>Question bank</h1>
          <p>Add questions yourself and review them before approval.</p>
        </div>
        <div className="question-status-tabs" aria-label="Filter questions by review status">
          {filterOptions.map((option) => (
            <button
              type="button"
              className={`question-status-tab${filter === option.value ? " active" : ""}`}
              aria-pressed={filter === option.value}
              key={option.value}
              onClick={() => updateFilter(option.value)}
            >
              {option.label}
              <span className="question-status-count">{option.count}</span>
            </button>
          ))}
        </div>
      </header>

      <section className="question-workflow-card" aria-label="Question review progress">
        <div className="question-workflow-copy">
          <span className="workflow-icon"><Check size={17} /></span>
          <div>
            <strong>{approvedCount} approved · {draftCount} to review</strong>
            <p>New questions are saved as drafts. Approve the ones you want to use in an examination paper.</p>
          </div>
        </div>
        {draftCount > 0 ? (
          <button type="button" className="button button-secondary" onClick={() => updateFilter("draft")}>Review drafts</button>
        ) : onBuildPaper ? (
          <button type="button" className="button button-primary" onClick={onBuildPaper}><FileText size={15} /> Build a paper</button>
        ) : null}
      </section>

      <div className="question-builder-grid">
        <form className="builder-card" onSubmit={(event) => void createManualQuestion(event)}>
          <div className="panel-title">
            <span className="panel-icon peach"><CircleHelp size={18} /></span>
            <div><h2>Add a question</h2><p>Create a question manually.</p></div>
          </div>
          <label className="field-label">Question
            <textarea dir={manualLanguage === "ur" ? "rtl" : "ltr"} required minLength={1} maxLength={2000} value={manualPrompt} onChange={(event) => setManualPrompt(event.target.value)} placeholder="Write the question…" />
          </label>
          <div className="form-grid">
            <label className="field-label">Type
              <select value={manualType} onChange={(event) => updateManualType(event.target.value as QuestionType)}>
                {questionTypes.map((type) => <option value={type} key={type}>{questionTypeLabels[type]}</option>)}
              </select>
            </label>
            <label className="field-label">Language
              <select value={manualLanguage} onChange={(event) => updateManualLanguage(event.target.value as QuestionLanguage)}>
                <option value="en">English</option>
                <option value="ur">Urdu</option>
              </select>
            </label>
          </div>
          {manualType === "mcq" && (
            <label className="field-label">Options <span className="field-optional">one per line</span>
              <textarea dir={manualLanguage === "ur" ? "rtl" : "ltr"} required value={manualOptions} onChange={(event) => setManualOptions(event.target.value)} />
            </label>
          )}
          {manualType === "true_false" && (
            <p className="helper-text">True/False choices are fixed. Choose which one is correct below.</p>
          )}
          <label className="field-label">{manualType === "true_false" ? "Correct answer" : "Answer"}
            {manualType === "true_false" ? (
              <select required value={manualAnswer} onChange={(event) => setManualAnswer(event.target.value)}>
                {trueFalseOptions(manualLanguage).map((option) => <option value={option} key={option}>{option}</option>)}
              </select>
            ) : (
              <textarea dir={manualLanguage === "ur" ? "rtl" : "ltr"} required maxLength={4000} value={manualAnswer} onChange={(event) => setManualAnswer(event.target.value)} placeholder="Add the answer or expected solution…" />
            )}
          </label>
          <label className="field-label">Explanation <span className="field-optional">optional</span>
            <textarea dir={manualLanguage === "ur" ? "rtl" : "ltr"} maxLength={4000} value={manualExplanation} onChange={(event) => setManualExplanation(event.target.value)} />
          </label>
          <label className="field-label">Source material <span className="field-optional">optional</span>
            <select value={manualMaterial} onChange={(event) => setManualMaterial(event.target.value)}>
              <option value="">None</option>
              {materials.map((material) => <option key={material.id} value={material.id}>{material.title}</option>)}
            </select>
          </label>
          <button className="button button-primary" disabled={savingManual}>{savingManual ? "Saving…" : "Save as draft"}</button>
        </form>

      </div>

      {error && <p className="form-error page-message" role="alert">{error}</p>}
      {notice && <p className="form-success page-message" role="status">{notice}</p>}

      <section className="question-list-section">
        <div className="section-heading">
          <div>
            <h2>{filter === "approved" ? "Approved questions" : "Questions to review"}</h2>
            <p>Select a question type to view that section.</p>
          </div>
        </div>
        <div className="question-type-tabs" aria-label={`Filter ${filter === "approved" ? "approved" : "review"} questions by type`}>
          {questionTypes.map((type) => (
            <button
              type="button"
              className={`question-type-tab${activeType === type ? " active" : ""}`}
              aria-pressed={activeType === type}
              key={type}
              onClick={() => setSelectedType(type)}
            >
              {questionTypeLabels[type]}
              <span className="question-status-count">{typeCounts[type]}</span>
            </button>
          ))}
        </div>
        {loading ? (
          <p className="empty-state">Loading your questions…</p>
        ) : statusQuestions.length === 0 ? (
          <p className="empty-state">
            {filter === "approved"
              ? "No approved questions yet. Approve a question to move it here."
              : "No questions need review right now."}
          </p>
        ) : visibleQuestions.length === 0 ? (
          <p className="empty-state">
            No {questionTypeLabels[activeType].toLowerCase()} questions in {filter === "approved" ? "Approved questions" : "Needs review"} yet.
          </p>
        ) : (
          <div className="question-list">
            {visibleQuestions.map((question) => (
              <QuestionCard key={question.id} question={question} materials={materials} onChanged={refreshQuestionCard} />
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
