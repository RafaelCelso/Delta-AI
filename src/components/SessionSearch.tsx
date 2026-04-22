"use client";

import { useState, useCallback } from "react";

interface SessionSearchProps {
  onSearch: (filters: SessionSearchFilters) => void;
}

export interface SessionSearchFilters {
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  documentName?: string;
}

/**
 * Search bar for filtering sessions by description, date range, or document name.
 *
 * Requisitos: 9.4
 */
export function SessionSearch({ onSearch }: SessionSearchProps) {
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      onSearch({
        q: q.trim() || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        documentName: documentName.trim() || undefined,
      });
    },
    [q, dateFrom, dateTo, documentName, onSearch],
  );

  const handleClear = useCallback(() => {
    setQ("");
    setDateFrom("");
    setDateTo("");
    setDocumentName("");
    onSearch({});
  }, [onSearch]);

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.mainRow}>
        <input
          type="text"
          placeholder="Buscar sessões..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={styles.input}
          aria-label="Buscar sessões por descrição"
        />
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          style={styles.filterToggle}
          aria-expanded={isExpanded}
          aria-label="Filtros avançados"
          title="Filtros avançados"
        >
          ⚙
        </button>
        <button type="submit" style={styles.searchBtn} aria-label="Buscar">
          Buscar
        </button>
      </div>

      {isExpanded && (
        <div style={styles.filtersRow}>
          <div style={styles.filterGroup}>
            <label style={styles.label} htmlFor="session-search-date-from">
              De
            </label>
            <input
              id="session-search-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={styles.dateInput}
            />
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.label} htmlFor="session-search-date-to">
              Até
            </label>
            <input
              id="session-search-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={styles.dateInput}
            />
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.label} htmlFor="session-search-doc-name">
              Documento
            </label>
            <input
              id="session-search-doc-name"
              type="text"
              placeholder="Nome do documento"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              style={styles.dateInput}
            />
          </div>
          <button
            type="button"
            onClick={handleClear}
            style={styles.clearBtn}
            aria-label="Limpar filtros"
          >
            Limpar
          </button>
        </div>
      )}
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    padding: "0.5rem",
  },
  mainRow: {
    display: "flex",
    gap: "0.375rem",
  },
  input: {
    flex: 1,
    padding: "0.375rem 0.625rem",
    fontSize: "0.8125rem",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    outline: "none",
    color: "#374151",
  },
  filterToggle: {
    padding: "0.375rem 0.5rem",
    fontSize: "0.875rem",
    backgroundColor: "#f3f4f6",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    cursor: "pointer",
    color: "#6b7280",
  },
  searchBtn: {
    padding: "0.375rem 0.75rem",
    fontSize: "0.8125rem",
    backgroundColor: "#0369a1",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: 500,
  },
  filtersRow: {
    display: "flex",
    gap: "0.5rem",
    flexWrap: "wrap" as const,
    alignItems: "flex-end",
  },
  filterGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.125rem",
  },
  label: {
    fontSize: "0.6875rem",
    color: "#6b7280",
    fontWeight: 500,
  },
  dateInput: {
    padding: "0.3rem 0.5rem",
    fontSize: "0.8125rem",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    outline: "none",
    color: "#374151",
  },
  clearBtn: {
    padding: "0.375rem 0.625rem",
    fontSize: "0.8125rem",
    backgroundColor: "transparent",
    color: "#6b7280",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    cursor: "pointer",
  },
};
