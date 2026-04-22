"use client";

interface LoadingIndicatorProps {
  /** Text to display alongside the animation. */
  text?: string;
}

/**
 * Animated loading indicator shown while the AI agent is processing.
 *
 * Requisitos: 4.3
 */
export function LoadingIndicator({
  text = "Analisando...",
}: LoadingIndicatorProps) {
  return (
    <div style={styles.container} role="status" aria-label={text}>
      <div style={styles.dots} aria-hidden="true">
        <span style={{ ...styles.dot, animationDelay: "0s" }}>●</span>
        <span style={{ ...styles.dot, animationDelay: "0.2s" }}>●</span>
        <span style={{ ...styles.dot, animationDelay: "0.4s" }}>●</span>
      </div>
      <span style={styles.text}>{text}</span>
      <style>{keyframes}</style>
    </div>
  );
}

const keyframes = `
@keyframes loadingPulse {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1); }
}
`;

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.75rem 1rem",
  },
  dots: {
    display: "flex",
    gap: "0.25rem",
  },
  dot: {
    fontSize: "0.5rem",
    color: "#a3a3a3",
    display: "inline-block",
    animation: "loadingPulse 1.2s infinite ease-in-out",
  },
  text: {
    fontSize: "0.8125rem",
    color: "#a3a3a3",
    fontStyle: "italic",
  },
};
