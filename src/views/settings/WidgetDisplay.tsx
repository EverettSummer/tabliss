import React from "react";
import {
  defaultWidgetFontSize,
  WidgetDisplay as WidgetDisplayType,
} from "../../db/state";
import PositionInput from "./PositionInput";
import "./WidgetDisplay.css";

type Props = {
  display: WidgetDisplayType;
  onChange: (display: Partial<WidgetDisplayType>) => void;
};

const WidgetDisplay: React.FC<Props> = ({ display, onChange }) => {
  const fontSize = display.fontSize ?? defaultWidgetFontSize;
  const scale = `${Math.round((fontSize / defaultWidgetFontSize) * 100)}%`;
  return (
    <div className="WidgetDisplay">
      <PositionInput
        value={display.position}
        onChange={(position) => onChange({ position })}
      />

      <label>
        Widget scale: {scale}
        <br />
        <input
          type="range"
          value={fontSize}
          aria-valuetext={scale}
          min="2"
          max="100"
          step="2"
          onChange={(event) =>
            onChange({ fontSize: Number(event.target.value) })
          }
        />
      </label>
    </div>
  );
};

export default WidgetDisplay;
