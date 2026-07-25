import { useRef, useEffect } from "react";
import "../styles/splitlayout.css";

export default function SplitLayout({ leftContent, rightContent, className = "" }) {
  const leftRef = useRef(null);

  useEffect(() => {
    const leftEl = leftRef.current;
    if (!leftEl) return;

    const handleWheel = (e) => {
      const { scrollTop, scrollHeight, clientHeight } = leftEl;
      const atBottom = scrollHeight - scrollTop <= clientHeight + 1;
      const atTop = scrollTop <= 1;

      if ((atBottom && e.deltaY > 0) || (atTop && e.deltaY < 0)) {
        return;
      }

      e.preventDefault();
      leftEl.scrollTop += e.deltaY;
    };

    leftEl.addEventListener("wheel", handleWheel, { passive: false });
    return () => leftEl.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <div className={`sl-wrap ${className}`}>
      <div className="sl-map-layer">
        {rightContent}
      </div>

      <div className="sl-left" ref={leftRef}>
        {leftContent}
      </div>
    </div>
  );
}
