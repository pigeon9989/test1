import { useEffect, useState } from 'react';

interface Note {
  id: string;
  text: string;
  createdAt: number;
}

const STORAGE_KEY = 'mf-platform/notes/items';

function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveNotes(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export default function App() {
  const [notes, setNotes] = useState<Note[]>(() => loadNotes());
  const [draft, setDraft] = useState('');

  useEffect(() => saveNotes(notes), [notes]);

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    setNotes((prev) => [
      { id: crypto.randomUUID(), text, createdAt: Date.now() },
      ...prev,
    ]);
    setDraft('');
  };

  const remove = (id: string) => setNotes((prev) => prev.filter((n) => n.id !== id));

  return (
    <section
      style={{
        padding: '1.25rem',
        border: '1px solid #e2e2ea',
        borderRadius: 14,
        background: 'linear-gradient(180deg, #fffefb, #fff)',
        maxWidth: 640,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <h3 style={{ margin: 0 }}>📝 Notes</h3>
        <span style={{ color: '#888', fontSize: 12 }}>{notes.length}개</span>
      </header>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              add();
            }
          }}
          placeholder="메모를 입력하고 Enter"
          style={{ flex: 1, padding: '0.55rem 0.7rem', border: '1px solid #d4d4dc', borderRadius: 8, fontSize: 14 }}
        />
        <button
          onClick={add}
          disabled={!draft.trim()}
          style={{ padding: '0.55rem 1rem', background: '#2553f2', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
        >
          추가
        </button>
      </div>

      {notes.length === 0 ? (
        <p style={{ color: '#888', marginTop: 16 }}>아직 메모가 없습니다.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, marginTop: 16, display: 'grid', gap: 8 }}>
          {notes.map((n) => (
            <li
              key={n.id}
              style={{
                padding: '0.65rem 0.8rem',
                border: '1px solid #ececf2',
                borderRadius: 10,
                background: '#fff',
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
              }}
            >
              <div style={{ flex: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{n.text}</div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <time style={{ fontSize: 11, color: '#888' }}>
                  {new Date(n.createdAt).toLocaleString()}
                </time>
                <button
                  onClick={() => remove(n.id)}
                  style={{ background: 'transparent', border: 'none', color: '#a00', cursor: 'pointer', fontSize: 12 }}
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
