import { useEffect, useState } from "react";
import { CheckCircle2, FileText, Printer, RefreshCw, Sparkles } from "lucide-react";
import { apiRequest, type Question, type QuestionLanguage, type QuestionType } from "../lib/api";

const paperFormat: Array<{
  type: QuestionType;
  title: string;
  count: number;
  marksPerQuestion: number;
}> = [
  { type: "mcq", title: "Multiple choice", count: 20, marksPerQuestion: 1 },
  { type: "fill_blank", title: "Fill in the blanks", count: 10, marksPerQuestion: 1 },
  { type: "true_false", title: "True or false", count: 10, marksPerQuestion: 1 },
  { type: "short", title: "Short answer", count: 10, marksPerQuestion: 1 },
];

interface PaperSection {
  type: QuestionType;
  title: string;
  marksPerQuestion: number;
  firstQuestionNumber: number;
  questions: Question[];
}

interface PreparedPaper {
  language: QuestionLanguage;
  sections: PaperSection[];
  versionNumber: number;
  versionCount: number;
}

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function getQuestionLabel(type: QuestionType): string {
  return type === "mcq" ? "MCQs" : type === "fill_blank" ? "fill-in-the-blanks" : type === "true_false" ? "True/False" : "short-answer";
}

export function ExamPaperPage({ onReviewQuestions }: { onReviewQuestions: () => void }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [language, setLanguage] = useState<QuestionLanguage>("en");
  const [title, setTitle] = useState("Examination Paper");
  const [instructions, setInstructions] = useState("Answer all questions. Marks per question are shown for each section.");
  const [sectionFormats, setSectionFormats] = useState(paperFormat);
  const [versionCount, setVersionCount] = useState("3");
  const [papers, setPapers] = useState<PreparedPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest<{ questions: Question[] }>("/questions")
      .then(({ questions }) => {
        if (active) setQuestions(questions);
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Unable to load your questions.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const languageQuestions = questions.filter(
    (question) => question.language === language && question.status === "approved",
  );
  const draftQuestions = questions.filter(
    (question) => question.language === language && question.status === "draft",
  );
  const questionCount = sectionFormats.reduce((total, section) => total + Math.max(0, section.count), 0);
  const totalMarks = sectionFormats.reduce(
    (total, section) => total + Math.max(0, section.count) * Math.max(0, section.marksPerQuestion),
    0,
  );
  const validPaperFormat = questionCount > 0 && sectionFormats.every((section) =>
    Number.isInteger(section.count)
      && section.count >= 0
      && section.count <= 100
      && Number.isInteger(section.marksPerQuestion)
      && section.marksPerQuestion >= 1
      && section.marksPerQuestion <= 100,
  );
  const availableCounts = new Map(
    sectionFormats.map((section) => [
      section.type,
      languageQuestions.filter((question) => question.type === section.type).length,
    ]),
  );
  const shortages = sectionFormats.filter(
    (section) => section.count > 0 && (availableCounts.get(section.type) ?? 0) < section.count,
  );
  const approvedForPattern = sectionFormats.reduce(
    (total, section) => total + Math.min(availableCounts.get(section.type) ?? 0, Math.max(0, section.count)),
    0,
  );
  const completionPercent = questionCount > 0 ? Math.round((approvedForPattern / questionCount) * 100) : 0;
  const draftsForPattern = sectionFormats.reduce(
    (total, section) => total + (section.count > 0
      ? draftQuestions.filter((question) => question.type === section.type).length
      : 0),
    0,
  );
  const requestedVersionCount = Number(versionCount);
  const validVersionCount = Number.isInteger(requestedVersionCount)
    && requestedVersionCount >= 1
    && requestedVersionCount <= 20;

  function updateSectionFormat(type: QuestionType, field: "count" | "marksPerQuestion", value: string) {
    const numberValue = Number(value);
    setSectionFormats((current) => current.map((section) =>
      section.type === type ? { ...section, [field]: numberValue } : section,
    ));
    setPapers([]);
  }

  function preparePapers() {
    const seenVersions = new Set<string>();
    const versions: PreparedPaper[] = [];

    for (let versionIndex = 0; versionIndex < requestedVersionCount; versionIndex += 1) {
      let nextQuestionNumber = 1;
      let sections = sectionFormats.filter((format) => format.count > 0).map((format) => {
        const questions = shuffle(
          languageQuestions.filter((question) => question.type === format.type),
        ).slice(0, format.count);
        const section: PaperSection = {
          type: format.type,
          title: format.title,
          marksPerQuestion: format.marksPerQuestion,
          firstQuestionNumber: nextQuestionNumber,
          questions,
        };
        nextQuestionNumber += questions.length;
        return section;
      });

      const signature = (candidate: PaperSection[]) =>
        candidate.map((section) => section.questions.map((question) => question.id).join(",")).join("|");
      let versionSignature = signature(sections);

      if (seenVersions.has(versionSignature)) {
        const rotatableSectionIndex = sections.findIndex((section) => section.questions.length > 1);
        const rotatableSection = sections[rotatableSectionIndex];
        for (let shift = 1; rotatableSection && shift <= rotatableSection.questions.length; shift += 1) {
          const rotatedQuestions = [
            ...rotatableSection.questions.slice(shift),
            ...rotatableSection.questions.slice(0, shift),
          ];
          sections = sections.map((section, index) =>
            index === rotatableSectionIndex ? { ...section, questions: rotatedQuestions } : section,
          );
          versionSignature = signature(sections);
          if (!seenVersions.has(versionSignature)) break;
        }
      }

      seenVersions.add(versionSignature);
      versions.push({
        language,
        sections,
        versionNumber: versionIndex + 1,
        versionCount: requestedVersionCount,
      });
    }

    setPapers(versions);
  }

  return (
    <section className="workspace-page exam-paper-page">
      <header className="page-heading no-print">
        <div>
          <span className="eyebrow">PAPER BUILDER</span>
          <h1>Examination papers</h1>
          <p>Build your paper step by step. Review drafts before they can be included.</p>
        </div>
        <span className="page-count">{totalMarks} marks · {questionCount} questions</span>
      </header>

      <section className="builder-card no-print">
        <div className="panel-title">
          <span className="panel-icon lavender"><FileText size={18} /></span>
          <div>
            <h2>Paper format</h2>
            <p>Set the question count and marks for each section. Drafts are not included until approved.</p>
          </div>
        </div>

        <div className="form-grid exam-paper-fields">
          <label className="field-label">Paper title
            <input maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="field-label">Question language
            <select value={language} onChange={(event) => {
              setLanguage(event.target.value as QuestionLanguage);
              setPapers([]);
            }}>
              <option value="en">English</option>
              <option value="ur">Urdu</option>
            </select>
          </label>
          <label className="field-label">Shuffled versions
            <input
              type="number"
              min={1}
              max={20}
              step={1}
              required
              value={versionCount}
              onChange={(event) => {
                setVersionCount(event.target.value);
                setPapers([]);
              }}
              aria-describedby="paper-version-help"
            />
            <span className="field-optional" id="paper-version-help">Choose 1–20 papers; default is 3.</span>
          </label>
        </div>

        <label className="field-label paper-instructions-field">
          Paper instructions <span className="field-optional">printed on every paper · optional</span>
          <textarea
            rows={3}
            maxLength={1000}
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            placeholder="Write the instructions students should follow…"
            dir={language === "ur" ? "rtl" : "ltr"}
          />
        </label>

        <div className="paper-section-settings" aria-label="Question count and marks by section">
          {sectionFormats.map((section) => (
            <div className="paper-section-setting" key={section.type}>
              <div className="paper-section-setting-title">
                <strong>{section.title}</strong>
                <span>Choose how many to include and their marks.</span>
              </div>
              <div className="paper-section-setting-fields">
                <label className="field-label">Questions
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={section.count}
                    onChange={(event) => updateSectionFormat(section.type, "count", event.target.value)}
                    aria-label={`${section.title} question count`}
                  />
                  <span className="field-optional">0–100 · use 0 to omit</span>
                </label>
                <label className="field-label">Marks per question
                  <input
                    type="number"
                    min={1}
                    max={100}
                    step={1}
                    value={section.marksPerQuestion}
                    onChange={(event) => updateSectionFormat(section.type, "marksPerQuestion", event.target.value)}
                    aria-label={`${section.title} marks per question`}
                  />
                  <span className="field-optional">1–100 marks</span>
                </label>
              </div>
            </div>
          ))}
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}

        {loading ? (
          <p className="empty-state">Loading your questions…</p>
        ) : (
          <>
            <div className={`paper-progress ${validPaperFormat && shortages.length === 0 ? "complete" : ""}`} role="status">
              <div className="paper-progress-copy">
                <strong>{validPaperFormat && shortages.length === 0
                  ? "Your paper is ready!"
                  : questionCount === 0
                    ? "Choose questions for your paper"
                    : `${approvedForPattern} of ${questionCount} questions ready`}</strong>
                <span>{draftsForPattern > 0
                  ? `${draftsForPattern} matching draft${draftsForPattern === 1 ? "" : "s"} still need review`
                  : !validPaperFormat
                    ? "Adjust the section counts and marks to make a valid paper."
                    : shortages.length === 0
                      ? "All included sections have enough approved questions."
                      : "Approve or add questions to complete each section."}</span>
              </div>
              <span className="paper-progress-percent">{completionPercent}%</span>
              <div
                className="paper-progress-track"
                role="progressbar"
                aria-label="Paper completion"
                aria-valuemin={0}
                aria-valuemax={Math.max(1, questionCount)}
                aria-valuenow={Math.min(approvedForPattern, Math.max(1, questionCount))}
              >
                <span style={{ width: `${completionPercent}%` }} />
              </div>
            </div>

            <div className="exam-section-list">
              {sectionFormats.map((section) => {
                const available = availableCounts.get(section.type) ?? 0;
                const included = section.count > 0;
                const enough = included && available >= section.count;
                const drafts = included
                  ? draftQuestions.filter((question) => question.type === section.type).length
                  : 0;
                return (
                  <div className="exam-section-row" key={section.type}>
                    <span className={`exam-section-status ${!included ? "off" : enough ? "ready" : "short"}`}>
                      {!included ? <span aria-hidden="true">–</span> : enough ? <CheckCircle2 size={16} /> : <span aria-hidden="true">!</span>}
                    </span>
                    <div className="exam-section-description">
                      <strong>{included ? `${section.count} ${section.title} questions` : `${section.title} · not included`}</strong>
                      <span>
                        {included ? `${section.marksPerQuestion} ${section.marksPerQuestion === 1 ? "mark" : "marks"} each` : "Set question count to include this section"}
                        {drafts > 0 ? ` · ${drafts} draft${drafts === 1 ? "" : "s"} to review` : ""}
                      </span>
                    </div>
                    <span className={`exam-availability ${!included ? "off" : enough ? "ready" : "short"}`}>
                      {included ? `${available} / ${section.count} approved` : "Not included"}
                    </span>
                  </div>
                );
              })}
            </div>

            {!validPaperFormat && (
              <p className="exam-shortage-message" role="alert">
                Include at least one question. Counts must be whole numbers from 0–100, and marks per question must be whole numbers from 1–100.
              </p>
            )}

            {shortages.length > 0 && (
              <div className="exam-shortage-message" role="status">
                <p>
                  {draftsForPattern > 0
                    ? `You have ${draftsForPattern} matching draft${draftsForPattern === 1 ? "" : "s"}, but drafts are not included yet. Review and approve them, then return here.`
                    : `To finish this ${language === "ur" ? "Urdu" : "English"} paper, add and approve ${shortages.map((section) => {
                      const missing = section.count - (availableCounts.get(section.type) ?? 0);
                      return `${missing} ${getQuestionLabel(section.type)}`;
                    }).join(", ")}.`}
                </p>
                <button type="button" className="button button-secondary" onClick={onReviewQuestions}>
                  <Sparkles size={15} /> {draftsForPattern > 0 ? "Review drafts" : "Open question bank"}
                </button>
              </div>
            )}
            <p className="exam-format-note">
              Adjust each section above; set its question count to 0 to leave it out. Long-answer questions stay in your bank and are not part of this pattern.
            </p>

            <div className="exam-builder-actions">
              <button
                type="button"
                className="button button-primary"
                onClick={preparePapers}
                disabled={loading || !validPaperFormat || shortages.length > 0 || !title.trim() || !validVersionCount}
              >
                <RefreshCw size={15} />
                {validVersionCount
                  ? requestedVersionCount === 1 ? "Create one paper" : `Create ${requestedVersionCount} shuffled versions`
                  : "Choose 1–20 papers"}
              </button>
              {papers.length > 0 && (
                <span className="exam-ready-note">
                  {papers.length === 1
                    ? "The question order is randomized. Generate again to reshuffle."
                    : "Each version has a different question order. Generate again to reshuffle."}
                </span>
              )}
            </div>
          </>
        )}
      </section>

      {papers.length > 0 && (
        <div className="exam-paper-result">
          <div className="exam-paper-toolbar no-print">
            <p>{papers.length === 1 ? "1 paper" : `${papers.length} shuffled versions`} · answers are not included</p>
            <button type="button" className="button button-primary" onClick={() => window.print()}>
              <Printer size={16} /> {papers.length === 1 ? "Print paper / Save as PDF" : "Print all / Save as PDF"}
            </button>
          </div>

          {papers.map((paper) => (
            <article className="exam-paper" key={paper.versionNumber}>
              <header className="exam-paper-header">
                <p className="exam-version-label">
                  {paper.versionCount === 1 ? "PAPER" : `VERSION ${paper.versionNumber} OF ${paper.versionCount}`}
                </p>
                <h1>{title.trim() || "Examination Paper"}</h1>
                <p>{paper.language === "ur" ? "زبان: اردو" : "Language: English"} <span>·</span> Total marks: {totalMarks}</p>
                <div className="exam-student-details">
                  <span>Student name: ____________________________________</span>
                  <span>Class: __________________</span>
                  <span>Date: __________________</span>
                </div>
                {instructions.trim() && (
                  <p className="exam-instructions" dir={paper.language === "ur" ? "rtl" : "ltr"}>
                    {instructions.trim()}
                  </p>
                )}
              </header>

              {paper.sections.map((section) => (
                <section className="exam-paper-section" key={section.type}>
                  <header className="exam-paper-section-heading">
                    <h2>{section.title}</h2>
                    <span>{section.questions.length} questions · {section.marksPerQuestion} {section.marksPerQuestion === 1 ? "mark" : "marks"} each · {section.questions.length * section.marksPerQuestion} marks</span>
                  </header>
                  <ol start={section.firstQuestionNumber}>
                    {section.questions.map((question) => (
                      <li className="exam-paper-question" key={question.id} dir={paper.language === "ur" ? "rtl" : "ltr"}>
                        <div className="exam-paper-prompt">{question.prompt}</div>
                        {section.type === "mcq" && (
                          <ul className="exam-paper-options">
                            {question.options.map((option, index) => (
                              <li key={`${question.id}-${index}`}><span>{String.fromCharCode(65 + index)}.</span> {option}</li>
                            ))}
                          </ul>
                        )}
                        {section.type === "true_false" && (
                          <div className="exam-true-false-options">
                            {(question.options.length === 2 ? question.options : ["True", "False"]).map((option, index) => (
                              <span key={`${question.id}-${index}`}><i aria-hidden="true" />{option}</span>
                            ))}
                          </div>
                        )}
                        {section.type === "fill_blank" && <div className="exam-writing-line" />}
                        {section.type === "short" && <div className="exam-short-answer-lines"><i /><i /></div>}
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
              <footer className="exam-paper-footer">End of paper · {totalMarks} marks</footer>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
