"use client";

import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { HomeView } from "../components/HomeView";
import { ResultsView } from "../components/ResultsView";
import { TrainingView } from "../components/TrainingView";
import type { NewsletterContent } from "../content/types";

type PreviewPage = "home" | "training" | "results";

// ---- Small field helpers -------------------------------------------------

function Text({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "url";
}) {
  return (
    <div className="editor-field">
      <label>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function Area({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="editor-field">
      <label>{label}</label>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="editor-check">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

function List<T>({
  items,
  setItems,
  blank,
  addLabel,
  itemTitle,
  children,
}: {
  items: T[];
  setItems: (items: T[]) => void;
  blank: T;
  addLabel: string;
  itemTitle: (index: number) => string;
  children: (
    item: T,
    index: number,
    patch: (mutator: (item: T) => void) => void,
    set: (item: T) => void,
  ) => ReactNode;
}) {
  const move = (index: number, direction: number) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
  };
  const remove = (index: number) => setItems(items.filter((_, i) => i !== index));
  const add = () => setItems([...items, structuredClone(blank)]);
  const patch = (index: number, mutator: (item: T) => void) => {
    const next = structuredClone(items);
    mutator(next[index]);
    setItems(next);
  };
  const set = (index: number, item: T) => {
    const next = [...items];
    next[index] = item;
    setItems(next);
  };

  return (
    <>
      {items.map((item, index) => (
        <div className="editor-item" key={index}>
          <div className="editor-item__head">
            <span className="editor-item__title">{itemTitle(index)}</span>
            <div className="editor-item__tools">
              <button
                type="button"
                className="editor-mini"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                className="editor-mini"
                onClick={() => move(index, 1)}
                disabled={index === items.length - 1}
                aria-label="Move down"
              >
                ↓
              </button>
              <button
                type="button"
                className="editor-mini editor-mini--danger"
                onClick={() => remove(index)}
              >
                Remove
              </button>
            </div>
          </div>
          {children(
            item,
            index,
            (mutator) => patch(index, mutator),
            (value) => set(index, value),
          )}
        </div>
      ))}
      <button type="button" className="editor-add" onClick={add}>
        {addLabel}
      </button>
    </>
  );
}

function Section({
  title,
  children,
  open = false,
}: {
  title: string;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details className="editor-section" open={open}>
      <summary>{title}</summary>
      <div className="editor-section__body">{children}</div>
    </details>
  );
}

// ---- Main editor ---------------------------------------------------------

export function Editor({
  initialDraft,
  initialPublished,
  userEmail,
}: {
  initialDraft: NewsletterContent;
  initialPublished: NewsletterContent;
  userEmail: string;
}) {
  const [content, setContent] = useState<NewsletterContent>(initialDraft);
  const [savedDraft, setSavedDraft] = useState<NewsletterContent>(initialDraft);
  const [published, setPublished] = useState<NewsletterContent>(initialPublished);
  const [previewPage, setPreviewPage] = useState<PreviewPage>("home");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("");

  const edit = useCallback((mutator: (draft: NewsletterContent) => void) => {
    setContent((prev) => {
      const next = structuredClone(prev);
      mutator(next);
      return next;
    });
  }, []);

  const isDirty = useMemo(
    () => JSON.stringify(content) !== JSON.stringify(savedDraft),
    [content, savedDraft],
  );
  const publishedIsCurrent = useMemo(
    () => JSON.stringify(published) === JSON.stringify(savedDraft) && !isDirty,
    [published, savedDraft, isDirty],
  );

  const request = useCallback(
    async (url: string, init?: RequestInit) => {
      const response = await fetch(url, {
        headers: { "content-type": "application/json" },
        ...init,
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        draft?: NewsletterContent;
        published?: NewsletterContent;
      };
      if (!response.ok) {
        throw new Error(data.error || `Request failed (${response.status})`);
      }
      return data;
    },
    [],
  );

  const saveDraft = useCallback(async () => {
    await request("/api/content", {
      method: "PUT",
      body: JSON.stringify(content),
    });
    setSavedDraft(content);
  }, [content, request]);

  const run = useCallback(
    async (task: () => Promise<void>, message: string) => {
      setBusy(true);
      setStatus("");
      try {
        await task();
        setStatus(message);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Something went wrong");
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const handleSave = () => run(saveDraft, "Draft saved.");

  const handlePublish = () =>
    run(async () => {
      await saveDraft();
      await request("/api/content/publish", { method: "POST" });
      setPublished(content);
    }, "Published — the live site is updated.");

  const handleUndo = () =>
    run(async () => {
      const data = await request("/api/content/reset", {
        method: "POST",
        body: JSON.stringify({ target: "published" }),
      });
      if (data.draft) {
        setContent(data.draft);
        setSavedDraft(data.draft);
      }
    }, "Reverted to the published version.");

  const handleResetDefaults = () => {
    if (
      !window.confirm(
        "Reset the draft to the original built-in content? Your unpublished edits will be discarded.",
      )
    ) {
      return;
    }
    return run(async () => {
      const data = await request("/api/content/reset", {
        method: "POST",
        body: JSON.stringify({ target: "defaults" }),
      });
      if (data.draft) {
        setContent(data.draft);
        setSavedDraft(data.draft);
      }
    }, "Draft reset to the original content.");
  };

  const handleCancel = () => {
    setContent(savedDraft);
    setStatus("Unsaved changes discarded.");
  };

  const openFullPreview = () =>
    run(async () => {
      await saveDraft();
      const path =
        previewPage === "home" ? "/edit/preview" : `/edit/preview/${previewPage}`;
      window.open(path, "_blank", "noopener");
    }, "Opened full-page preview.");

  const { shared, home, training, results } = content;

  return (
    <div className="editor-root">
      <div className="editor-bar">
        <div>
          <h1>Newsletter editor</h1>
          <div className="editor-bar__meta">Signed in as {userEmail}</div>
        </div>
        <div className="editor-bar__spacer" />
        {isDirty ? (
          <span className="editor-dirty">● Unsaved changes</span>
        ) : (
          <span className="editor-bar__status">
            {publishedIsCurrent ? "Published is up to date" : "Draft saved (not published)"}
          </span>
        )}
        {status ? <span className="editor-bar__status">{status}</span> : null}
        <button type="button" className="editor-btn" onClick={handleCancel} disabled={busy || !isDirty}>
          Cancel
        </button>
        <button type="button" className="editor-btn" onClick={handleUndo} disabled={busy}>
          Undo to published
        </button>
        <button type="button" className="editor-btn" onClick={handleResetDefaults} disabled={busy}>
          Reset to original
        </button>
        <button type="button" className="editor-btn" onClick={handleSave} disabled={busy || !isDirty}>
          Save draft
        </button>
        <button
          type="button"
          className="editor-btn editor-btn--primary"
          onClick={handlePublish}
          disabled={busy}
        >
          Publish
        </button>
      </div>

      <div className="editor-layout">
        <div className="editor-form">
          <Section title="Branding & navigation" open>
            <Text label="Brand name" value={shared.brandName} onChange={(v) => edit((c) => { c.shared.brandName = v; })} />
            <Text label="Brand tagline" value={shared.brandTagline} onChange={(v) => edit((c) => { c.shared.brandTagline = v; })} />
            <Text label="Detail-page back link" value={shared.detailBackLabel} onChange={(v) => edit((c) => { c.shared.detailBackLabel = v; })} />
            <Text label="Menu heading" value={shared.navHeading} onChange={(v) => edit((c) => { c.shared.navHeading = v; })} />
            <List
              items={shared.navLinks}
              setItems={(items) => edit((c) => { c.shared.navLinks = items; })}
              blank={{ label: "", href: "" }}
              addLabel="Add menu link"
              itemTitle={(i) => `Link ${i + 1}`}
            >
              {(item, _i, patch) => (
                <div className="editor-grid2">
                  <Text label="Label" value={item.label} onChange={(v) => patch((it) => { it.label = v; })} />
                  <Text label="Link (href)" value={item.href} onChange={(v) => patch((it) => { it.href = v; })} />
                </div>
              )}
            </List>
          </Section>

          <Section title="Home · Hero">
            <Text label="Kicker (date line)" value={home.hero.kicker} onChange={(v) => edit((c) => { c.home.hero.kicker = v; })} />
            <Text label="Headline" value={home.hero.headline} onChange={(v) => edit((c) => { c.home.hero.headline = v; })} />
            <Text type="url" label="Hero background image URL (blank = default)" value={home.heroImage} onChange={(v) => edit((c) => { c.home.heroImage = v; })} />
          </Section>

          <Section title="Home · This week at a glance">
            <Text label="Eyebrow" value={home.overview.eyebrow} onChange={(v) => edit((c) => { c.home.overview.eyebrow = v; })} />
            <Text label="Heading" value={home.overview.heading} onChange={(v) => edit((c) => { c.home.overview.heading = v; })} />
            <Area label="Intro" value={home.overview.intro} onChange={(v) => edit((c) => { c.home.overview.intro = v; })} />

            <div className="editor-item">
              <span className="editor-item__title">Action card</span>
              <Text label="Icon text" value={home.overview.actionCard.icon} onChange={(v) => edit((c) => { c.home.overview.actionCard.icon = v; })} />
              <Text label="Label" value={home.overview.actionCard.label} onChange={(v) => edit((c) => { c.home.overview.actionCard.label = v; })} />
              <Text label="Heading" value={home.overview.actionCard.heading} onChange={(v) => edit((c) => { c.home.overview.actionCard.heading = v; })} />
              <div className="editor-grid2">
                <Text label="Body (before bold date)" value={home.overview.actionCard.bodyPrefix} onChange={(v) => edit((c) => { c.home.overview.actionCard.bodyPrefix = v; })} />
                <Text label="Bold date" value={home.overview.actionCard.bodyEmphasis} onChange={(v) => edit((c) => { c.home.overview.actionCard.bodyEmphasis = v; })} />
              </div>
              <Text label="Micro copy" value={home.overview.actionCard.micro} onChange={(v) => edit((c) => { c.home.overview.actionCard.micro = v; })} />
              <div className="editor-grid2">
                <Text label="Link label" value={home.overview.actionCard.linkLabel} onChange={(v) => edit((c) => { c.home.overview.actionCard.linkLabel = v; })} />
                <Text label="Link (href)" value={home.overview.actionCard.linkHref} onChange={(v) => edit((c) => { c.home.overview.actionCard.linkHref = v; })} />
              </div>
            </div>

            <div className="editor-item">
              <span className="editor-item__title">Event card</span>
              <div className="editor-grid2">
                <Text label="Icon text" value={home.overview.eventCard.icon} onChange={(v) => edit((c) => { c.home.overview.eventCard.icon = v; })} />
                <Text label="Kicker" value={home.overview.eventCard.kicker} onChange={(v) => edit((c) => { c.home.overview.eventCard.kicker = v; })} />
              </div>
              <Text label="Title" value={home.overview.eventCard.title} onChange={(v) => edit((c) => { c.home.overview.eventCard.title = v; })} />
              <div className="editor-grid2">
                <Text label="Detail" value={home.overview.eventCard.detail} onChange={(v) => edit((c) => { c.home.overview.eventCard.detail = v; })} />
                <Text label="Link (href)" value={home.overview.eventCard.href} onChange={(v) => edit((c) => { c.home.overview.eventCard.href = v; })} />
              </div>
            </div>

            <div className="editor-item">
              <span className="editor-item__title">Recognition card</span>
              <div className="editor-grid2">
                <Text label="Icon text" value={home.overview.recognitionCard.icon} onChange={(v) => edit((c) => { c.home.overview.recognitionCard.icon = v; })} />
                <Text label="Kicker" value={home.overview.recognitionCard.kicker} onChange={(v) => edit((c) => { c.home.overview.recognitionCard.kicker = v; })} />
              </div>
              <Text label="Title" value={home.overview.recognitionCard.title} onChange={(v) => edit((c) => { c.home.overview.recognitionCard.title = v; })} />
              <div className="editor-grid2">
                <Text label="Detail" value={home.overview.recognitionCard.detail} onChange={(v) => edit((c) => { c.home.overview.recognitionCard.detail = v; })} />
                <Text label="Link (href)" value={home.overview.recognitionCard.href} onChange={(v) => edit((c) => { c.home.overview.recognitionCard.href = v; })} />
              </div>
            </div>
          </Section>

          <Section title="Home · June scorecard teaser">
            <Text label="Eyebrow" value={home.scorecard.eyebrow} onChange={(v) => edit((c) => { c.home.scorecard.eyebrow = v; })} />
            <Text label="Heading" value={home.scorecard.heading} onChange={(v) => edit((c) => { c.home.scorecard.heading = v; })} />
            <Area label="Intro" value={home.scorecard.intro} onChange={(v) => edit((c) => { c.home.scorecard.intro = v; })} />
            <div className="editor-grid2">
              <Text label="Result value" value={home.scorecard.resultValue} onChange={(v) => edit((c) => { c.home.scorecard.resultValue = v; })} />
              <Text label="Result unit" value={home.scorecard.resultUnit} onChange={(v) => edit((c) => { c.home.scorecard.resultUnit = v; })} />
            </div>
            <div className="editor-grid2">
              <Text label="Result label" value={home.scorecard.resultLabel} onChange={(v) => edit((c) => { c.home.scorecard.resultLabel = v; })} />
              <Text label="Result screen-reader text" value={home.scorecard.resultAria} onChange={(v) => edit((c) => { c.home.scorecard.resultAria = v; })} />
            </div>
            <div className="editor-grid2">
              <Text label="Focus label" value={home.scorecard.focusLabel} onChange={(v) => edit((c) => { c.home.scorecard.focusLabel = v; })} />
              <Text label="Focus value" value={home.scorecard.focusValue} onChange={(v) => edit((c) => { c.home.scorecard.focusValue = v; })} />
            </div>
            <div className="editor-grid2">
              <Text label="Button label" value={home.scorecard.buttonLabel} onChange={(v) => edit((c) => { c.home.scorecard.buttonLabel = v; })} />
              <Text label="Button link (href)" value={home.scorecard.buttonHref} onChange={(v) => edit((c) => { c.home.scorecard.buttonHref = v; })} />
            </div>
          </Section>

          <Section title="Home · Recognition">
            <Text label="Eyebrow" value={home.recognition.eyebrow} onChange={(v) => edit((c) => { c.home.recognition.eyebrow = v; })} />
            <Text label="Heading" value={home.recognition.heading} onChange={(v) => edit((c) => { c.home.recognition.heading = v; })} />
            <div className="editor-item">
              <span className="editor-item__title">Feature shout-out</span>
              <Text label="Heading" value={home.recognition.feature.heading} onChange={(v) => edit((c) => { c.home.recognition.feature.heading = v; })} />
              <Area label="Body" value={home.recognition.feature.body} onChange={(v) => edit((c) => { c.home.recognition.feature.body = v; })} />
            </div>
            <div className="editor-item">
              <span className="editor-item__title">Birthday</span>
              <div className="editor-grid2">
                <Text label="Kicker" value={home.recognition.birthday.kicker} onChange={(v) => edit((c) => { c.home.recognition.birthday.kicker = v; })} />
                <Text label="Name" value={home.recognition.birthday.name} onChange={(v) => edit((c) => { c.home.recognition.birthday.name = v; })} />
              </div>
              <Text label="Date" value={home.recognition.birthday.date} onChange={(v) => edit((c) => { c.home.recognition.birthday.date = v; })} />
            </div>
            <div className="editor-item">
              <span className="editor-item__title">Work anniversaries</span>
              <Text label="Kicker" value={home.recognition.anniversaries.kicker} onChange={(v) => edit((c) => { c.home.recognition.anniversaries.kicker = v; })} />
              <List
                items={home.recognition.anniversaries.entries}
                setItems={(items) => edit((c) => { c.home.recognition.anniversaries.entries = items; })}
                blank={{ name: "", detail: "" }}
                addLabel="Add anniversary"
                itemTitle={(i) => `Anniversary ${i + 1}`}
              >
                {(item, _i, patch) => (
                  <>
                    <Text label="Name · date" value={item.name} onChange={(v) => patch((it) => { it.name = v; })} />
                    <Text label="Detail" value={item.detail} onChange={(v) => patch((it) => { it.detail = v; })} />
                  </>
                )}
              </List>
            </div>
          </Section>

          <Section title="Home · What’s happening nearby">
            <Text label="Eyebrow" value={home.events.eyebrow} onChange={(v) => edit((c) => { c.home.events.eyebrow = v; })} />
            <Text label="Heading" value={home.events.heading} onChange={(v) => edit((c) => { c.home.events.heading = v; })} />
            <Area label="Intro" value={home.events.intro} onChange={(v) => edit((c) => { c.home.events.intro = v; })} />
            <List
              items={home.events.items}
              setItems={(items) => edit((c) => { c.home.events.items = items; })}
              blank={{ date: "", name: "" }}
              addLabel="Add event"
              itemTitle={(i) => `Event ${i + 1}`}
            >
              {(item, _i, patch) => (
                <>
                  <div className="editor-grid2">
                    <Text label="Date" value={item.date} onChange={(v) => patch((it) => { it.date = v; })} />
                    <Text label="Name" value={item.name} onChange={(v) => patch((it) => { it.name = v; })} />
                  </div>
                  <Check label="Featured (highlighted row)" checked={Boolean(item.featured)} onChange={(v) => patch((it) => { it.featured = v; })} />
                </>
              )}
            </List>
          </Section>

          <Section title="Home · Grow with us & footer">
            <Text label="Eyebrow" value={home.grow.eyebrow} onChange={(v) => edit((c) => { c.home.grow.eyebrow = v; })} />
            <Text label="Heading" value={home.grow.heading} onChange={(v) => edit((c) => { c.home.grow.heading = v; })} />
            <Area label="Body" value={home.grow.body} onChange={(v) => edit((c) => { c.home.grow.body = v; })} />
            <div className="editor-grid2">
              <Text label="Button label" value={home.grow.buttonLabel} onChange={(v) => edit((c) => { c.home.grow.buttonLabel = v; })} />
              <Text type="url" label="Button link (href)" value={home.grow.buttonHref} onChange={(v) => edit((c) => { c.home.grow.buttonHref = v; })} />
            </div>
            <Text label="Referral note (bold lead)" value={home.grow.referralStrong} onChange={(v) => edit((c) => { c.home.grow.referralStrong = v; })} />
            <Area label="Referral note (rest)" value={home.grow.referralRest} onChange={(v) => edit((c) => { c.home.grow.referralRest = v; })} />
            <div className="editor-grid2">
              <Text label="Footer brand" value={home.footer.brand} onChange={(v) => edit((c) => { c.home.footer.brand = v; })} />
              <Text label="Footer line" value={home.footer.line} onChange={(v) => edit((c) => { c.home.footer.line = v; })} />
            </div>
          </Section>

          <Section title="Training page">
            <Text label="Badge" value={training.badge} onChange={(v) => edit((c) => { c.training.badge = v; })} />
            <Text label="Heading" value={training.heading} onChange={(v) => edit((c) => { c.training.heading = v; })} />
            <Area label="Lead" value={training.lead} onChange={(v) => edit((c) => { c.training.lead = v; })} />
            <span className="editor-item__title">Status rows</span>
            <List
              items={training.statusRows}
              setItems={(items) => edit((c) => { c.training.statusRows = items; })}
              blank={{ token: "", tokenRed: false, label: "", strongPrefix: "", strongEmphasis: "" }}
              addLabel="Add status row"
              itemTitle={(i) => `Row ${i + 1}`}
            >
              {(item, _i, patch) => (
                <>
                  <div className="editor-grid2">
                    <Text label="Token" value={item.token} onChange={(v) => patch((it) => { it.token = v; })} />
                    <Text label="Label" value={item.label} onChange={(v) => patch((it) => { it.label = v; })} />
                  </div>
                  <div className="editor-grid2">
                    <Text label="Text (before emphasis)" value={item.strongPrefix} onChange={(v) => patch((it) => { it.strongPrefix = v; })} />
                    <Text label="Emphasized text" value={item.strongEmphasis} onChange={(v) => patch((it) => { it.strongEmphasis = v; })} />
                  </div>
                  <Check label="Red token" checked={item.tokenRed} onChange={(v) => patch((it) => { it.tokenRed = v; })} />
                </>
              )}
            </List>
            <div className="editor-grid2">
              <Text label="Primary button label" value={training.primaryButton.label} onChange={(v) => edit((c) => { c.training.primaryButton.label = v; })} />
              <Text type="url" label="Primary button link" value={training.primaryButton.href} onChange={(v) => edit((c) => { c.training.primaryButton.href = v; })} />
            </div>
            <div className="editor-grid2">
              <Text label="Help link label" value={training.helpLink.label} onChange={(v) => edit((c) => { c.training.helpLink.label = v; })} />
              <Text label="Help link (href)" value={training.helpLink.href} onChange={(v) => edit((c) => { c.training.helpLink.href = v; })} />
            </div>
            <div className="editor-item">
              <span className="editor-item__title">Scheduling alert</span>
              <Text label="Kicker" value={training.alert.kicker} onChange={(v) => edit((c) => { c.training.alert.kicker = v; })} />
              <Area label="Body" value={training.alert.body} onChange={(v) => edit((c) => { c.training.alert.body = v; })} />
            </div>
            <div className="editor-item">
              <span className="editor-item__title">What the training covers</span>
              <Text label="Eyebrow" value={training.covers.eyebrow} onChange={(v) => edit((c) => { c.training.covers.eyebrow = v; })} />
              <Text label="Heading" value={training.covers.heading} onChange={(v) => edit((c) => { c.training.covers.heading = v; })} />
              <List
                items={training.covers.items}
                setItems={(items) => edit((c) => { c.training.covers.items = items; })}
                blank={""}
                addLabel="Add checklist item"
                itemTitle={(i) => `Item ${i + 1}`}
              >
                {(item, _i, _patch, set) => (
                  <Text label="Text" value={item} onChange={(v) => set(v)} />
                )}
              </List>
            </div>
            <div className="editor-item">
              <span className="editor-item__title">Why it matters</span>
              <Text label="Eyebrow" value={training.why.eyebrow} onChange={(v) => edit((c) => { c.training.why.eyebrow = v; })} />
              <Text label="Heading" value={training.why.heading} onChange={(v) => edit((c) => { c.training.why.heading = v; })} />
              <List
                items={training.why.paragraphs}
                setItems={(items) => edit((c) => { c.training.why.paragraphs = items; })}
                blank={""}
                addLabel="Add paragraph"
                itemTitle={(i) => `Paragraph ${i + 1}`}
              >
                {(item, _i, _patch, set) => (
                  <Area label="Text" value={item} onChange={(v) => set(v)} />
                )}
              </List>
            </div>
            <div className="editor-item">
              <span className="editor-item__title">Need a hand?</span>
              <div className="editor-grid2">
                <Text label="Mark" value={training.help.mark} onChange={(v) => edit((c) => { c.training.help.mark = v; })} />
                <Text label="Heading" value={training.help.heading} onChange={(v) => edit((c) => { c.training.help.heading = v; })} />
              </div>
              <Area label="Body" value={training.help.body} onChange={(v) => edit((c) => { c.training.help.body = v; })} />
            </div>
          </Section>

          <Section title="Results page">
            <Text label="Eyebrow" value={results.eyebrow} onChange={(v) => edit((c) => { c.results.eyebrow = v; })} />
            <Text label="Heading" value={results.heading} onChange={(v) => edit((c) => { c.results.heading = v; })} />
            <Area label="Lead" value={results.lead} onChange={(v) => edit((c) => { c.results.lead = v; })} />
            <div className="editor-grid2">
              <Text label="Summary value" value={results.summaryValue} onChange={(v) => edit((c) => { c.results.summaryValue = v; })} />
              <Text label="Summary unit" value={results.summaryUnit} onChange={(v) => edit((c) => { c.results.summaryUnit = v; })} />
            </div>
            <div className="editor-grid2">
              <Text label="Summary label" value={results.summaryLabel} onChange={(v) => edit((c) => { c.results.summaryLabel = v; })} />
              <Text label="Summary screen-reader text" value={results.summaryAria} onChange={(v) => edit((c) => { c.results.summaryAria = v; })} />
            </div>
            <span className="editor-item__title">Headline metrics</span>
            <List
              items={results.headlineMetrics}
              setItems={(items) => edit((c) => { c.results.headlineMetrics = items; })}
              blank={{ label: "", value: "", goal: "", status: "", positive: true }}
              addLabel="Add headline metric"
              itemTitle={(i) => `Metric ${i + 1}`}
            >
              {(item, _i, patch) => (
                <>
                  <Text label="Label" value={item.label} onChange={(v) => patch((it) => { it.label = v; })} />
                  <div className="editor-grid2">
                    <Text label="Value" value={item.value} onChange={(v) => patch((it) => { it.value = v; })} />
                    <Text label="Goal" value={item.goal} onChange={(v) => patch((it) => { it.goal = v; })} />
                  </div>
                  <Text label="Status" value={item.status} onChange={(v) => patch((it) => { it.status = v; })} />
                  <Check label="On track (green)" checked={item.positive} onChange={(v) => patch((it) => { it.positive = v; })} />
                </>
              )}
            </List>
            <div className="editor-item">
              <span className="editor-item__title">This month’s focus</span>
              <Text label="Label" value={results.focus.label} onChange={(v) => edit((c) => { c.results.focus.label = v; })} />
              <Text label="Heading" value={results.focus.heading} onChange={(v) => edit((c) => { c.results.focus.heading = v; })} />
              <Area label="Body" value={results.focus.body} onChange={(v) => edit((c) => { c.results.focus.body = v; })} />
            </div>
            <div className="editor-item">
              <span className="editor-item__title">Three-month scorecard</span>
              <Text label="Eyebrow" value={results.scorecard.eyebrow} onChange={(v) => edit((c) => { c.results.scorecard.eyebrow = v; })} />
              <Text label="Heading" value={results.scorecard.heading} onChange={(v) => edit((c) => { c.results.scorecard.heading = v; })} />
              <div className="editor-grid2">
                <Text label="Column: measure" value={results.scorecard.headerMeasure} onChange={(v) => edit((c) => { c.results.scorecard.headerMeasure = v; })} />
                <Text label="Column: goal" value={results.scorecard.headerGoal} onChange={(v) => edit((c) => { c.results.scorecard.headerGoal = v; })} />
              </div>
              <div className="editor-grid2">
                <Text label="Column: Apr" value={results.scorecard.headerApr} onChange={(v) => edit((c) => { c.results.scorecard.headerApr = v; })} />
                <Text label="Column: May" value={results.scorecard.headerMay} onChange={(v) => edit((c) => { c.results.scorecard.headerMay = v; })} />
              </div>
              <Text label="Column: Jun" value={results.scorecard.headerJun} onChange={(v) => edit((c) => { c.results.scorecard.headerJun = v; })} />
              <List
                items={results.scorecard.rows}
                setItems={(items) => edit((c) => { c.results.scorecard.rows = items; })}
                blank={{ label: "", goal: "", april: "", may: "", june: "" }}
                addLabel="Add scorecard row"
                itemTitle={(i) => `Row ${i + 1}`}
              >
                {(item, _i, patch) => (
                  <>
                    <Text label="Measure" value={item.label} onChange={(v) => patch((it) => { it.label = v; })} />
                    <div className="editor-grid2">
                      <Text label="Goal" value={item.goal} onChange={(v) => patch((it) => { it.goal = v; })} />
                      <Text label="Apr" value={item.april} onChange={(v) => patch((it) => { it.april = v; })} />
                    </div>
                    <div className="editor-grid2">
                      <Text label="May" value={item.may} onChange={(v) => patch((it) => { it.may = v; })} />
                      <Text label="Jun" value={item.june} onChange={(v) => patch((it) => { it.june = v; })} />
                    </div>
                  </>
                )}
              </List>
            </div>
            <div className="editor-item">
              <span className="editor-item__title">Momentum note</span>
              <Text label="Heading" value={results.momentum.heading} onChange={(v) => edit((c) => { c.results.momentum.heading = v; })} />
              <Area label="Body" value={results.momentum.body} onChange={(v) => edit((c) => { c.results.momentum.body = v; })} />
            </div>
          </Section>
        </div>

        <div className="editor-preview">
          <div className="editor-preview__bar">
            <span className="editor-preview__label">Live preview</span>
            <button type="button" className={`editor-tab${previewPage === "home" ? " editor-tab--active" : ""}`} onClick={() => setPreviewPage("home")}>
              Home
            </button>
            <button type="button" className={`editor-tab${previewPage === "training" ? " editor-tab--active" : ""}`} onClick={() => setPreviewPage("training")}>
              Training
            </button>
            <button type="button" className={`editor-tab${previewPage === "results" ? " editor-tab--active" : ""}`} onClick={() => setPreviewPage("results")}>
              Results
            </button>
            <button type="button" className="editor-tab" onClick={openFullPreview} disabled={busy}>
              Open full page ↗
            </button>
          </div>
          <div className="editor-preview__frame">
            <div className="editor-preview__stage">
              {previewPage === "home" ? <HomeView content={content} /> : null}
              {previewPage === "training" ? <TrainingView content={content} /> : null}
              {previewPage === "results" ? <ResultsView content={content} /> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
