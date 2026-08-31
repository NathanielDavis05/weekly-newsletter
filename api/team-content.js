// Backs the /edit form for the cfawestbryan.com landing page.
//
// The landing page is a static export (see scripts/build-landing.mjs) — there
// is no database, so "saving" an edit means committing the updated JSON back
// to GitHub. That push is what triggers Vercel to rebuild and redeploy, the
// same as pushing from a laptop would.
//
// GET  returns the live content (read straight from GitHub, so it always
//      reflects the last successful save, even if this function's own
//      deployment is stale).
// POST writes new content. Requires the `x-edit-passcode` header to match the
//      EDIT_PASSCODE environment variable, and a GITHUB_TOKEN environment
//      variable (a fine-grained PAT with contents:write on this repo) to make
//      the commit — see README setup notes.

const OWNER = "NathanielDavis05";
const REPO = "weekly-newsletter";
const BRANCH = "main";
const PATH = "app/team/site-content.json";

const REQUIRED_SECTIONS = [
  "meta",
  "brand",
  "nav",
  "hero",
  "quickLinks",
  "findSection",
  "cards",
  "newTeamMember",
  "scorecardSection",
  "moreGrid",
  "footer",
  "links",
];

async function readFromGitHub() {
  const resp = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}?ref=${BRANCH}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
    },
  );
  if (!resp.ok) {
    throw new Error(`GitHub read failed: ${resp.status} ${await resp.text()}`);
  }
  const data = await resp.json();
  const json = JSON.parse(Buffer.from(data.content, "base64").toString("utf8"));
  return { json, sha: data.sha };
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateShape(content) {
  if (!isPlainObject(content)) return "Content must be an object.";
  for (const key of REQUIRED_SECTIONS) {
    if (!isPlainObject(content[key])) return `Missing or invalid "${key}" section.`;
  }
  return null;
}

export default async function handler(req, res) {
  if (!process.env.GITHUB_TOKEN) {
    res.status(500).json({ error: "Server is not configured with GITHUB_TOKEN yet." });
    return;
  }

  if (req.method === "GET") {
    try {
      const { json } = await readFromGitHub();
      res.status(200).json(json);
    } catch (err) {
      res.status(502).json({ error: String(err.message || err) });
    }
    return;
  }

  if (req.method === "POST") {
    if (!process.env.EDIT_PASSCODE) {
      res.status(500).json({ error: "Server is not configured with EDIT_PASSCODE yet." });
      return;
    }
    const passcode = req.headers["x-edit-passcode"];
    if (!passcode || passcode !== process.env.EDIT_PASSCODE) {
      res.status(401).json({ error: "Wrong passcode." });
      return;
    }

    const updated = req.body;
    const shapeError = validateShape(updated);
    if (shapeError) {
      res.status(400).json({ error: shapeError });
      return;
    }

    try {
      const { sha } = await readFromGitHub();
      const commitResp = await fetch(
        `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: "Update landing page content via /edit",
            content: Buffer.from(JSON.stringify(updated, null, 2) + "\n").toString("base64"),
            sha,
            branch: BRANCH,
          }),
        },
      );
      if (!commitResp.ok) {
        const detail = await commitResp.text();
        res.status(502).json({ error: `GitHub commit failed: ${detail}` });
        return;
      }
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(502).json({ error: String(err.message || err) });
    }
    return;
  }

  res.setHeader("Allow", "GET, POST");
  res.status(405).json({ error: "Method not allowed" });
}
