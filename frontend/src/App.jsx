import { useEffect, useMemo, useState } from "react";

const API = "http://127.0.0.1:8000/api/students/";
const EMPTY_FORM = { name: "", email: "", course: "" };

function getErrorMessage(data) {
  if (typeof data === "string") return data;
  if (!data || typeof data !== "object") return "Something went wrong. Please try again.";

  return Object.entries(data)
    .map(([field, messages]) => {
      const message = Array.isArray(messages) ? messages.join(" ") : String(messages);
      return `${field === "non_field_errors" ? "" : `${field}: `}${message}`;
    })
    .join(" ");
}

async function requestStudents() {
  const response = await fetch(API);
  if (!response.ok) throw new Error("Unable to load student records.");
  return response.json();
}

export default function App() {
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadStudents() {
    try {
      setStudents(await requestStudents());
      setError("");
    } catch {
      setError("Cannot connect to Django. Check that the backend is running, then try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    requestStudents()
      .then((data) => {
        if (active) {
          setStudents(data);
          setError("");
        }
      })
      .catch(() => {
        if (active) setError("Cannot connect to Django. Check that the backend is running, then try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const visibleStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) =>
      [student.name, student.email, student.course]
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [search, students]);

  function handleChange(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      const response = await fetch(editId ? `${API}${editId}/` : API, {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(getErrorMessage(data));

      setForm(EMPTY_FORM);
      setEditId(null);
      await loadStudents();
    } catch (err) {
      setError(err.message || "Unable to save this student.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteStudent(id) {
    if (!window.confirm("Delete this student record? This cannot be undone.")) return;

    setError("");
    try {
      const response = await fetch(`${API}${id}/`, { method: "DELETE" });
      if (!response.ok) throw new Error("Unable to delete this student. Please try again.");
      await loadStudents();
    } catch (err) {
      setError(err.message || "Unable to delete this student.");
    }
  }

  function editStudent(student) {
    setEditId(student.id);
    setForm({ name: student.name, email: student.email, course: student.course });
    setError("");
    document.getElementById("student-name")?.focus();
  }

  function cancelEdit() {
    setEditId(null);
    setForm(EMPTY_FORM);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Campus home">
          <span className="brand-mark" aria-hidden="true">C</span>
          <span>campus<span className="brand-light">desk</span></span>
        </a>
        <div className="topbar-meta">
          <span className="status-dot" />
          <span>Student portal</span>
        </div>
      </header>

      <div className="dashboard">
        <section className="welcome-row">
          <div>
            <p className="eyebrow">OVERVIEW</p>
            <h1>Student management</h1>
            <p className="welcome-copy">Keep your student records organized, all in one place.</p>
          </div>
          <div className="total-card" aria-label={`${students.length} students enrolled`}>
            <span className="total-icon" aria-hidden="true">↗</span>
            <div>
              <span className="total-label">TOTAL STUDENTS</span>
              <strong>{students.length.toString().padStart(2, "0")}</strong>
            </div>
          </div>
        </section>

        {error && (
          <div className="error-banner" role="alert">
            <span className="error-icon" aria-hidden="true">!</span>
            <span>{error}</span>
            <button type="button" className="error-dismiss" onClick={() => setError("")} aria-label="Dismiss error">×</button>
          </div>
        )}

        <section className="content-grid">
          <form className="panel student-form" onSubmit={handleSubmit}>
            <div className="panel-heading">
              <div>
                <span className="section-kicker">{editId ? "EDIT RECORD" : "NEW ENROLLMENT"}</span>
                <h2>{editId ? "Update student" : "Add a student"}</h2>
                <p>{editId ? "Make changes to this student’s details." : "Enter the details to create a student record."}</p>
              </div>
              <span className="form-icon" aria-hidden="true">{editId ? "✎" : "+"}</span>
            </div>

            <div className="field">
              <label htmlFor="student-name">Full name</label>
              <input
                id="student-name"
                name="name"
                placeholder="e.g. Alex Morgan"
                value={form.name}
                onChange={handleChange}
                autoComplete="name"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="student-email">Email address</label>
              <input
                id="student-email"
                type="email"
                name="email"
                placeholder="alex@university.edu"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="student-course">Course</label>
              <input
                id="student-course"
                name="course"
                placeholder="e.g. Computer Science"
                value={form.course}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-actions">
              <button className="button button-primary" type="submit" disabled={saving}>
                {saving ? "Saving..." : editId ? "Save changes" : "Add student"}
                {!saving && <span aria-hidden="true">→</span>}
              </button>
              {editId && (
                <button className="button button-quiet" type="button" onClick={cancelEdit}>
                  Cancel
                </button>
              )}
            </div>
          </form>

          <section className="panel records-panel" aria-labelledby="records-title">
            <div className="records-heading">
              <div>
                <span className="section-kicker">DIRECTORY</span>
                <h2 id="records-title">Student records <span className="count-badge">{students.length}</span></h2>
              </div>
              <label className="search-box">
                <span className="search-icon" aria-hidden="true">⌕</span>
                <input
                  type="search"
                  aria-label="Search students"
                  placeholder="Search students..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
            </div>

            {loading ? (
              <div className="table-message">
                <span className="loading-spinner" aria-hidden="true" />
                <p>Loading student records...</p>
              </div>
            ) : visibleStudents.length === 0 ? (
              <div className="table-message empty-state">
                <span className="empty-icon" aria-hidden="true">{search ? "⌕" : "＋"}</span>
                <h3>{search ? "No matching students" : "No students yet"}</h3>
                <p>{search ? "Try another name, email, or course." : "Your student records will show up here once you add the first one."}</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="student-table">
                  <thead>
                    <tr>
                      <th scope="col">STUDENT</th>
                      <th scope="col">COURSE</th>
                      <th scope="col" className="actions-heading">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleStudents.map((student) => (
                      <tr key={student.id}>
                        <td>
                          <div className="student-cell">
                            <span className="avatar" aria-hidden="true">
                              {student.name.trim().charAt(0).toUpperCase()}
                            </span>
                            <span className="student-details">
                              <strong>{student.name}</strong>
                              <span>{student.email}</span>
                            </span>
                          </div>
                        </td>
                        <td><span className="course-tag">{student.course}</span></td>
                        <td>
                          <div className="row-actions">
                            <button className="icon-button edit-button" type="button" onClick={() => editStudent(student)} aria-label={`Edit ${student.name}`}>
                              Edit
                            </button>
                            <button className="icon-button delete-button" type="button" onClick={() => deleteStudent(student.id)} aria-label={`Delete ${student.name}`}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="records-footer">
              Showing <strong>{visibleStudents.length}</strong> of <strong>{students.length}</strong> students
            </div>
          </section>
        </section>

        <footer className="page-footer">
          <span>Campusdesk <span aria-hidden="true">·</span> Student records made simple</span>
          <span>React <span aria-hidden="true">+</span> Django</span>
        </footer>
      </div>
    </main>
  );
}
