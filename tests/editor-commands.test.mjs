import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

register("./ts-resolve-loader.mjs", import.meta.url);

// Unit tests for the editor's command layer: undo history (including the
// transaction and coalescing behaviour that makes one drag one undo step),
// the pure document operations, and the snapping geometry.

const { History } = await import("../app/edit/commands/history.ts");
const ops = await import("../app/edit/commands/documentOps.ts");
const geo = await import("../app/edit/canvas/geometry.ts");
const { defaultVisualDocument } = await import("../app/content/visual.ts");

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

test("undo and redo walk the stack", () => {
  const history = new History();
  history.record("a", "b", { label: "First" });
  history.record("b", "c", { label: "Second" });

  assert.equal(history.snapshot().canUndo, true);
  assert.equal(history.snapshot().undoLabel, "Second");
  assert.equal(history.undo(), "b");
  assert.equal(history.undo(), "a");
  assert.equal(history.undo(), null, "nothing left to undo");
  assert.equal(history.redo(), "b");
  assert.equal(history.redo(), "c");
  assert.equal(history.redo(), null);
});

test("a transaction collapses a continuous gesture into one undo step", () => {
  const history = new History();
  history.begin("start", "Resize");
  // A drag emits a value on every pointer move.
  for (let i = 1; i <= 200; i += 1) history.record(`step${i - 1}`, `step${i}`, { label: "Resize" });
  history.commit("final");

  assert.equal(history.snapshot().depth, 1, "200 pointer moves must be one entry");
  assert.equal(history.undo(), "start", "undo returns the pre-gesture state");
});

test("an aborted transaction records nothing", () => {
  const history = new History();
  history.begin("start", "Resize");
  history.record("start", "mid", { label: "Resize" });
  history.abort();
  assert.equal(history.snapshot().canUndo, false);
});

test("a transaction that ends where it started records nothing", () => {
  const history = new History();
  history.begin("same", "Move item");
  history.commit("same");
  assert.equal(history.snapshot().canUndo, false);
});

test("edits sharing a coalesce key merge inside the window", () => {
  let now = 1000;
  const history = new History(100, () => now);
  history.record("a", "b", { label: "Nudge", coalesceKey: "nudge:x" });
  now += 100;
  history.record("b", "c", { label: "Nudge", coalesceKey: "nudge:x" });
  now += 100;
  history.record("c", "d", { label: "Nudge", coalesceKey: "nudge:x" });

  assert.equal(history.snapshot().depth, 1, "a burst of nudges is one undo");
  assert.equal(history.undo(), "a", "undo returns to before the burst");
});

test("coalescing stops once the window lapses", () => {
  let now = 1000;
  const history = new History(100, () => now);
  history.record("a", "b", { label: "Nudge", coalesceKey: "nudge:x" });
  now += 5000;
  history.record("b", "c", { label: "Nudge", coalesceKey: "nudge:x" });
  assert.equal(history.snapshot().depth, 2);
});

test("different coalesce keys never merge", () => {
  const history = new History();
  history.record("a", "b", { label: "Nudge", coalesceKey: "nudge:one" });
  history.record("b", "c", { label: "Nudge", coalesceKey: "nudge:two" });
  assert.equal(history.snapshot().depth, 2);
});

test("recording clears the redo stack", () => {
  const history = new History();
  history.record("a", "b", { label: "First" });
  history.undo();
  assert.equal(history.snapshot().canRedo, true);
  history.record("a", "z", { label: "Divergent" });
  assert.equal(history.snapshot().canRedo, false);
});

test("history is bounded so long sessions cannot grow without limit", () => {
  const history = new History(5);
  for (let i = 0; i < 20; i += 1) history.record(`s${i}`, `s${i + 1}`, { label: `Edit ${i}` });
  assert.equal(history.snapshot().depth, 5);
});

// ---------------------------------------------------------------------------
// Document operations
// ---------------------------------------------------------------------------

const page = "home";
const fresh = () => defaultVisualDocument();
const rowIds = (doc) => doc.pages[page].rows.map((row) => row.itemIds);

test("moving an item below a row places it in its own row", () => {
  const doc = fresh();
  const [firstRow, secondRow] = doc.pages[page].rows;
  const moved = ops.moveItem(doc, page, firstRow.itemIds[0], secondRow.id, "below");

  const flat = ops.orderedItemIds(moved, page);
  assert.equal(flat.length, ops.orderedItemIds(doc, page).length, "no item is lost");
  const index = moved.pages[page].rows.findIndex((row) => row.itemIds.includes(firstRow.itemIds[0]));
  const target = moved.pages[page].rows.findIndex((row) => row.id === secondRow.id);
  assert.equal(index, target + 1, "lands directly below the target row");
});

test("moving an item beside a row pairs them", () => {
  const doc = fresh();
  const [firstRow, secondRow] = doc.pages[page].rows;
  const moved = ops.moveItem(doc, page, firstRow.itemIds[0], secondRow.id, "right");
  const target = moved.pages[page].rows.find((row) => row.id === secondRow.id);
  assert.equal(target.itemIds.length, 2);
  assert.equal(target.itemIds[1], firstRow.itemIds[0]);
});

test("a row never exceeds the two-item ceiling", () => {
  let doc = fresh();
  const rows = doc.pages[page].rows;
  const paired = rows.find((row) => row.itemIds.length === 2) ?? rows[2];
  const loose = rows.find((row) => row.itemIds.length === 1 && row.id !== paired.id);
  doc = ops.moveItem(doc, page, loose.itemIds[0], paired.id, "right");
  for (const row of doc.pages[page].rows) {
    assert.ok(row.itemIds.length <= ops.MAX_ITEMS_PER_ROW, "rows stay within the ceiling");
  }
});

test("an item is never left in two rows at once", () => {
  const doc = fresh();
  const [firstRow, , thirdRow] = doc.pages[page].rows;
  const id = firstRow.itemIds[0];
  const moved = ops.moveItem(doc, page, id, thirdRow.id, "below");
  const occurrences = moved.pages[page].rows.filter((row) => row.itemIds.includes(id)).length;
  assert.equal(occurrences, 1);
});

test("empty rows are pruned after a move", () => {
  const doc = fresh();
  const [firstRow, secondRow] = doc.pages[page].rows;
  const moved = ops.moveItem(doc, page, firstRow.itemIds[0], secondRow.id, "right");
  assert.ok(!moved.pages[page].rows.some((row) => row.itemIds.length === 0));
  assert.ok(!moved.pages[page].rows.some((row) => row.id === firstRow.id), "the emptied row is gone");
});

test("moveRow shifts a row up and down without losing items", () => {
  const doc = fresh();
  const before = rowIds(doc);
  const id = doc.pages[page].rows[2].itemIds[0];
  const down = ops.moveRow(doc, page, id, 1);
  assert.deepEqual(rowIds(down)[3], before[2]);
  const backUp = ops.moveRow(down, page, id, -1);
  assert.deepEqual(rowIds(backUp), before, "moving down then up is a round trip");
});

test("moveRow at the boundaries is a no-op", () => {
  const doc = fresh();
  const firstId = doc.pages[page].rows[0].itemIds[0];
  assert.deepEqual(rowIds(ops.moveRow(doc, page, firstId, -1)), rowIds(doc));
  const lastRow = doc.pages[page].rows[doc.pages[page].rows.length - 1];
  assert.deepEqual(rowIds(ops.moveRow(doc, page, lastRow.itemIds[0], 1)), rowIds(doc));
});

test("duplicating an item inserts a copy with a new id right below", () => {
  const doc = fresh();
  const source = doc.pages[page].items.find((item) => item.kind === "native");
  const { doc: next, newId } = ops.duplicateItem(doc, page, source.id);

  assert.ok(newId && newId !== source.id, "the copy gets its own id");
  const copy = ops.findItem(next, page, newId);
  assert.match(copy.label, /copy$/);
  const sourceRow = next.pages[page].rows.findIndex((row) => row.itemIds.includes(source.id));
  const copyRow = next.pages[page].rows.findIndex((row) => row.itemIds.includes(newId));
  assert.equal(copyRow, sourceRow + 1);
});

test("deleting a native section hides it instead of destroying its copy", () => {
  const doc = fresh();
  const native = doc.pages[page].items.find((item) => item.kind === "native");
  const next = ops.removeItem(doc, page, native.id);

  const survivor = ops.findItem(next, page, native.id);
  assert.ok(survivor, "the native section still exists");
  assert.equal(survivor.style.hidden, true, "it is hidden rather than removed");
});

test("deleting a freeform item removes it entirely", () => {
  let doc = fresh();
  doc = ops.insertItem(doc, page, { id: "free-1", kind: "text", label: "Scratch" });
  assert.ok(ops.findItem(doc, page, "free-1"));

  doc = ops.removeItem(doc, page, "free-1");
  assert.equal(ops.findItem(doc, page, "free-1"), undefined);
  assert.ok(!doc.pages[page].rows.some((row) => row.itemIds.includes("free-1")));
});

test("grouping puts two items in one row and ungrouping splits them again", () => {
  const doc = fresh();
  const [a, b] = [doc.pages[page].rows[0].itemIds[0], doc.pages[page].rows[1].itemIds[0]];

  const grouped = ops.groupItems(doc, page, [a, b]);
  const row = grouped.pages[page].rows.find((candidate) => candidate.itemIds.includes(a));
  assert.deepEqual(row.itemIds, [a, b]);

  const ungrouped = ops.ungroupItems(grouped, page, [a, b]);
  assert.equal(ungrouped.pages[page].rows.filter((candidate) => candidate.itemIds.includes(a))[0].itemIds.length, 1);
  assert.ok(ops.orderedItemIds(ungrouped, page).includes(b), "the partner survives the split");
});

test("grouping a single item does nothing", () => {
  const doc = fresh();
  const id = doc.pages[page].rows[0].itemIds[0];
  assert.deepEqual(rowIds(ops.groupItems(doc, page, [id])), rowIds(doc));
});

test("layout patches are per device and do not touch the other one", () => {
  const doc = fresh();
  const id = doc.pages[page].rows[0].itemIds[0];
  const next = ops.patchLayout(doc, page, id, "phone", { width: 60 });

  assert.equal(ops.findItem(next, page, id).style.phone.width, 60);
  assert.equal(ops.findItem(next, page, id).style?.desktop?.width, undefined, "desktop is untouched");
});

test("linked devices mirror a layout patch to both breakpoints", () => {
  let doc = fresh();
  const id = doc.pages[page].rows[0].itemIds[0];
  doc.pages[page].items.find((item) => item.id === id).style = { linkedDevices: true };

  const next = ops.patchLayout(doc, page, id, "phone", { width: 40 });
  assert.equal(ops.findItem(next, page, id).style.phone.width, 40);
  assert.equal(ops.findItem(next, page, id).style.desktop.width, 40);
});

test("nudging accumulates and stays inside its bounds", () => {
  const doc = fresh();
  const id = doc.pages[page].rows[0].itemIds[0];
  let next = ops.nudgeItem(doc, page, id, "phone", 5, 0);
  next = ops.nudgeItem(next, page, id, "phone", 5, 0);
  assert.equal(ops.findItem(next, page, id).style.phone.nudgeX, 10);

  for (let i = 0; i < 50; i += 1) next = ops.nudgeItem(next, page, id, "phone", 10, 0);
  assert.equal(ops.findItem(next, page, id).style.phone.nudgeX, ops.NUDGE_LIMIT, "clamped, not runaway");
});

test("match size copies the first selection's dimensions to the rest", () => {
  let doc = fresh();
  const [a, b] = [doc.pages[page].rows[0].itemIds[0], doc.pages[page].rows[1].itemIds[0]];
  doc = ops.patchLayout(doc, page, a, "phone", { width: 45, minHeight: 200 });
  doc = ops.patchLayout(doc, page, b, "phone", { width: 90, minHeight: 40 });

  const widthOnly = ops.matchSize(doc, page, [a, b], "width", "phone");
  assert.equal(ops.findItem(widthOnly, page, b).style.phone.width, 45);
  assert.equal(ops.findItem(widthOnly, page, b).style.phone.minHeight, 40, "height untouched");

  const both = ops.matchSize(doc, page, [a, b], "both", "phone");
  assert.equal(ops.findItem(both, page, b).style.phone.minHeight, 200);
});

test("distribute gives every selected item an equal share", () => {
  const doc = fresh();
  const ids = ops.orderedItemIds(doc, page).slice(0, 4);
  const next = ops.distributeWidths(doc, page, ids, "phone");
  for (const id of ids) assert.equal(ops.findItem(next, page, id).style.phone.width, 25);
});

test("operations never mutate the document they are given", () => {
  const doc = fresh();
  const before = JSON.stringify(doc);
  const id = doc.pages[page].rows[0].itemIds[0];

  ops.moveItem(doc, page, id, doc.pages[page].rows[2].id, "below");
  ops.removeItem(doc, page, id);
  ops.patchLayout(doc, page, id, "phone", { width: 12 });
  ops.groupItems(doc, page, ops.orderedItemIds(doc, page).slice(0, 2));

  assert.equal(JSON.stringify(doc), before, "inputs are treated as immutable");
});

// ---------------------------------------------------------------------------
// Snapping geometry
// ---------------------------------------------------------------------------

test("width snaps to common fractions when close", () => {
  assert.equal(geo.snapWidth(49).value, 50);
  assert.equal(geo.snapWidth(49).label, "50%");
  assert.equal(geo.snapWidth(101).value, 100);
  assert.equal(geo.snapWidth(42).label, null, "no snap when nothing is near");
  assert.equal(geo.snapWidth(42).value, 42);
});

test("width snaps to a sibling so a pair can be levelled", () => {
  const snapped = geo.snapWidth(44, [45]);
  assert.equal(snapped.value, 45);
  assert.equal(snapped.label, "Match sibling");
});

test("width never goes below the minimum grabbable size", () => {
  assert.ok(geo.snapWidth(-20).value >= 5);
});

test("height snaps to an eight pixel rhythm", () => {
  assert.equal(geo.snapHeight(101).value, 104);
  assert.equal(geo.snapHeight(160).value, 160);
});

test("alignment snapping lines a rect up with the page centre", () => {
  const container = { left: 0, top: 0, width: 400, height: 800 };
  const moving = { left: 146, top: 100, width: 100, height: 50 };
  const result = geo.alignmentSnap(moving, [], container);

  assert.equal(result.dx, 4, "nudged so its centre meets the page centre");
  assert.ok(result.guides.some((guide) => guide.kind === "center" && guide.position === 200));
});

test("alignment snapping matches a sibling edge", () => {
  const container = { left: 0, top: 0, width: 1000, height: 1000 };
  const other = { left: 300, top: 0, width: 100, height: 50 };
  const moving = { left: 297, top: 200, width: 100, height: 50 };
  const result = geo.alignmentSnap(moving, [other], container);
  assert.equal(result.dx, 3, "left edges line up");
});

test("alignment snapping does nothing when everything is far apart", () => {
  const result = geo.alignmentSnap(
    { left: 500, top: 500, width: 10, height: 10 },
    [{ left: 0, top: 0, width: 10, height: 10 }],
    { left: 0, top: 0, width: 2000, height: 2000 },
  );
  assert.equal(result.dx, 0);
  assert.equal(result.dy, 0);
  assert.equal(result.guides.length, 0);
});

test("auto-scroll accelerates near an edge and rests in the middle", () => {
  assert.equal(geo.autoScrollSpeed(500, 0, 1000), 0, "middle is still");
  assert.ok(geo.autoScrollSpeed(10, 0, 1000) < 0, "near the top scrolls up");
  assert.ok(geo.autoScrollSpeed(990, 0, 1000) > 0, "near the bottom scrolls down");
  assert.ok(
    Math.abs(geo.autoScrollSpeed(0, 0, 1000)) > Math.abs(geo.autoScrollSpeed(50, 0, 1000)),
    "closer to the edge is faster",
  );
});
