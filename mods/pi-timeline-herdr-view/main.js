// A task tree with weighted progress — DSH's Timeline plugin, in a Herdr pane:
// what the agent is working on, what finished, what is blocked, in order.
// Props: { file?, cwd? } — the tree to show; defaults to <focused folder>/timeline.json.
// File: { version?, title?, tasks: [{ id, title, parent?, weight?, status, note?, result? }] }
// status: "done" | "active" | "pending" | "blocked"; weight defaults to 1.
// pi-timeline writes this file on every `timeline` tool call.
import { View, div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { readTextFile, watchFolder, props, focused, panes, spaces, home, theme, closeOverlay } from "herdr";

// A mod pane and an overlay have no folder of their own: use the focused pane's,
// else the active tab's first terminal, so the tree follows the work beside it.
function folder() {
  const f = focused();
  if (f?.cwd) return f.cwd;
  const tab = panes().find((p) => p.tab === f?.tab && p.cwd);
  if (tab?.cwd) return tab.cwd;
  return spaces().find((s) => s.active)?.folder || home();
}

const GLYPH = { done: "✔", active: "▶", pending: "○", blocked: "!" };
const WORD = { done: "done", active: "in progress", pending: "pending", blocked: "blocked" };
const SEGMENTS = ["done", "active", "blocked", "pending"];

// Each node takes its weight's share of its siblings, and hands that share down.
// A node with children is measured by them; a leaf counts for its own status.
function layout(tasks) {
  const ids = new Set(tasks.map((t) => t.id));
  const kids = new Map();
  for (const t of tasks) {
    t.parent = ids.has(t.parent) && t.parent !== t.id ? t.parent : null;
    t.weight = Number(t.weight) > 0 ? Number(t.weight) : 1;
    if (!kids.has(t.parent)) kids.set(t.parent, []);
    kids.get(t.parent).push(t);
  }
  const seg = { done: 0, active: 0, pending: 0, blocked: 0 };
  const rows = [];
  const walk = (parent, share, depth) => {
    const list = kids.get(parent) ?? [];
    const total = list.reduce((n, t) => n + t.weight, 0);
    for (const t of list) {
      t.share = (t.weight / total) * share;
      t.depth = depth;
      rows.push(t);
      const sub = kids.get(t.id);
      if (sub) walk(t.id, t.share, depth + 1);
      else seg[t.status] = (seg[t.status] ?? 0) + t.share;
    }
  };
  walk(null, 1, 0);
  return { rows, seg };
}

export default class Timeline extends View {
  init(_props, cx) {
    this.state = { title: null, rows: [], seg: null, error: null, file: null };
    this.selected = null;
    this.load(cx);
    this.watch(cx);
  }

  file() {
    return props()?.file || `${props()?.cwd || folder()}/timeline.json`;
  }

  load(cx) {
    const file = this.file();
    cx.spawn(async (c) => {
      try {
        const raw = await readTextFile(file);
        if (raw === null) {
          this.state = { title: null, rows: [], seg: null, error: `No timeline yet: ${file}`, file };
        } else {
          const data = JSON.parse(raw);
          const tasks = (data.tasks ?? []).map((t, i) => ({ ...t, id: t.id ?? `t${i}` }));
          this.state = { title: data.title ?? null, ...layout(tasks), error: null, file };
        }
      } catch (e) {
        this.state = { ...this.state, error: String(e) };
      } finally {
        c.notify();
      }
    });
  }

  watch(cx) {
    const dir = this.file().replace(/\/[^/]*$/, "");
    cx.spawn(async (c) => {
      try {
        for (;;) {
          await watchFolder(dir);
          this.load(c);
          c.notify();
        }
      } catch {
        // A missing folder stays quiet: load() already says the file is absent.
      }
    });
  }

  bar(t) {
    const seg = this.state.seg;
    const total = SEGMENTS.reduce((n, k) => n + (seg?.[k] ?? 0), 0);
    const parts = SEGMENTS.filter((k) => (seg?.[k] ?? 0) > 0).map((k) => {
      const color = k === "done" ? t.done : k === "active" ? t.working : k === "blocked" ? t.blocked : t.dim;
      return div().flex_grow(seg[k] / total).flex_basis(0).h(6).bg(color);
    });
    return h_flex()
      .flex_none()
      .h(6)
      .gap(2)
      .rounded(3)
      .overflow_hidden()
      .children(parts.length ? parts : [div().flex_1().h(6).bg(t.border)]);
  }

  detail(t) {
    const task = this.state.rows.find((r) => r.id === this.selected);
    if (!task) return null;
    const color = task.status === "blocked" ? t.blocked : task.status === "active" ? t.working : task.status === "done" ? t.done : t.dim;
    return v_flex()
      .flex_none()
      .max_h(180)
      .overflow_y_scrollbar()
      .gap(4)
      .p(10)
      .border_t(1)
      .border_color(t.border)
      .child(
        h_flex()
          .gap(6)
          .items_center()
          .child(div().flex_none().text_color(color).child(GLYPH[task.status] ?? "·"))
          .child(div().flex_1().font_semibold().text_color(t.foreground).child(task.title ?? ""))
          .child(div().flex_none().text_color(t.dim).child(`${Math.round(task.share * 100)}% · w${task.weight}`)),
      )
      .when(Boolean(task.note), (el) => el.child(div().text_color(t.blocked).child(`! ${task.note}`)))
      .when(Boolean(task.result), (el) => el.child(div().text_color(t.muted).child(`→ ${task.result}`)));
  }

  render(cx) {
    const t = theme();
    const { title, rows, seg, error } = this.state;
    const pct = Math.round((seg?.done ?? 0) * 100);
    return v_flex()
      .size_full()
      .bg(t.surface)
      .text_size(12)
      .child(
        v_flex()
          .flex_none()
          .gap(6)
          .p(10)
          .border_b(1)
          .border_color(t.border)
          .child(
            h_flex()
              .gap(8)
              .items_center()
              .child(div().truncate().flex_1().font_semibold().text_color(t.foreground).child(title || "Timeline"))
              .child(div().flex_none().text_color(t.muted).child(rows.length ? `${pct}%` : ""))
              // Only an overlay copy can be dismissed; a pane copy closes with its pane.
              .when(Boolean(props()?.overlay), (el) =>
                el.child(
                  div()
                    .id("timeline-close")
                    .flex_none()
                    .px(4)
                    .rounded(4)
                    .cursor_pointer()
                    .text_color(t.muted)
                    .hover((s) => s.bg(t.hover).text_color(t.foreground))
                    .on_click(() => closeOverlay(props().overlay))
                    .child("✕"),
                ),
              ),
          )
          .when(rows.length > 0, (el) => el.child(this.bar(t)))
          .when(Boolean(error), (el) => el.child(div().text_color(rows.length ? t.blocked : t.dim).child(error))),
      )
      .child(
        v_flex()
          .id("timeline-tree")
          .flex_1()
          .min_h(0)
          .overflow_y_scrollbar()
          .py(4)
          .children(
            rows.map((r, i) => {
              const color = r.status === "blocked" ? t.blocked : r.status === "active" ? t.working : r.status === "done" ? t.done : t.dim;
              const on = r.id === this.selected;
              return h_flex()
                .id(`t${i}`)
                .mx(6)
                .px(6)
                .py(2)
                .gap(6)
                .items_start()
                .rounded(4)
                .when(on, (el) => el.bg(t.selected))
                .hover((el) => el.bg(t.hover))
                .cursor_pointer()
                .on_click(() => {
                  this.selected = on ? null : r.id;
                  cx.notify();
                })
                .child(div().flex_none().w(56).pl(r.depth * 12).text_color(color).child(GLYPH[r.status] ?? "·"))
                .child(div().flex_1().text_color(r.status === "pending" ? t.muted : t.foreground).child(r.title ?? r.id))
                .when(r.weight !== 1, (el) => el.child(div().flex_none().text_color(t.dim).child(`w${r.weight}`)));
            }),
          ),
      )
      .when(rows.length > 0, (el) => el.child(this.detail(t) ?? div().flex_none()));
  }
}
