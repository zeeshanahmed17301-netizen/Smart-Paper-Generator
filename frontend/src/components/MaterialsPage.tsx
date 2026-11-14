import { useEffect, useRef, useState, type FormEvent } from "react";
import { FileText, Plus, Trash2, Upload } from "lucide-react";
import { apiRequest, type Material } from "../lib/api";

interface MaterialsPageProps {
  onChanged: () => void;
}

function formatFileSize(size: number): string {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function MaterialsPage({ onChanged }: MaterialsPageProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadMaterials() {
    setError("");
    try {
      const result = await apiRequest<{ materials: Material[] }>("/materials");
      setMaterials(result.materials);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load materials.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMaterials();
  }, []);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Choose a document to upload.");
      return;
    }

    setUploading(true);
    setError("");
    setNotice("");
    try {
      const body = new FormData();
      body.append("file", file);
      if (title.trim()) body.append("title", title.trim());
      await apiRequest<{ material: Material }>("/materials", { method: "POST", body });
      setFile(null);
      setTitle("");
      if (fileInput.current) fileInput.current.value = "";
      setNotice("Material uploaded and ready for question generation.");
      await loadMaterials();
      onChanged();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to upload this document.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(material: Material) {
    if (!window.confirm(`Delete "${material.title}"?`)) return;
    setError("");
    setNotice("");
    try {
      await apiRequest<void>(`/materials/${material.id}`, { method: "DELETE" });
      setMaterials((current) => current.filter((item) => item.id !== material.id));
      onChanged();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete this material.");
    }
  }

  return (
    <section className="workspace-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow">YOUR LIBRARY</span>
          <h1>Teaching materials</h1>
          <p>Upload a document to use as source material for question generation.</p>
        </div>
        <span className="page-count">{materials.length} {materials.length === 1 ? "material" : "materials"}</span>
      </header>

      <form className="upload-card" onSubmit={(event) => void handleUpload(event)}>
        <div className="panel-title">
          <span className="panel-icon lavender"><Upload size={18} /></span>
          <div><h2>Add a document</h2><p>PDF, DOCX, TXT, or Markdown · up to 10 MB</p></div>
        </div>
        <label className="field-label">
          Title <span className="field-optional">optional</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="e.g. Year 8 fractions notes" />
        </label>
        <label className="file-picker">
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <span className="file-picker-icon"><Plus size={17} /></span>
          <span>{file ? file.name : "Choose a file from your device"}</span>
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        {notice && <p className="form-success" role="status">{notice}</p>}
        <button className="button button-primary" disabled={uploading || !file}>
          {uploading ? "Uploading…" : "Upload material"}
        </button>
      </form>

      <section className="content-card">
        <div className="panel-title">
          <span className="panel-icon peach"><FileText size={18} /></span>
          <div><h2>Saved materials</h2><p>Document text is stored privately with your account.</p></div>
        </div>
        {loading ? (
          <p className="empty-state">Loading your materials…</p>
        ) : materials.length === 0 ? (
          <p className="empty-state">No materials yet. Upload a document to get started.</p>
        ) : (
          <div className="material-list">
            {materials.map((material) => (
              <article className="material-row" key={material.id}>
                <span className="material-file-icon"><FileText size={18} /></span>
                <div className="material-info">
                  <strong>{material.title}</strong>
                  <span>{material.originalName} · {formatFileSize(material.sizeBytes)}</span>
                </div>
                <button
                  type="button"
                  className="icon-button danger-button"
                  onClick={() => void handleDelete(material)}
                  aria-label={`Delete ${material.title}`}
                  title="Delete material"
                >
                  <Trash2 size={16} />
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
