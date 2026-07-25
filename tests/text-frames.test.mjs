import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

register("./ts-resolve-loader.mjs", import.meta.url);

const { defaultVisualDocument, styleForTextFrame, visualDocument } = await import("../app/content/visual.ts");
const ops = await import("../app/edit/commands/documentOps.ts");

test("older documents gain an empty text-frame map", () => {
  const doc = defaultVisualDocument();
  delete doc.textFrames;
  assert.deepEqual(visualDocument({ visual: doc }).textFrames, {});
});

test("text frame geometry and appearance survive normalisation", () => {
  const doc = defaultVisualDocument();
  doc.textFrames["home.grow.heading"] = {
    color: "#112233",
    background: "#91d255",
    borderRadius: 20,
    rotation: -4,
    phone: { width: 120, minHeight: 44, x: 18, y: -7 },
  };
  const frame = visualDocument({ visual: doc }).textFrames["home.grow.heading"];
  assert.equal(frame.color, "#112233");
  assert.equal(frame.rotation, -4);
  assert.deepEqual(frame.phone, { width: 120, minHeight: 44, x: 18, y: -7 });
});

test("unsafe text-frame colours are discarded", () => {
  const doc = defaultVisualDocument();
  doc.textFrames["home.grow.heading"] = { color: "url(https://bad.example)" };
  assert.equal(visualDocument({ visual: doc }).textFrames["home.grow.heading"].color, undefined);
});

test("text-frame styles render responsive variables", () => {
  const css = styleForTextFrame({
    color: "#112233",
    rotation: 9,
    phone: { width: 80, x: 4 },
    desktop: { width: 50, y: 12 },
  });
  assert.equal(css.color, "#112233");
  assert.equal(css["--text-rotation"], "9deg");
  assert.equal(css["--text-phone-width"], "80%");
  assert.equal(css["--text-desktop-y"], "12px");
});

test("duplicating and deleting a free block carries and cleans its text frames", () => {
  const doc = defaultVisualDocument();
  const block = { id: "free-1", kind: "subsection", label: "Bonus", title: "Bonus" };
  doc.pages.home.items.push(block);
  doc.pages.home.rows.push({ id: "free-row", itemIds: [block.id], gap: 16, align: "stretch", keepColumnsOnPhone: false });
  doc.textFrames["free-1:richTitle"] = { rotation: 2, phone: { x: 10 } };

  const duplicate = ops.duplicateItem(doc, "home", "free-1");
  assert.ok(duplicate.newId);
  assert.deepEqual(duplicate.doc.textFrames[`${duplicate.newId}:richTitle`], doc.textFrames["free-1:richTitle"]);

  const removed = ops.removeItem(duplicate.doc, "home", duplicate.newId);
  assert.equal(removed.textFrames[`${duplicate.newId}:richTitle`], undefined);
});
