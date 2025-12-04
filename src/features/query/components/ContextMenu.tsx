import { RefObject } from 'react';

interface ContextMenuProps {
  contextMenu: {
    x: number;
    y: number;
    rowIndex: number;
    columnName: string | null;
    cellValue?: any;
  } | null;
  contextMenuRef: RefObject<HTMLDivElement>;
  contextMenuColumnRef: RefObject<string | null>;
  contextMenuCellValueRef: RefObject<any>;
  rowSelection: Record<string, boolean>;
  setContextMenu: (value: any) => void;
  copyCellValue: () => void;
  generateUpdateQuery: (columnName: string) => void;
  generateInsertQuery: () => void;
  generateDeleteQuery: () => void;
  generateCreateTableAs: () => void;
  copyColumnNames: () => void;
  copyAsJSON: () => void;
  copyAsTSV: () => void;
  generateRawQueryResult: () => void;
}

export default function ContextMenu({
  contextMenu,
  contextMenuRef,
  contextMenuColumnRef,
  contextMenuCellValueRef,
  rowSelection,
  setContextMenu,
  copyCellValue,
  generateUpdateQuery,
  generateInsertQuery,
  generateDeleteQuery,
  generateCreateTableAs,
  copyColumnNames,
  copyAsJSON,
  copyAsTSV,
  generateRawQueryResult,
}: ContextMenuProps) {
  if (!contextMenu) return null;

  return (
    <div
      ref={contextMenuRef}
      className="fixed z-50 bg-white border border-gray-300 rounded shadow-lg text-sm min-w-[240px]"
      style={{ left: contextMenu.x, top: contextMenu.y }}
      onClick={(e) => e.stopPropagation()}
    >
      {contextMenu.columnName && (
        <>
          <button
            className="block w-full text-left px-4 py-2 hover:bg-gray-100"
            onClick={() => {
              copyCellValue();
              setContextMenu(null);
              contextMenuColumnRef.current = null;
              contextMenuCellValueRef.current = null;
            }}
          >
            Copy Cell Value
          </button>
          <button
            className="block w-full text-left px-4 py-2 hover:bg-gray-100"
            onClick={(e) => {
              e.stopPropagation();
              const columnName = contextMenuColumnRef.current!;
              setContextMenu(null);
              contextMenuColumnRef.current = null;
              contextMenuCellValueRef.current = null;
              generateUpdateQuery(columnName);
            }}
          >
            Generate UPDATE Query for '{contextMenu.columnName}'
          </button>
          <div className="border-t border-gray-200 my-1"></div>
        </>
      )}
      {Object.keys(rowSelection).length > 0 && (
        <>
          <button
            className="block w-full text-left px-4 py-2 hover:bg-gray-100"
            onClick={() => {
              generateInsertQuery();
              setContextMenu(null);
            }}
          >
            Generate INSERT Query
          </button>
          <button
            className="block w-full text-left px-4 py-2 hover:bg-gray-100"
            onClick={() => {
              generateDeleteQuery();
              setContextMenu(null);
            }}
          >
            Generate DELETE Query
          </button>
          <button
            className="block w-full text-left px-4 py-2 hover:bg-gray-100"
            onClick={() => {
              generateCreateTableAs();
              setContextMenu(null);
            }}
          >
            Generate CREATE TABLE AS
          </button>
          <div className="border-t border-gray-200 my-1"></div>
        </>
      )}
      <button
        className="block w-full text-left px-4 py-2 hover:bg-gray-100"
        onClick={() => {
          copyColumnNames();
          setContextMenu(null);
        }}
      >
        Copy Column Names
      </button>
      <button
        className="block w-full text-left px-4 py-2 hover:bg-gray-100"
        onClick={() => {
          copyAsJSON();
          setContextMenu(null);
        }}
      >
        Copy as JSON
      </button>
      <button
        className="block w-full text-left px-4 py-2 hover:bg-gray-100"
        onClick={() => {
          copyAsTSV();
          setContextMenu(null);
        }}
      >
        Copy as TSV
      </button>
      <button
        className="block w-full text-left px-4 py-2 hover:bg-gray-100"
        onClick={() => {
          generateRawQueryResult();
          setContextMenu(null);
        }}
      >
        Copy as MySQL CLI Format
      </button>
    </div>
  );
}
