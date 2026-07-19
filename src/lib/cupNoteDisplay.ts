import { wheelData } from '../data/wheel';

const noteColor = new Map<string, string>();
const noteCategory = new Map<string, string>();

for (const fam of wheelData) {
  for (const sub of fam.subs) {
    noteColor.set(sub.name.toLowerCase(), fam.color);
    noteCategory.set(sub.name.toLowerCase(), fam.name);
  }
}

function colorForNote(note: string): { color: string; category: string | null } {
  const low = note.toLowerCase();
  if (noteColor.has(low)) return { color: noteColor.get(low)!, category: noteCategory.get(low)! };
  for (const [k, color] of noteColor.entries()) {
    if (low.includes(k) || k.includes(low)) return { color, category: noteCategory.get(k) || null };
  }
  return { color: '#a87c4f', category: null };
}

export type CupNoteTag = { note: string; color: string; category: string | null };

export function buildCupNoteTags(notes: string[]): CupNoteTag[] {
  return notes.filter(Boolean).map((note) => {
    const { color, category } = colorForNote(note);
    return { note, color, category };
  });
}

export function groupCupNotesByCategory(tags: CupNoteTag[]): { category: string; color: string; notes: string[] }[] {
  const groups = new Map<string, { color: string; notes: string[] }>();
  const custom: string[] = [];
  for (const t of tags) {
    if (!t.category) { custom.push(t.note); continue; }
    const g = groups.get(t.category) || { color: t.color, notes: [] };
    g.notes.push(t.note);
    groups.set(t.category, g);
  }
  const out = [...groups.entries()].map(([category, g]) => ({ category, color: g.color, notes: g.notes }));
  if (custom.length) out.push({ category: 'Своё', color: '#a87c4f', notes: custom });
  return out;
}
