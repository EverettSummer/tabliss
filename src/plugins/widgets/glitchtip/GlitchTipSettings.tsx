import React from "react";
import { instanceUrl, maxItems, Props } from "./api";

const GlitchTipSettings: React.FC<Props> = ({ cache, setCache }) => {
  const tokenInput = React.useRef<HTMLInputElement>(null);
  const [notice, setNotice] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [groupByIssue, setGroupByIssue] = React.useState(
    cache?.groupByIssue ?? false,
  );
  const [allProjects, setAllProjects] = React.useState(
    cache?.allProjects ?? false,
  );
  const [project, setProject] = React.useState(cache?.project ?? "");
  const eventLimit = cache?.limit ?? 5;
  const groupLimit = cache?.groupLimit ?? eventLimit;

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const field = (name: string) => String(form.get(name) ?? "").trim();
    setSaving(true);
    try {
      const url = instanceUrl(field("instance"));
      const token = field("token");
      if (!token) throw new Error("Enter a GlitchTip auth token.");
      if (BUILD_TARGET !== "web") {
        // Match patterns grant access to one host (all ports).
        const origins = [`${url.protocol}//${url.hostname}/*`];
        const allowed = await browser.permissions.request({ origins });
        if (!allowed)
          throw new Error(
            "Site access was not granted. Settings were not saved.",
          );
      }
      setCache({
        baseUrl: url.href,
        organization: field("organization"),
        project,
        token,
        limit: groupByIssue ? eventLimit : Number(field("limit")),
        groupLimit: groupByIssue ? Number(field("groupLimit")) : groupLimit,
        groupByIssue,
        allProjects: groupByIssue && allProjects,
      });
      setNotice("Settings saved.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not save settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} onChange={() => setNotice("")}>
      <label>
        Instance URL
        <input
          type="url"
          name="instance"
          placeholder="https://glitchtip.example.com"
          defaultValue={cache?.baseUrl}
          required
          onChange={() => {
            if (tokenInput.current) tokenInput.current.value = "";
          }}
        />
      </label>
      <label>
        Organization slug
        <input
          type="text"
          name="organization"
          pattern={"[a-zA-Z0-9_\\-]+"}
          defaultValue={cache?.organization}
          required
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={groupByIssue}
          onChange={(event) => setGroupByIssue(event.target.checked)}
        />
        Group events by issue
      </label>
      {groupByIssue && (
        <label>
          <input
            type="checkbox"
            name="allProjects"
            checked={allProjects}
            onChange={(event) => setAllProjects(event.target.checked)}
          />
          All projects in this organization
        </label>
      )}
      {!(groupByIssue && allProjects) && (
        <label>
          Project slug
          <input
            type="text"
            name="project"
            pattern={"[a-zA-Z0-9_\\-]+"}
            value={project}
            onChange={(event) => setProject(event.target.value)}
            required
          />
        </label>
      )}
      <label>
        Auth token
        <input
          type="password"
          name="token"
          autoComplete="off"
          ref={tokenInput}
          defaultValue={cache?.token}
          required
        />
      </label>
      <p className="info">
        Use a token with event:read access. Connection settings stay in this
        browser.
      </p>
      <label>
        {groupByIssue ? "Maximum issue groups" : "Maximum events"}
        <input
          key={groupByIssue ? "groups" : "events"}
          type="number"
          name={groupByIssue ? "groupLimit" : "limit"}
          min={1}
          max={maxItems}
          defaultValue={groupByIssue ? groupLimit : eventLimit}
          required
        />
      </label>
      {groupByIssue && (
        <p className="info">
          One row per distinct issue, up to {maxItems}. This limit is saved
          separately from the event limit.
        </p>
      )}
      <button className="button button--primary" disabled={saving}>
        Save
      </button>
      <p role="status">{notice}</p>
      <p>
        Add another GlitchTip Events widget for another project. Adjust each
        tracker under Display Settings → Widget scale.
      </p>
    </form>
  );
};

export default GlitchTipSettings;
