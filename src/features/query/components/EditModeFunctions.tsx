interface EditModeFunctionsProps {
  setEditable: (editable: boolean) => void;
  setCanUserEnableEdit: (canEnable: boolean) => void;
  setFocusCell: (cell: { row: number; col: string } | null) => void;
  setToast: (toast: { message: string; type: 'success' | 'error' | 'info' }) => void;
}

export function useEditModeFunctions({
  setEditable,
  setCanUserEnableEdit,
  setFocusCell,
  setToast,
}: EditModeFunctionsProps) {
  // Function to enable edit mode via button click
  const enableEditMode = () => {
    setEditable(true);
    setCanUserEnableEdit(false);
    setToast({
      message: 'Edit mode enabled. Click cells to modify values.',
      type: 'info',
    });
  };

  // Function to exit edit mode
  const exitEditMode = () => {
    setEditable(false);
    setCanUserEnableEdit(true);
    setFocusCell(null);
    setToast({
      message: 'Exited edit mode. Click "Enable Editing" to modify data.',
      type: 'info',
    });
  };

  return {
    enableEditMode,
    exitEditMode,
  };
}