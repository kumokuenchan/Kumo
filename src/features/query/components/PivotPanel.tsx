import { RefObject } from 'react';

interface PivotPanelProps {
  pivotData: any;
  allColumns: string[];
  pivotRow: string | null;
  setPivotRow: (value: string | null) => void;
  pivotCol: string | null;
  setPivotCol: (value: string | null) => void;
  pivotVal: string | null;
  setPivotVal: (value: string | null) => void;
  pivotAgg: 'count' | 'sum' | 'avg';
  setPivotAgg: (value: 'count' | 'sum' | 'avg') => void;
  chartType: 'bar' | 'vbar' | 'line' | 'heatmap' | 'pie';
  setChartType: (value: 'bar' | 'vbar' | 'line' | 'heatmap' | 'pie') => void;
  exportPivotPNG: () => void;
  setPivotFullScreen: (value: boolean) => void;
  pivotSort: 'none' | 'desc' | 'asc';
  setPivotSort: (value: 'none' | 'desc' | 'asc') => void;
  limitEnabled: boolean;
  setLimitEnabled: (value: boolean) => void;
  pieGroupSmall: boolean;
  setPieGroupSmall: (value: boolean) => void;
  pieMinPercent: number;
  setPieMinPercent: (value: number) => void;
  pieMaxCategories: number;
  setPieMaxCategories: (value: number) => void;
  hiddenPieLabels: Set<string>;
  setHiddenPieLabels: (value: Set<string>) => void;
  limitN: number;
  setLimitN: (value: number) => void;
  wrapLabels: boolean;
  setWrapLabels: (value: boolean) => void;
  rotateVBarLabels: boolean;
  setRotateVBarLabels: (value: boolean) => void;
  showBarValues: boolean;
  setShowBarValues: (value: boolean) => void;
  pivotRef: RefObject<HTMLDivElement>;
}

export default function PivotPanel({
  pivotData,
  allColumns,
  pivotRow,
  setPivotRow,
  pivotCol,
  setPivotCol,
  pivotVal,
  setPivotVal,
  pivotAgg,
  setPivotAgg,
  chartType,
  setChartType,
  exportPivotPNG,
  setPivotFullScreen,
  pivotSort,
  setPivotSort,
  limitEnabled,
  setLimitEnabled,
  pieGroupSmall,
  setPieGroupSmall,
  pieMinPercent,
  setPieMinPercent,
  pieMaxCategories,
  setPieMaxCategories,
  hiddenPieLabels,
  setHiddenPieLabels,
  limitN,
  setLimitN,
  wrapLabels,
  setWrapLabels,
  rotateVBarLabels,
  setRotateVBarLabels,
  showBarValues,
  setShowBarValues,
  pivotRef,
}: PivotPanelProps) {
  return (
    <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <label className="text-xs text-gray-500">Row</label>
        <select
          value={pivotRow || ''}
          onChange={(e) => setPivotRow(e.target.value || null)}
          className="px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
        >
          {allColumns.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className="text-xs text-gray-500">Column</label>
        <select
          value={pivotCol || ''}
          onChange={(e) => setPivotCol(e.target.value || null)}
          className="px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
        >
          {allColumns.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className="text-xs text-gray-500">Value</label>
        <select
          value={pivotVal || ''}
          onChange={(e) => setPivotVal(e.target.value || null)}
          className="px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
        >
          <option value="">(none)</option>
          {allColumns.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className="text-xs text-gray-500">Agg</label>
        <select
          value={pivotAgg}
          onChange={(e) => setPivotAgg(e.target.value as any)}
          className="px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
        >
          <option value="count">COUNT</option>
          <option value="sum">SUM</option>
          <option value="avg">AVG</option>
        </select>
        <label className="text-xs text-gray-500">Chart</label>
        <select
          value={chartType}
          onChange={(e) => setChartType(e.target.value as any)}
          className="px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
        >
          <option value="bar">Bar</option>
          <option value="vbar">Vertical Bar</option>
          <option value="line">Line</option>
          <option value="heatmap">Heatmap</option>
          <option value="pie">Pie</option>
        </select>
        <button
          onClick={exportPivotPNG}
          className="px-2 py-1 text-sm border rounded bg-white hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
          title="Download chart as PNG"
        >
          Download PNG
        </button>
        <button
          onClick={() => setPivotFullScreen(true)}
          className="px-2 py-1 text-sm border rounded bg-white hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
          title="View pivot chart in full screen"
        >
          Full Screen
        </button>
        <div className="mx-2 h-5 w-px bg-gray-300 dark:bg-gray-700" />
        <label className="text-xs text-gray-500">Sort</label>
        <select
          value={pivotSort}
          onChange={(e) => setPivotSort(e.target.value as any)}
          className="hidden px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
          title="Sort categories by totals"
        >
          <option value="none">None</option>
          <option value="desc">Top → Low</option>
          <option value="asc">Low → Top</option>
        </select>
        {/* Replaced labels for clarity */}
        <select
          value={pivotSort}
          onChange={(e) => setPivotSort(e.target.value as any)}
          className="px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
          title="Sort categories by totals"
        >
          <option value="none">None</option>
          <option value="desc">Top to Low</option>
          <option value="asc">Low to Top</option>
        </select>
        <label className="text-xs text-gray-500 flex items-center gap-2">
          <input
            type="checkbox"
            checked={limitEnabled}
            onChange={(e) => setLimitEnabled(e.target.checked)}
          />
          Limit
        </label>
        {/* Pie chart specific controls */}
        {chartType === 'pie' && (
          <>
            <div className="mx-2 h-5 w-px bg-gray-300 dark:bg-gray-700" />
            <label className="text-xs text-gray-500 flex items-center gap-2">
              <input
                type="checkbox"
                checked={pieGroupSmall}
                onChange={(e) => setPieGroupSmall(e.target.checked)}
              />
              Group small (
              <input
                type="number"
                className="w-12 px-1 py-0.5 text-xs border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                value={pieMinPercent}
                min={0}
                max={50}
                onChange={(e) =>
                  setPieMinPercent(Math.max(0, Math.min(50, Number(e.target.value) || 0)))
                }
              />
              %)
            </label>
            <label className="text-xs text-gray-500 flex items-center gap-2 ml-2">
              Max cats
              <input
                type="number"
                className="w-14 px-1 py-0.5 text-xs border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                value={pieMaxCategories}
                min={1}
                max={200}
                onChange={(e) =>
                  setPieMaxCategories(Math.max(1, Math.min(200, Number(e.target.value) || 1)))
                }
              />
            </label>
            <button
              onClick={() => setHiddenPieLabels(new Set())}
              className="ml-2 px-2 py-1 text-xs border rounded bg-white hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
              title="Reset legend toggles"
            >
              Reset legend
            </button>
          </>
        )}
        <input
          type="number"
          min={1}
          value={limitN}
          onChange={(e) => setLimitN(Math.max(1, Number(e.target.value) || 1))}
          className="w-20 px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
          disabled={!limitEnabled}
          title="Top N rows/columns to display"
        />
        <label className="text-xs text-gray-500 flex items-center gap-2 ml-2">
          <input
            type="checkbox"
            checked={wrapLabels}
            onChange={(e) => setWrapLabels(e.target.checked)}
          />
          Wrap labels
        </label>
        <label className="text-xs text-gray-500 flex items-center gap-2 ml-2">
          <input
            type="checkbox"
            checked={rotateVBarLabels}
            onChange={(e) => setRotateVBarLabels(e.target.checked)}
          />
          Rotate v-bar labels
        </label>
        <label className="text-xs text-gray-500 flex items-center gap-2 ml-2">
          <input
            type="checkbox"
            checked={showBarValues}
            onChange={(e) => setShowBarValues(e.target.checked)}
          />
          Show values
        </label>
      </div>

      <div
        ref={pivotRef}
        className="p-3 bg-gray-50 dark:bg-gray-800 rounded max-h-96 overflow-auto"
      >
        {chartType === 'bar' ? (
          (() => {
            const barStep = 18;
            const topPad = 16;
            const bottomPad = 16;
            const rowTotalMap = new Map<string, number>();
            pivotData.rList.forEach((rk: any, i: number) =>
              rowTotalMap.set(String(rk), pivotData.rowTotals[i] || 0),
            );
            let rowOrder = [...pivotData.rList] as any[];
            if (pivotSort === 'desc')
              rowOrder.sort(
                (a, b) =>
                  (rowTotalMap.get(String(b)) || 0) - (rowTotalMap.get(String(a)) || 0),
              );
            if (pivotSort === 'asc')
              rowOrder.sort(
                (a, b) =>
                  (rowTotalMap.get(String(a)) || 0) - (rowTotalMap.get(String(b)) || 0),
              );
            const rowsL = limitEnabled ? rowOrder.slice(0, limitN) : rowOrder;
            const innerH = topPad + rowsL.length * barStep + bottomPad;
            const wrap = (text: string, maxChars = 24): string[] => {
              if (!wrapLabels) return [text];
              const words = String(text).split(/\s+/);
              const lines: string[] = [];
              let current = '';
              for (const w of words) {
                if ((current + ' ' + w).trim().length <= maxChars) {
                  current = (current ? current + ' ' : '') + w;
                } else {
                  if (current) lines.push(current);
                  if (w.length > maxChars) {
                    for (let i = 0; i < w.length; i += maxChars)
                      lines.push(w.slice(i, i + maxChars));
                    current = '';
                  } else {
                    current = w;
                  }
                }
              }
              if (current) lines.push(current);
              return lines.length ? lines : [String(text)];
            };
            return (
              <svg viewBox={`0 0 1000 ${innerH}`} className="w-full" style={{ height: innerH }}>
                {rowsL.map((rk, i) => {
                  const total = rowTotalMap.get(String(rk)) || 0;
                  const max = Math.max(1, pivotData.maxRowTotal);
                  const w = (total / max) * 960;
                  const y = topPad + i * barStep;
                  const lines = wrap(String(rk));
                  return (
                    <g key={String(rk)}>
                      <rect x={40} y={y} width={w} height={12} fill="#60a5fa" />
                      <text x={38} y={y + 6} fontSize="12" fill="#6b7280" textAnchor="end">
                        {lines.map((ln, j) => (
                          <tspan key={j} x={38} dy={j === 0 ? 0 : 12}>
                            {ln}
                          </tspan>
                        ))}
                      </text>
                      {showBarValues && (
                        <text x={42 + w} y={y + 8} fontSize="10" fill="#374151">
                          {total}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            );
          })()
        ) : chartType === 'vbar' ? (
          <svg viewBox="0 0 1000 600" className="w-full h-full">
            {(() => {
              const rowTotalMap = new Map<string, number>();
              pivotData.rList.forEach((rk: any, i: number) =>
                rowTotalMap.set(String(rk), pivotData.rowTotals[i] || 0),
              );
              let rowOrder = [...pivotData.rList] as any[];
              if (pivotSort === 'desc')
                rowOrder.sort(
                  (a, b) =>
                    (rowTotalMap.get(String(b)) || 0) - (rowTotalMap.get(String(a)) || 0),
                );
              if (pivotSort === 'asc')
                rowOrder.sort(
                  (a, b) =>
                    (rowTotalMap.get(String(a)) || 0) - (rowTotalMap.get(String(b)) || 0),
                );
              const rowsL = limitEnabled ? rowOrder.slice(0, limitN) : rowOrder;
              const max = Math.max(1, pivotData.maxRowTotal);
              const n = rowsL.length;
              const xStep = n ? 960 / n : 960;
              const barW = Math.max(2, xStep * 0.8);
              return (
                <>
                  <line x1={20} y1={560} x2={980} y2={560} stroke="#e5e7eb" />
                  {rowsL.map((rk, i) => {
                    const total = rowTotalMap.get(String(rk)) || 0;
                    const h = (total / max) * 520;
                    const x = 20 + i * xStep + (xStep - barW) / 2;
                    const y = 560 - h;
                    return (
                      <g key={String(rk)}>
                        <rect x={x} y={y} width={barW} height={h} fill="#60a5fa" />
                        {showBarValues && h > 10 && (
                          <text
                            x={x + barW / 2}
                            y={y - 6}
                            fontSize="11"
                            fill="#374151"
                            textAnchor="middle"
                          >
                            {total}
                          </text>
                        )}
                      </g>
                    );
                  })}
                  {rowsL.slice(0, 60).map((rk, i) => {
                    const labelX = 20 + i * xStep + xStep / 2;
                    const labelY = 580;
                    const text = String(rk).slice(0, 18);
                    return rotateVBarLabels ? (
                      <g key={`lbl-${i}`} transform={`translate(${labelX}, ${labelY}) rotate(-45)`}>
                        <text x={0} y={0} fontSize="10" fill="#6b7280" textAnchor="end">
                          {text}
                        </text>
                      </g>
                    ) : (
                      <text
                        key={`lbl-${i}`}
                        x={labelX}
                        y={labelY}
                        fontSize="10"
                        fill="#6b7280"
                        textAnchor="middle"
                      >
                        {text}
                      </text>
                    );
                  })}
                </>
              );
            })()}
          </svg>
        ) : chartType === 'line' ? (
          <svg viewBox="0 0 1000 600" className="w-full h-full">
            {(() => {
              const colTotalMap = new Map<string, number>();
              (pivotData.cList as any[]).forEach((ck: any, i: number) =>
                colTotalMap.set(String(ck), pivotData.colTotals?.[i] || 0),
              );
              let colOrder = [...pivotData.cList] as any[];
              if (pivotSort === 'desc')
                colOrder.sort(
                  (a, b) =>
                    (colTotalMap.get(String(b)) || 0) - (colTotalMap.get(String(a)) || 0),
                );
              if (pivotSort === 'asc')
                colOrder.sort(
                  (a, b) =>
                    (colTotalMap.get(String(a)) || 0) - (colTotalMap.get(String(b)) || 0),
                );
              const colsL = limitEnabled ? colOrder.slice(0, limitN) : colOrder;
              const colTotalsL = colsL.map((ck) => colTotalMap.get(String(ck)) || 0);
              const max = Math.max(1, pivotData.maxColTotal || 1);
              const n = colsL.length;
              const xStep = n ? 960 / n : 960;
              const pts = colsL
                .map((ck, i) => {
                  const v = colTotalsL[i] || 0;
                  const x = 20 + i * xStep + xStep / 2;
                  const y = 560 - (v / max) * 520;
                  return `${x},${y}`;
                })
                .join(' ');
              return (
                <>
                  <line x1={20} y1={560} x2={980} y2={560} stroke="#e5e7eb" />
                  <polyline points={pts} fill="none" stroke="#3b82f6" strokeWidth={2} />
                  {colsL.slice(0, 60).map((ck, i) => (
                    <text
                      key={i}
                      x={20 + i * xStep + xStep / 2}
                      y={580}
                      fontSize="10"
                      fill="#6b7280"
                      textAnchor="middle"
                    >
                      {String(ck).slice(0, 14)}
                    </text>
                  ))}
                </>
              );
            })()}
          </svg>
        ) : chartType === 'pie' ? (
          <div className="flex items-start gap-6">
            <div className="flex-1">
              <svg viewBox="0 0 1000 600" className="w-full h-full">
                {(() => {
                  const rowTotalMap = new Map<string, number>();
                  pivotData.rList.forEach((rk: any, i: number) =>
                    rowTotalMap.set(String(rk), pivotData.rowTotals[i] || 0),
                  );
                  let rowOrder = [...pivotData.rList] as any[];
                  if (pivotSort === 'desc')
                    rowOrder.sort(
                      (a, b) =>
                        (rowTotalMap.get(String(b)) || 0) - (rowTotalMap.get(String(a)) || 0),
                    );
                  if (pivotSort === 'asc')
                    rowOrder.sort(
                      (a, b) =>
                        (rowTotalMap.get(String(a)) || 0) - (rowTotalMap.get(String(b)) || 0),
                    );
                  const rowsL = limitEnabled ? rowOrder.slice(0, limitN) : rowOrder;
                  const totals = rowsL.map((rk) => rowTotalMap.get(String(rk)) || 0);
                  const sum = totals.reduce((a, b) => a + b, 0) || 1;
                  const cx = 320,
                    cy = 300,
                    r = 180;
                  let angle = -Math.PI / 2;
                  const hashString = (str: string): number => {
                    let h = 2166136261 >>> 0;
                    for (let i = 0; i < str.length; i++) {
                      h ^= str.charCodeAt(i);
                      h = Math.imul(h, 16777619);
                    }
                    return h >>> 0;
                  };
                  const mulberry32 = (a: number) => () => {
                    let t = (a += 0x6d2b79f5);
                    t = Math.imul(t ^ (t >>> 15), t | 1);
                    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
                  };
                  const colorForLabel = (label: string): string => {
                    const seed = hashString(label);
                    const rand = mulberry32(seed);
                    const h = Math.floor(rand() * 360);
                    const s = Math.floor(60 + rand() * 30);
                    const l = Math.floor(45 + rand() * 15);
                    return `hsl(${h}, ${s}%, ${l}%)`;
                  };
                  let entries = rowsL.map((rk, i) => ({
                    label: String(rk),
                    total: totals[i],
                  }));
                  if (pivotSort === 'desc' || pivotSort === 'none')
                    entries.sort((a, b) => b.total - a.total);
                  else if (pivotSort === 'asc') entries.sort((a, b) => a.total - b.total);
                  if (pieGroupSmall) {
                    const min = (pieMinPercent / 100) * sum;
                    const small = entries.filter((e) => e.total < min);
                    const big = entries.filter((e) => e.total >= min);
                    const otherTotal = small.reduce((a, b) => a + b.total, 0);
                    entries = otherTotal > 0 ? [...big, { label: 'Other', total: otherTotal }] : big;
                  }
                  if (entries.length > pieMaxCategories) {
                    const head = entries.slice(0, pieMaxCategories - 1);
                    const tail = entries.slice(pieMaxCategories - 1);
                    const otherTotal = tail.reduce((a, b) => a + b.total, 0);
                    entries = [...head, { label: 'Other', total: otherTotal }];
                  }
                  angle = -Math.PI / 2;
                  return (
                    <>
                      {entries
                        .filter((e) => !hiddenPieLabels.has(e.label))
                        .map((e, i) => {
                          const theta = (e.total / sum) * Math.PI * 2;
                          const x1 = cx + r * Math.cos(angle);
                          const y1 = cy + r * Math.sin(angle);
                          const x2 = cx + r * Math.cos(angle + theta);
                          const y2 = cy + r * Math.sin(angle + theta);
                          const large = theta > Math.PI ? 1 : 0;
                          const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
                          const elem = (
                            <path
                              key={e.label + i}
                              d={d}
                              fill={colorForLabel(e.label)}
                              stroke="#fff"
                              strokeWidth={1}
                            />
                          );
                          angle += theta;
                          return elem;
                        })}
                    </>
                  );
                })()}
              </svg>
            </div>
            {(() => {
              const rowTotalMap = new Map<string, number>();
              pivotData.rList.forEach((rk: any, i: number) =>
                rowTotalMap.set(String(rk), pivotData.rowTotals[i] || 0),
              );
              let rowOrder = [...pivotData.rList] as any[];
              if (pivotSort === 'desc')
                rowOrder.sort(
                  (a, b) =>
                    (rowTotalMap.get(String(b)) || 0) - (rowTotalMap.get(String(a)) || 0),
                );
              if (pivotSort === 'asc')
                rowOrder.sort(
                  (a, b) =>
                    (rowTotalMap.get(String(a)) || 0) - (rowTotalMap.get(String(b)) || 0),
                );
              const rowsL = limitEnabled ? rowOrder.slice(0, limitN) : rowOrder;
              const totals = rowsL.map((rk) => rowTotalMap.get(String(rk)) || 0);
              const hashString = (str: string): number => {
                let h = 2166136261 >>> 0;
                for (let i = 0; i < str.length; i++) {
                  h ^= str.charCodeAt(i);
                  h = Math.imul(h, 16777619);
                }
                return h >>> 0;
              };
              const mulberry32 = (a: number) => () => {
                let t = (a += 0x6d2b79f5);
                t = Math.imul(t ^ (t >>> 15), t | 1);
                t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
              };
              const colorForLabel = (label: string): string => {
                const seed = hashString(label);
                const rand = mulberry32(seed);
                const h = Math.floor(rand() * 360);
                const s = Math.floor(60 + rand() * 30);
                const l = Math.floor(45 + rand() * 15);
                return `hsl(${h}, ${s}%, ${l}%)`;
              };
              let entries = rowsL.map((rk, i) => ({ label: String(rk), total: totals[i] }));
              if (pivotSort === 'desc' || pivotSort === 'none')
                entries.sort((a, b) => b.total - a.total);
              else if (pivotSort === 'asc') entries.sort((a, b) => a.total - b.total);
              const grand = entries.reduce((a, b) => a + b.total, 0) || 1;
              if (pieGroupSmall) {
                const min = (pieMinPercent / 100) * grand;
                const small = entries.filter((e) => e.total < min);
                const big = entries.filter((e) => e.total >= min);
                const otherTotal = small.reduce((a, b) => a + b.total, 0);
                entries = otherTotal > 0 ? [...big, { label: 'Other', total: otherTotal }] : big;
              }
              if (entries.length > pieMaxCategories) {
                const head = entries.slice(0, pieMaxCategories - 1);
                const tail = entries.slice(pieMaxCategories - 1);
                const otherTotal = tail.reduce((a, b) => a + b.total, 0);
                entries = [...head, { label: 'Other', total: otherTotal }];
              }
              const colorFor = (label: string): string =>
                label === 'Other' ? '#9CA3AF' : colorForLabel(label);
              return (
                <div className="w-64 max-h-80 overflow-auto pr-1">
                  {entries.map((e, i) => (
                    <div
                      key={e.label + i}
                      className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-200 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-1 py-0.5 rounded"
                      onClick={() => {
                        const newSet = new Set(hiddenPieLabels);
                        if (newSet.has(e.label)) {
                          newSet.delete(e.label);
                        } else {
                          newSet.add(e.label);
                        }
                        setHiddenPieLabels(newSet);
                      }}
                    >
                      <span
                        className="inline-block w-3 h-3 rounded-sm"
                        style={{
                          backgroundColor: colorFor(e.label),
                          opacity: hiddenPieLabels.has(e.label) ? 0.3 : 1,
                        }}
                      ></span>
                      <span className={hiddenPieLabels.has(e.label) ? 'line-through opacity-50' : ''}>
                        {e.label} ({e.total})
                      </span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        ) : (
          <svg viewBox="0 0 1000 600" className="w-full h-full">
            {(() => {
              const rowTotalMap = new Map<string, number>();
              pivotData.rList.forEach((rk: any, i: number) =>
                rowTotalMap.set(String(rk), pivotData.rowTotals[i] || 0),
              );
              let rowOrder = [...pivotData.rList] as any[];
              if (pivotSort === 'desc')
                rowOrder.sort(
                  (a, b) =>
                    (rowTotalMap.get(String(b)) || 0) - (rowTotalMap.get(String(a)) || 0),
                );
              if (pivotSort === 'asc')
                rowOrder.sort(
                  (a, b) =>
                    (rowTotalMap.get(String(a)) || 0) - (rowTotalMap.get(String(b)) || 0),
                );
              const rowsL = limitEnabled ? rowOrder.slice(0, limitN) : rowOrder;
              const colTotalMap = new Map<string, number>();
              (pivotData.cList as any[]).forEach((ck: any, i: number) =>
                colTotalMap.set(String(ck), pivotData.colTotals?.[i] || 0),
              );
              let colOrder = [...pivotData.cList] as any[];
              if (pivotSort === 'desc')
                colOrder.sort(
                  (a, b) =>
                    (colTotalMap.get(String(b)) || 0) - (colTotalMap.get(String(a)) || 0),
                );
              if (pivotSort === 'asc')
                colOrder.sort(
                  (a, b) =>
                    (colTotalMap.get(String(a)) || 0) - (colTotalMap.get(String(b)) || 0),
                );
              const colsL = limitEnabled ? colOrder.slice(0, limitN) : colOrder;
              const cellW = 960 / Math.max(1, colsL.length);
              const cellH = 520 / Math.max(1, rowsL.length);
              const valMax = Math.max(1, pivotData.maxVal);
              return rowsL.map((rk, ri) =>
                colsL.map((ck, ci) => {
                  const v = (pivotData.matrix.get(rk) || [])[ci] || 0;
                  const intensity = Math.floor((v / valMax) * 255);
                  const color = `rgb(${255 - intensity}, ${255 - intensity}, 255)`;
                  return (
                    <rect
                      key={`${ri}-${ci}`}
                      x={24 + ci * cellW}
                      y={16 + ri * cellH}
                      width={cellW - 4}
                      height={cellH - 4}
                      fill={color}
                    />
                  );
                }),
              );
            })()}
          </svg>
        )}
      </div>
    </div>
  );
}
