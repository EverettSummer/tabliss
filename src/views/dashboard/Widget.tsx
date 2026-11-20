import React from "react";
import { defaultWidgetFontSize, WidgetDisplay } from "../../db/state";

const Widget: React.FC<React.PropsWithChildren<WidgetDisplay>> = ({
  children,
  colour,
  fontFamily,
  fontSize = defaultWidgetFontSize,
  fontWeight,
}) => (
  <div
    className={`Widget ${fontWeight ? "weight-override" : ""}`}
    style={{
      color: colour,
      fontFamily,
      fontSize: `${fontSize}px`,
      fontWeight,
    }}
  >
    {children}
  </div>
);

export default Widget;
