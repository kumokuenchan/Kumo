import type {
  QueryCondition,
  ComparisonOperator,
  LogicalOperator,
} from '../../types/queryBuilder';

interface WhereClauseBuilderProps {
  conditions: QueryCondition[];
  onChange: (conditions: QueryCondition[]) => void;
  availableColumns: string[]; // Array of table.column format
}

const comparisonOperators: ComparisonOperator[] = [
  '=',
  '!=',
  '<',
  '>',
  '<=',
  '>=',
  'LIKE',
  'IN',
  'NOT IN',
  'IS NULL',
  'IS NOT NULL',
  'BETWEEN',
];

const logicalOperators: LogicalOperator[] = ['AND', 'OR'];

export default function WhereClauseBuilder({
  conditions,
  onChange,
  availableColumns,
}: WhereClauseBuilderProps) {
  const addCondition = () => {
    const newCondition: QueryCondition = {
      column: availableColumns[0] || '',
      operator: '=',
      value: '',
      logicalOperator: conditions.length > 0 ? 'AND' : undefined,
    };
    onChange([...conditions, newCondition]);
  };

  const updateCondition = (index: number, updates: Partial<QueryCondition>) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    onChange(newConditions);
  };

  const removeCondition = (index: number) => {
    const newConditions = conditions.filter((_, i) => i !== index);
    // Remove logicalOperator from first condition if it exists
    if (newConditions.length > 0) {
      newConditions[0] = { ...newConditions[0], logicalOperator: undefined };
    }
    onChange(newConditions);
  };

  const needsValueInput = (operator: ComparisonOperator) => {
    return !['IS NULL', 'IS NOT NULL'].includes(operator);
  };

  const needsMultipleValues = (operator: ComparisonOperator) => {
    return ['IN', 'NOT IN', 'BETWEEN'].includes(operator);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-700">WHERE Conditions</h3>
        <button
          onClick={addCondition}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          disabled={availableColumns.length === 0}
        >
          + Add Condition
        </button>
      </div>

      {conditions.length === 0 ? (
        <div className="text-sm text-gray-500 p-4 border border-dashed border-gray-300 rounded text-center">
          No WHERE conditions. Click "Add Condition" to add one.
        </div>
      ) : (
        <div className="space-y-2">
          {conditions.map((condition, index) => (
            <div key={index} className="border border-gray-300 rounded p-3 bg-white">
              {/* Logical Operator (for conditions after the first) */}
              {index > 0 && (
                <div className="mb-2">
                  <select
                    value={condition.logicalOperator || 'AND'}
                    onChange={(e) =>
                      updateCondition(index, {
                        logicalOperator: e.target.value as LogicalOperator,
                      })
                    }
                    className="text-sm font-semibold text-blue-600 border-0 bg-transparent"
                  >
                    {logicalOperators.map((op) => (
                      <option key={op} value={op}>
                        {op}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-12 gap-2 items-start">
                {/* Column Selection */}
                <div className="col-span-4">
                  <label className="text-xs text-gray-600 block mb-1">Column</label>
                  <select
                    value={condition.column}
                    onChange={(e) => updateCondition(index, { column: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    {availableColumns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Operator Selection */}
                <div className="col-span-3">
                  <label className="text-xs text-gray-600 block mb-1">Operator</label>
                  <select
                    value={condition.operator}
                    onChange={(e) => {
                      const newOperator = e.target.value as ComparisonOperator;
                      updateCondition(index, { operator: newOperator });
                    }}
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    {comparisonOperators.map((op) => (
                      <option key={op} value={op}>
                        {op}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Value Input */}
                <div className="col-span-4">
                  <label className="text-xs text-gray-600 block mb-1">Value</label>
                  {needsValueInput(condition.operator) ? (
                    needsMultipleValues(condition.operator) ? (
                      <input
                        type="text"
                        value={condition.values?.join(', ') || ''}
                        onChange={(e) => {
                          const values = e.target.value.split(',').map((v) => v.trim());
                          updateCondition(index, { values });
                        }}
                        placeholder={
                          condition.operator === 'BETWEEN' ? 'min, max' : 'value1, value2, ...'
                        }
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                      />
                    ) : (
                      <input
                        type="text"
                        value={condition.value || ''}
                        onChange={(e) => updateCondition(index, { value: e.target.value })}
                        placeholder="Enter value"
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                      />
                    )
                  ) : (
                    <div className="text-sm text-gray-400 py-1">N/A</div>
                  )}
                </div>

                {/* Remove Button */}
                <div className="col-span-1 flex items-end">
                  <button
                    onClick={() => removeCondition(index)}
                    className="w-full h-[30px] bg-red-500 text-white rounded hover:bg-red-600 text-sm font-bold"
                    title="Remove condition"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
