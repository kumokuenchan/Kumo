import { useState } from 'react';

interface QuerySnippetsPanelProps {
  onSelectSnippet: (sql: string, name: string) => void;
}

interface Snippet {
  id: string;
  name: string;
  description: string;
  sql: string;
  category: string;
}

const defaultSnippets: Snippet[] = [
  {
    id: 'select-basic',
    name: 'Basic SELECT',
    description: 'Simple SELECT query with WHERE clause',
    sql: 'SELECT * FROM table_name WHERE condition LIMIT 100;',
    category: 'Basic'
  },
  {
    id: 'insert-single',
    name: 'INSERT Single Row',
    description: 'Insert a single row into a table',
    sql: 'INSERT INTO table_name (column1, column2, column3)\nVALUES (value1, value2, value3);',
    category: 'Basic'
  },
  {
    id: 'update-basic',
    name: 'UPDATE',
    description: 'Update rows in a table',
    sql: 'UPDATE table_name\nSET column1 = value1, column2 = value2\nWHERE condition;',
    category: 'Basic'
  },
  {
    id: 'delete-basic',
    name: 'DELETE',
    description: 'Delete rows from a table',
    sql: 'DELETE FROM table_name WHERE condition;',
    category: 'Basic'
  },
  {
    id: 'inner-join',
    name: 'INNER JOIN',
    description: 'Join two tables',
    sql: 'SELECT t1.*, t2.*\nFROM table1 t1\nINNER JOIN table2 t2 ON t1.id = t2.table1_id\nWHERE condition;',
    category: 'Joins'
  },
  {
    id: 'left-join',
    name: 'LEFT JOIN',
    description: 'Left outer join',
    sql: 'SELECT t1.*, t2.*\nFROM table1 t1\nLEFT JOIN table2 t2 ON t1.id = t2.table1_id;',
    category: 'Joins'
  },
  {
    id: 'group-by',
    name: 'GROUP BY with COUNT',
    description: 'Count records by group',
    sql: 'SELECT column_name, COUNT(*) as count\nFROM table_name\nGROUP BY column_name\nORDER BY count DESC;',
    category: 'Aggregation'
  },
  {
    id: 'having-clause',
    name: 'GROUP BY with HAVING',
    description: 'Filter groups with HAVING clause',
    sql: 'SELECT column_name, COUNT(*) as count\nFROM table_name\nGROUP BY column_name\nHAVING count > 10\nORDER BY count DESC;',
    category: 'Aggregation'
  },
  {
    id: 'subquery-in',
    name: 'Subquery with IN',
    description: 'Filter using subquery',
    sql: 'SELECT *\nFROM table1\nWHERE id IN (\n  SELECT table1_id FROM table2 WHERE condition\n);',
    category: 'Advanced'
  },
  {
    id: 'cte-basic',
    name: 'Common Table Expression (CTE)',
    description: 'WITH clause for readable queries',
    sql: 'WITH cte_name AS (\n  SELECT column1, column2\n  FROM table_name\n  WHERE condition\n)\nSELECT *\nFROM cte_name\nWHERE another_condition;',
    category: 'Advanced'
  },
  {
    id: 'window-row-number',
    name: 'Window Function - ROW_NUMBER',
    description: 'Assign row numbers within partitions',
    sql: 'SELECT\n  column1,\n  column2,\n  ROW_NUMBER() OVER (PARTITION BY column1 ORDER BY column2 DESC) as row_num\nFROM table_name;',
    category: 'Window Functions'
  },
  {
    id: 'window-rank',
    name: 'Window Function - RANK',
    description: 'Rank rows within partitions',
    sql: 'SELECT\n  column1,\n  column2,\n  RANK() OVER (PARTITION BY column1 ORDER BY column2 DESC) as rank\nFROM table_name;',
    category: 'Window Functions'
  },
  {
    id: 'create-table',
    name: 'CREATE TABLE',
    description: 'Create a new table',
    sql: 'CREATE TABLE table_name (\n  id INT PRIMARY KEY AUTO_INCREMENT,\n  column1 VARCHAR(255) NOT NULL,\n  column2 TEXT,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);',
    category: 'DDL'
  },
  {
    id: 'alter-add-column',
    name: 'ALTER TABLE - Add Column',
    description: 'Add a new column to existing table',
    sql: 'ALTER TABLE table_name\nADD COLUMN new_column VARCHAR(255) DEFAULT NULL;',
    category: 'DDL'
  },
  {
    id: 'create-index',
    name: 'CREATE INDEX',
    description: 'Create an index on a table',
    sql: 'CREATE INDEX index_name\nON table_name (column1, column2);',
    category: 'DDL'
  },
  {
    id: 'transaction',
    name: 'Transaction',
    description: 'Execute multiple queries in a transaction',
    sql: 'START TRANSACTION;\n\n-- Your queries here\nUPDATE table1 SET column = value WHERE condition;\nINSERT INTO table2 (columns) VALUES (values);\n\nCOMMIT;\n-- Or use ROLLBACK; to undo changes',
    category: 'Transactions'
  }
];

export default function QuerySnippetsPanel({ onSelectSnippet }: QuerySnippetsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(defaultSnippets.map(s => s.category)))];

  const filteredSnippets = defaultSnippets.filter(snippet => {
    const matchesSearch = snippet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         snippet.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || snippet.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Query Snippets</h3>

        {/* Search */}
        <input
          type="text"
          placeholder="Search snippets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Category Filter */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 text-xs rounded-full whitespace-nowrap ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Snippets List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredSnippets.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">No snippets found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSnippets.map(snippet => (
              <button
                key={snippet.id}
                onClick={() => onSelectSnippet(snippet.sql, snippet.name)}
                className="w-full text-left p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition group"
              >
                <div className="flex items-start justify-between mb-1">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {snippet.name}
                  </h4>
                  <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                    {snippet.category}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{snippet.description}</p>
                <pre className="text-xs bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 p-2 rounded overflow-x-auto font-mono">
                  {snippet.sql.length > 100 ? snippet.sql.substring(0, 100) + '...' : snippet.sql}
                </pre>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
        {filteredSnippets.length} snippet{filteredSnippets.length !== 1 ? 's' : ''} available
      </div>
    </div>
  );
}
