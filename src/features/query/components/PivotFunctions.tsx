import { useMemo, useRef } from 'react';

interface PivotData {
  rList: string[];
  cList: string[];
  matrix: Map<string, number[]>;
  rowTotals: number[];
  colTotals: number[];
  maxVal: number;
  maxRowTotal: number;
  maxColTotal: number;
}

interface PivotFunctionsProps {
  rows: any[];
  result: any;
  showPivot: boolean;
  pivotRow: string | null;
  pivotCol: string | null;
  pivotVal: string | null;
  pivotAgg: 'count' | 'sum' | 'avg';
  setPivotRow: (value: string | null) => void;
  setPivotCol: (value: string | null) => void;
  setPivotVal: (value: string | null) => void;
  setPivotFullScreen: (value: boolean) => void;
}

export function usePivotFunctions({
  rows,
  result,
  showPivot,
  pivotRow,
  pivotCol,
  pivotVal,
  pivotAgg,
  setPivotRow,
  setPivotCol,
  setPivotVal,
  setPivotFullScreen,
}: PivotFunctionsProps) {
  const pivotRef = useRef<HTMLDivElement | null>(null);

  const allColumns: string[] = useMemo(() => {
    const f = (result as any)?.fields;
    if (Array.isArray(f) && f.length) return f.map((x: any) => x.name);
    const sample = rows[0] || {};
    return Object.keys(sample);
  }, [result, rows]);

  // Set default pivot columns when pivot is shown
  useMemo(() => {
    if (showPivot && allColumns.length) {
      if (!pivotRow) setPivotRow(allColumns[0]);
      if (!pivotCol) setPivotCol(allColumns[1] || allColumns[0]);
      if (!pivotVal) setPivotVal(allColumns[2] || allColumns[1] || allColumns[0]);
    }
  }, [showPivot, allColumns, pivotRow, pivotCol, pivotVal, setPivotRow, setPivotCol, setPivotVal]);

  const pivotData: PivotData | null = useMemo(() => {
    if (!pivotRow || !pivotCol) return null;
    const rowKeys = new Set<string>();
    const colKeys = new Set<string>();
    rows.forEach((r) => {
      rowKeys.add(String(r[pivotRow] ?? ''));
      colKeys.add(String(r[pivotCol] ?? ''));
    });
    const rList = Array.from(rowKeys);
    const cList = Array.from(colKeys);
    const cIndex = new Map(cList.map((c, i) => [c, i]));
    const matrix = new Map<string, number[]>();
    rList.forEach((rk) => matrix.set(rk, new Array(cList.length).fill(0)));
    const counts = new Map<string, number[]>();
    if (pivotAgg === 'avg') rList.forEach((rk) => counts.set(rk, new Array(cList.length).fill(0)));
    rows.forEach((r) => {
      const rk = String(r[pivotRow] ?? '');
      const ck = String(r[pivotCol] ?? '');
      const ci = cIndex.get(ck);
      if (ci == null) return;
      const arr = matrix.get(rk)!;
      if (pivotAgg === 'count') {
        arr[ci] = (arr[ci] || 0) + 1;
      } else {
        const v = Number(pivotVal ? r[pivotVal] : 0) || 0;
        arr[ci] = (arr[ci] || 0) + v;
        if (pivotAgg === 'avg') {
          const cArr = counts.get(rk)!;
          cArr[ci] = (cArr[ci] || 0) + 1;
        }
      }
    });
    if (pivotAgg === 'avg') {
      rList.forEach((rk) => {
        const arr = matrix.get(rk)!;
        const cArr = counts.get(rk)!;
        arr.forEach((v, i) => {
          arr[i] = cArr[i] ? v / cArr[i] : 0;
        });
      });
    }
    const rowTotals = rList.map((rk) =>
      (matrix.get(rk) || []).reduce((a, b) => a + (Number(b) || 0), 0),
    );
    const maxVal = Math.max(0, ...rList.flatMap((rk) => matrix.get(rk) || []));

    const colTotals = cList.map((_, ci) =>
      rList.reduce((sum, rk) => sum + (Number((matrix.get(rk) || [])[ci]) || 0), 0),
    );
    const maxRowTotal = Math.max(0, ...rowTotals);
    const maxColTotal = Math.max(0, ...colTotals);
    return { rList, cList, matrix, rowTotals, colTotals, maxVal, maxRowTotal, maxColTotal };
  }, [rows, pivotRow, pivotCol, pivotVal, pivotAgg]);

  // Close fullscreen on Escape
  const handleEscapeKey = () => {
    if (!pivotFullScreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPivotFullScreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  };

  const exportPivotPNG = async () => {
    try {
      const container = pivotRef.current;
      if (!container) return;
      const svgEl = container.querySelector('svg') as SVGSVGElement | null;
      if (!svgEl) return;

      // Determine intrinsic size from viewBox (fallback to current size)
      const vb = svgEl.viewBox?.baseVal;
      const vbWidth =
        vb && vb.width
          ? vb.width
          : svgEl.width?.baseVal?.value || svgEl.getBoundingClientRect().width || 1000;
      const vbHeight =
        vb && vb.height
          ? vb.height
          : svgEl.height?.baseVal?.value || svgEl.getBoundingClientRect().height || 400;

      // Clone the SVG and set explicit size to avoid CSS/layout expansion
      const clone = svgEl.cloneNode(true) as SVGSVGElement;
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('width', String(vbWidth));
      clone.setAttribute('height', String(vbHeight));
      if (!clone.getAttribute('preserveAspectRatio')) {
        clone.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      }

      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(clone);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const scale = Math.max(1, Math.min(3, window.devicePixelRatio || 1.5));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(vbWidth * scale);
        canvas.height = Math.round(vbHeight * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          return;
        }
        // Background (light/dark safe)
        const isDark = document.documentElement.classList.contains('dark');
        ctx.fillStyle = isDark ? '#111827' : '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        ctx.drawImage(img, 0, 0, vbWidth, vbHeight);
        canvas.toBlob((png) => {
          if (!png) {
            URL.revokeObjectURL(url);
            return;
          }
          const dl = URL.createObjectURL(png);
          const a = document.createElement('a');
          a.href = dl;
          a.download = `pivot_chart_${Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(dl);
          URL.revokeObjectURL(url);
        }, 'image/png');
      };
      img.onerror = () => URL.revokeObjectURL(url);
      img.src = url;
    } catch (e) {
      console.error('Failed to export PNG', e);
      alert('Failed to export chart as PNG');
    }
  };

  return {
    pivotRef,
    allColumns,
    pivotData,
    handleEscapeKey,
    exportPivotPNG,
  };
}