# GlitchTip Events widget

In Tabliss settings, choose **Add a new widget → GlitchTip Events**. Open its settings
and enter your GlitchTip instance URL, organization slug, project slug, and the number
of events to show (1–50, default 5). In GlitchTip, create an auth token under
**Profile → Auth Tokens** with `event:read` access; use this token, not a project DSN.
Use HTTPS for the instance URL (HTTP on `localhost` or `127.0.0.1` also works).
Select **Save** and allow access to the configured site when prompted. Connection
settings are local to this browser and are not included in settings exports or sync.

Each new tab shows the latest individual events for that project, newest received
first. Select an event to open it in GlitchTip, or **Refresh** to update the open tab.
To see repeated errors together, enable **Group events by issue**, set **Maximum issue groups**
(1–50), and select **Save**. This limit is independent of **Maximum events**.
The widget lists up to that many distinct issues, most recently seen first. If GlitchTip
only returns three distinct issues for the project, increasing the limit won't create more.
Each row shows the issue's event count and opens its issue page.

For one combined feed, enable **Group events by issue → All projects in this organization**
and select **Save**. No project slug is required. Each issue is labeled with its project,
and **Maximum issue groups** applies once across all projects visible to your token.

To track another project, choose **Add a new widget → GlitchTip Events** again and
configure that project's connection. Each tracker has its own limits, position, and
**Display Settings → Widget scale**. Use a smaller scale to fit more rows, or use
**Position** to move a tracker away from the default top-right corner.
