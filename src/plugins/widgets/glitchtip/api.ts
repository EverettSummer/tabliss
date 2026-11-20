import type { API } from "../../types";

export interface Connection {
  baseUrl: string;
  organization: string;
  project: string;
  token: string;
  limit: number;
  groupLimit?: number;
  groupByIssue?: boolean;
  allProjects?: boolean;
}

// Keep the token and its destination together in local storage, not synced data.
export type Props = API<unknown, Connection>;
export const maxItems = 50;

export function instanceUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Enter a full GlitchTip instance URL.");
  }
  const localHttp =
    url.protocol === "http:" &&
    ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !localHttp)
    throw new Error("Use HTTPS, or HTTP on localhost for testing.");
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.hostname.includes("*")
  )
    throw new Error(
      "Enter the instance URL without credentials, wildcards, a query or a fragment.",
    );
  return url;
}

export interface FeedItem {
  id: string;
  title: string;
  timestamp: string;
  link: string;
  count?: number;
  projectLabel?: string;
}

async function fetchPage(url: URL, token: string, signal: AbortSignal) {
  const response = await fetch(url.href, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    credentials: "omit",
    redirect: "error",
    cache: "no-store",
    signal,
  });
  if (response.status === 401 || response.status === 403)
    throw new Error("Access denied. Check the token and its event:read scope.");
  if (response.status === 404)
    throw new Error(
      "Not found. Check the instance URL, organization slug and selected project, if any.",
    );
  if (!response.ok)
    throw new Error(`GlitchTip returned HTTP ${response.status}.`);
  return response;
}

export async function fetchFeed(
  connection: Connection,
  signal: AbortSignal,
): Promise<FeedItem[]> {
  const { baseUrl, organization, project, token, groupByIssue } = connection;
  const limit =
    (groupByIssue ? connection.groupLimit : undefined) ?? connection.limit;
  const root = instanceUrl(baseUrl).href.replace(/\/+$/, "");
  const org = encodeURIComponent(organization);
  const endpoint = groupByIssue ? "issues" : "events";
  const allProjects = groupByIssue && connection.allProjects;
  const url = new URL(
    allProjects
      ? `${root}/api/0/organizations/${org}/issues/`
      : `${root}/api/0/projects/${org}/${encodeURIComponent(project)}/${endpoint}/`,
  );
  url.searchParams.set("limit", String(limit));
  if (groupByIssue) url.searchParams.set("sort", "-last_seen");
  const first = await fetchPage(url, token, signal);
  const items: unknown = await first.json();
  if (!Array.isArray(items))
    throw new Error(
      `Expected ${groupByIssue ? "an issue" : "an event"} list from GlitchTip.`,
    );

  // Some instances cap page size below the requested group limit.
  let page = first;
  const cursors = new Set<string>();
  while (groupByIssue && items.length < limit) {
    const next = page.headers
      .get("Link")
      ?.split(/,\s*(?=<)/)
      .find(
        (link) =>
          link.includes('rel="next"') && link.includes('results="true"'),
      );
    if (!next) break;
    const cursor = /;\s*cursor="([^"]+)"/.exec(next)?.[1];
    if (!cursor || cursors.has(cursor))
      throw new Error("GlitchTip returned an invalid issue page cursor.");
    cursors.add(cursor);
    // Reuse the configured endpoint, never send credentials to a Link URL.
    url.searchParams.set("cursor", cursor);
    page = await fetchPage(url, token, signal);
    const more: unknown = await page.json();
    if (!Array.isArray(more))
      throw new Error("Expected another page of issues from GlitchTip.");
    if (more.length === 0) break;
    items.push(...more.slice(0, limit - items.length));
  }
  const issuesUrl = `${root}/${org}/issues`;
  return items.slice(0, limit).map((item) => {
    if (groupByIssue) {
      const count =
        typeof item?.count === "string" && /^\d+$/.test(item.count)
          ? Number(item.count)
          : item?.count;
      if (
        typeof item?.id !== "string" ||
        typeof item.title !== "string" ||
        typeof item.lastSeen !== "string" ||
        !Number.isFinite(Date.parse(item.lastSeen)) ||
        !Number.isSafeInteger(count) ||
        count < 0
      )
        throw new Error("GlitchTip returned an invalid issue.");
      const projectLabel = allProjects
        ? item.project?.slug || item.project?.name
        : undefined;
      if (allProjects && (typeof projectLabel !== "string" || !projectLabel))
        throw new Error("GlitchTip returned an issue without a project name.");
      return {
        id: item.id,
        title: item.title || item.id,
        timestamp: item.lastSeen,
        link: `${issuesUrl}/${encodeURIComponent(item.id)}`,
        count,
        projectLabel,
      };
    }
    if (
      !item ||
      typeof item.id !== "string" ||
      typeof item.groupID !== "string" ||
      typeof item.title !== "string" ||
      typeof item.message !== "string" ||
      typeof item.dateReceived !== "string" ||
      !Number.isFinite(Date.parse(item.dateReceived))
    )
      throw new Error("GlitchTip returned an invalid event.");
    return {
      id: item.id,
      title: item.title || item.message || item.id,
      timestamp: item.dateReceived,
      link: `${issuesUrl}/${encodeURIComponent(item.groupID)}/events/${encodeURIComponent(item.id)}`,
    };
  });
}
