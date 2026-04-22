"use client";

import { useMemo } from "react";

/**
 * A single line in the diff output.
 */
interface DiffLine {
  type: "added" | "removed" | "unchanged";
  content: string;
}

interface DiffViewerProps {
  /** Original content before the proposed change. */
  originalContent: string;
  /** Proposed content with the change applied. */
  proposedContent: string;
  /** Section path for display context. */
  sectionPath?: string;
  /** Whether the AI could not generate a meaningful change. */
  noMeaningfulChange?: boolean;
}

/**
 * Computes a simple line-based diff between two text blocks.
 *
 * Uses a longest common subsequence (LCS) approach on lines to produce
 * a minimal diff with added (green), removed (red), and unchanged lines.
 */
function computeLineDiff(original: string, proposed: string): DiffLine[] {
  const originalLines = original.split("\n");
  const proposedLines = proposed.split("\n");

  // Build LCS table
  const m = originalLines.length;
  const n = proposedLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (originalLines[i - 1] === proposedLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build diff
  const result: DiffLine[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && originalLines[i - 1] === proposedLines[j - 1]) {
      result.unshift({ type: "unchanged", content: originalLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: "added", content: proposedLines[j - 1] });
      j--;
    } else {
      result.unshift({ type: "removed", content: originalLines[i - 1] });
      i--;
    }
  }

  return result;
}

const LINE_STYLES: Record<DiffLine["type"], React.CSSProperties> = {
  added: {
    backgroundColor: "#dcfce7",
    color: "#166534",
    borderLeft: "3px solid #22c55e",
  },
  removed: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    textDecoration: "line-through",
    borderLeft: "3px solid #ef4444",
  },
  unchanged: {
    backgroundColor: "transparent",
    color: "#374151",
    borderLeft: "3px solid transparent",
  },
};

const LINE_PREFIXES: Record<DiffLine["type"], string> = {
  added: "+ ",
  removed: "- ",
  unchanged: "  ",
};

/**
 * DiffViewer — Displays a visual diff between original and proposed content.
 *
 * Highlights additions in green, removals in red, and unchanged text in default color.
 * When the AI could not generate a meaningful change, shows the original content
 * with a warning message.
 *
 * Requisitos: 6.2, 6.6
 */
export function DiffViewer({
  originalContent,
  proposedContent,
  sectionPath,
  noMeaningfulChange = false,
}: DiffViewerProps) {
  const diffLines = useMemo(
    () => computeLineDiff(originalContent, proposedContent),
    [originalContent, proposedContent],
  );

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    for (const line of diffLines) {
      if (line.type === "added") added++;
      if (line.type === "removed") removed++;
    }
    return { added, removed };
  }, [diffLines]);

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        overflow: "hidden",
        fontSize: "0.8125rem",
        fontFamily: "monospace",
      }}
      role="region"
      aria-label={
        sectionPath
          ? `Diff da seção ${sectionPath}`
          : "Visualização de diferenças"
      }
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.5rem 0.75rem",
          backgroundColor: "#f9fafb",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <span
          style={{
            fontWeight: 600,
            color: "#374151",
            fontFamily: "sans-serif",
          }}
        >
          {sectionPath ?? "Alterações propostas"}
        </span>
        {!noMeaningfulChange && (
          <span
            style={{
              color: "#6b7280",
              fontFamily: "sans-serif",
              fontSize: "0.75rem",
            }}
          >
            <span style={{ color: "#22c55e" }}>+{stats.added}</span>
            {" / "}
            <span style={{ color: "#ef4444" }}>-{stats.removed}</span>
          </span>
        )}
      </div>

      {/* No meaningful change warning */}
      {noMeaningfulChange && (
        <div
          style={{
            padding: "0.75rem",
            backgroundColor: "#fefce8",
            borderBottom: "1px solid #fde68a",
            color: "#92400e",
            fontSize: "0.8125rem",
            fontFamily: "sans-serif",
          }}
          role="alert"
        >
          ⚠️ A IA não conseguiu gerar uma modificação significativa para esta
          seção. O conteúdo original é exibido abaixo. Edição manual pode ser
          necessária.
        </div>
      )}

      {/* Diff lines */}
      <div
        style={{
          maxHeight: "400px",
          overflowY: "auto",
          padding: "0.25rem 0",
        }}
      >
        {diffLines.map((line, index) => (
          <div
            key={index}
            style={{
              ...LINE_STYLES[line.type],
              padding: "0.125rem 0.75rem",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              lineHeight: "1.6",
            }}
          >
            <span style={{ opacity: 0.5, userSelect: "none" }}>
              {LINE_PREFIXES[line.type]}
            </span>
            {line.content || " "}
          </div>
        ))}
      </div>
    </div>
  );
}

export { computeLineDiff };
export type { DiffLine };
