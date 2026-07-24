import { useRef, useEffect } from "react";
import "../styles/splitlayout.css";

export default function SplitLayout({ leftContent, rightContent, className = "" }) {
  const leftRef = useRef(null);

  useEffect(() => {
    if (leftRef.current) {
      leftRef.current.scrollTop = 0;
    }
  }, [leftContent]);

  return (
    <div className={`sl-wrap ${className}`}>
      {/* Map fills entire right side AND extends behind left panel */}
      <div className="sl-map-layer">
        {rightContent}
      </div>

      {/* Left panel scrolls independently, transparent to show map behind */}
      <div className="sl-left" ref={leftRef}>
        {leftContent}
      </div>
    </div>
  );
}
