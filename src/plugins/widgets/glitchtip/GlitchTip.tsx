import React from "react";
import { FormattedDate, FormattedNumber, FormattedTime } from "react-intl";
import { FeedItem, fetchFeed, Props } from "./api";
import "./GlitchTip.css";

const GlitchTip: React.FC<Props> = ({ cache }) => {
  const [result, setResult] = React.useState<FeedItem[] | string>();
  const [refresh, setRefresh] = React.useState(0);
  const itemName = cache?.groupByIssue ? "issues" : "events";
  const allProjects = cache?.groupByIssue && cache.allProjects;

  React.useEffect(() => {
    if (!cache) return;
    const controller = new AbortController();
    setResult(undefined);
    fetchFeed(cache, controller.signal).then(
      (items) => {
        if (!controller.signal.aborted) setResult(items);
      },
      (error: unknown) => {
        if (!controller.signal.aborted)
          setResult(
            error instanceof TypeError
              ? "Cannot reach GlitchTip. Check the instance URL and site access."
              : error instanceof SyntaxError
                ? "Expected a JSON response from GlitchTip."
                : error instanceof Error
                  ? error.message
                  : `Could not load ${itemName}.`,
          );
      },
    );
    return () => controller.abort();
  }, [cache, refresh, itemName]);

  return (
    <section className="GlitchTip" aria-label={`GlitchTip ${itemName}`}>
      <h4>
        GlitchTip
        {cache &&
          `: ${allProjects ? `${cache.organization} (all projects)` : cache.project}`}
      </h4>
      {!cache ? (
        <p>Connect to GlitchTip in the widget settings.</p>
      ) : result === undefined ? (
        <p role="status">Loading {itemName}...</p>
      ) : typeof result === "string" ? (
        <p role="status">{result}</p>
      ) : result.length === 0 ? (
        <p>
          No {itemName} in this {allProjects ? "organization" : "project"}.
        </p>
      ) : (
        <ol>
          {result.map(({ id, link, timestamp, title, count, projectLabel }) => (
            <li key={id}>
              <a href={link} target="_blank" rel="noopener noreferrer">
                {title}
              </a>
              <div className="details">
                {projectLabel && <>{projectLabel} · </>}
                {count !== undefined && (
                  <>
                    <FormattedNumber value={count} />{" "}
                    {count === 1 ? "event" : "events"} · Last seen{" "}
                  </>
                )}
                <time dateTime={timestamp}>
                  <FormattedDate value={timestamp} />{" "}
                  <FormattedTime value={timestamp} />
                </time>
              </div>
            </li>
          ))}
        </ol>
      )}
      {cache && result !== undefined && (
        <button type="button" onClick={() => setRefresh(refresh + 1)}>
          Refresh
        </button>
      )}
    </section>
  );
};

export default GlitchTip;
