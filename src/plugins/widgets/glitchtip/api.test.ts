import { Connection, fetchFeed, instanceUrl } from "./api";

const connection: Connection = {
  baseUrl: "https://errors.example.org/monitor/",
  organization: "acme",
  project: "store",
  limit: 2,
  token: "test-token",
};
const signal = new AbortController().signal;
afterEach(() => jest.restoreAllMocks());

test("requests N project events, preserving newest-first order and repeated issues", async () => {
  const events = ["third", "second", "first"].map((id) => ({
    id,
    title: "",
    message: `Error ${id}`,
    groupID: "42",
    dateReceived: "2025-01-01T10:00:00Z",
  }));
  const request = jest
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(Response.json(events));
  const result = await fetchFeed(connection, signal);
  expect(result.map(({ title }) => title)).toEqual([
    "Error third",
    "Error second",
  ]);
  expect(result[0].link).toBe(
    "https://errors.example.org/monitor/acme/issues/42/events/third",
  );
  expect(request).toHaveBeenCalledWith(
    "https://errors.example.org/monitor/api/0/projects/acme/store/events/?limit=2",
    expect.objectContaining({
      headers: expect.objectContaining({ Authorization: "Bearer test-token" }),
      redirect: "error",
      signal,
    }),
  );
});

test("lists the N latest project issues with their server counts, last-seen times and issue links", async () => {
  const issues = ["42", "38", "1"].map((id, i) => ({
    id,
    title: "Same error title",
    count: ["120", "1", "3"][i],
    lastSeen: `2025-01-0${3 - i}T10:00:00Z`,
  }));
  const request = jest
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(Response.json(issues));
  const result = await fetchFeed({ ...connection, groupByIssue: true }, signal);
  expect(result).toEqual(
    issues.slice(0, 2).map((issue) => ({
      id: issue.id,
      title: issue.title,
      timestamp: issue.lastSeen,
      count: Number(issue.count),
      link: `https://errors.example.org/monitor/acme/issues/${issue.id}`,
    })),
  );
  const url = new URL(String(request.mock.calls[0][0]));
  expect(url.pathname).toBe("/monitor/api/0/projects/acme/store/issues/");
  expect(url.searchParams.get("sort")).toBe("-last_seen");
  expect(url.searchParams.get("limit")).toBe("2");
});

test("distinguishes no events from a denied token or malformed response", async () => {
  jest
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(Response.json([]))
    .mockResolvedValueOnce(new Response(null, { status: 403 }))
    .mockResolvedValueOnce(Response.json({ detail: "Not an event list" }));
  await expect(fetchFeed(connection, signal)).resolves.toEqual([]);
  await expect(fetchFeed(connection, signal)).rejects.toThrow("Access denied");
  await expect(fetchFeed(connection, signal)).rejects.toThrow(
    "Expected an event list",
  );
});

test("lists the organization's most recent issue groups in one feed with a shared limit", async () => {
  const issues = [
    { id: "42", project: { slug: "shop", name: "Shop" } },
    { id: "17", project: { slug: null, name: "Job runner" } },
    { id: "11", project: { slug: "shop", name: "Shop" } },
  ].map((issue, i) => ({
    ...issue,
    title: "Timeout",
    count: "15",
    lastSeen: `2025-01-0${3 - i}T10:00:00Z`,
  }));
  const request = jest
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(Response.json(issues));
  const rows = await fetchFeed(
    {
      ...connection,
      project: "",
      groupByIssue: true,
      allProjects: true,
      groupLimit: 2,
    },
    signal,
  );
  expect(request).toHaveBeenCalledTimes(1);
  expect(request.mock.calls[0][0]).toBe(
    "https://errors.example.org/monitor/api/0/organizations/acme/issues/?limit=2&sort=-last_seen",
  );
  expect(rows.map((row) => [row.projectLabel, row.link])).toEqual([
    ["shop", "https://errors.example.org/monitor/acme/issues/42"],
    ["Job runner", "https://errors.example.org/monitor/acme/issues/17"],
  ]);
});

test("applies the separate group limit across short API pages", async () => {
  const issues = Array.from({ length: 6 }, (_, index) => ({
    id: String(index),
    title: `Issue ${index}`,
    lastSeen: "2025-01-03T10:00:00Z",
    count: "20",
  }));
  const request = jest
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      Response.json(issues.slice(0, 3), {
        headers: {
          Link: '<https://other.example.org/>; rel="next"; results="true"; cursor="page:2"',
        },
      }),
    )
    .mockResolvedValueOnce(Response.json(issues.slice(3)))
    .mockResolvedValueOnce(Response.json([]));
  const tracker = { ...connection, groupLimit: 5 };
  const result = await fetchFeed({ ...tracker, groupByIssue: true }, signal);
  expect(result.map((item) => item.id)).toEqual(["0", "1", "2", "3", "4"]);
  const endpoint =
    "https://errors.example.org/monitor/api/0/projects/acme/store/";
  expect(request.mock.calls[0][0]).toBe(
    `${endpoint}issues/?limit=5&sort=-last_seen`,
  );
  expect(request.mock.calls[1][0]).toBe(
    `${endpoint}issues/?limit=5&sort=-last_seen&cursor=page%3A2`,
  );
  await fetchFeed(tracker, signal);
  expect(request.mock.calls[2][0]).toBe(`${endpoint}events/?limit=2`);
});

test.each([
  "http://errors.example.org",
  "https://*.example.org",
  "https://user:pw@example.org",
])("rejects unsafe instance URL %s before requesting access", (url) =>
  expect(() => instanceUrl(url)).toThrow(),
);
