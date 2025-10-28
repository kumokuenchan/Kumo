export interface ExplainRow {
  id: number;
  select_type: string;
  table: string | null;
  partitions: string | null;
  type: string | null;
  possible_keys: string | null;
  key: string | null;
  key_len: string | null;
  ref: string | null;
  rows: number | null;
  filtered: number | null;
  Extra: string | null;
}

export interface ExplainAnalysis {
  executionPlan: ExplainRow[];
  suggestions: string[];
  totalCost: {
    estimatedRows: number;
    tablesUsed: number;
    indexesUsed: number;
  };
  warnings: {
    type: 'warning' | 'error' | 'info';
    message: string;
  }[];
  executionTime: number;
}

export const queryAnalyzerApi = {
  /**
   * Analyze query performance using EXPLAIN
   */
  analyzeQuery: async (connectionId: string, sql: string): Promise<ExplainAnalysis> => {
    const response = await fetch(`/api/query/${connectionId}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || 'Failed to analyze query');
    }

    const data = await response.json();
    return data.analysis;
  },
};
