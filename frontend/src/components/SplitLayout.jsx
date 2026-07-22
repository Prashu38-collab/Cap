import { useRef, useEffect } from "react";

export default function SplitLayout({ left, right, leftClassName = "" }) {
  const leftRef = useRef(null);

  useEffect(() => {
    if (leftRef.current) {
      leftRef.current.scrollTop = 0;
    }
  }, [left]);

  return (
    <div className="split-layout">
      <div className={`split-left ${leftClassName}`} ref={leftRef}>
        {left}
      </div>
      <div className="split-right">
        {right}
      </div>
    </div>
  );
}
