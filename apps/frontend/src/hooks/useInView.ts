import { useState, useEffect, useCallback, useRef } from "react";

interface UseInViewOptions extends IntersectionObserverInit {
  triggerOnce?: boolean;
  skip?: boolean;
  onIntersect?: () => void;
}

/**
 * A native implementation of the Intersection Observer hook.
 * Replaces the need for external libraries like react-intersection-observer.
 */
export function useInView({
  threshold = 0,
  root = null,
  rootMargin = "0px",
  triggerOnce = false,
  skip = false,
  onIntersect,
}: UseInViewOptions = {}) {
  const [inView, setInView] = useState(false);
  const [node, setNode] = useState<Element | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);

  const ref = useCallback((node: Element | null) => {
    setNode(node);
  }, []);

  useEffect(() => {
    if (skip || !node) return;

    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(
      ([entry]) => {
        const isElementInView = entry.isIntersecting;
        setInView(isElementInView);

        if (isElementInView) {
          onIntersect?.();
          if (triggerOnce && observer.current) {
            observer.current.unobserve(node);
            observer.current = null;
          }
        }
      },
      { threshold, root, rootMargin }
    );

    observer.current.observe(node);

    return () => {
      if (observer.current) observer.current.disconnect();
    };
  }, [node, threshold, root, rootMargin, triggerOnce, skip, onIntersect]);

  return { ref, inView };
}
