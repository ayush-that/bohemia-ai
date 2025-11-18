import * as React from "react";

function useCallbackRef<T extends (...args: never[]) => unknown>(
  callback: T | undefined
): T {
  const callbackRef = React.useRef(callback);

  React.useEffect(() => {
    callbackRef.current = callback;
  });

  return React.useMemo(
    () => ((...args) => callbackRef.current?.(...args)) as T,
    []
  );
}

export { useCallbackRef };
