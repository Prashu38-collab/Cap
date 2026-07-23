import React from "react";
import "../styles/splitlayout.css";

export default function SplitLayout({ leftContent, rightContent, className = "" }) {
  return (
    <div className={`sl-wrap ${className}`}>
      <div className="sl-left">
        {leftContent}
      </div>
      <div className="sl-right">
        <div className="sl-map-sticky">
          {rightContent}
        </div>
      </div>
    </div>
  );
}
