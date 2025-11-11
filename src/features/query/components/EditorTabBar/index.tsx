import { type EditorTab as EditorTabType } from '../../utils/tabUtils';
import { EditorTab } from './EditorTab';
import { NewTabButton } from './NewTabButton';
import { TabColorPicker } from './TabColorPicker';

interface EditorTabBarProps {
  tabs: EditorTabType[];
  activeTabIndex: number;
  colorPickerTab: number | null;
  colorPickerPos: { left: number; top: number } | null;
  onActivateTab: (index: number) => void;
  onAddTab: () => void;
  onCloseTab: (index: number, e: React.MouseEvent) => void;
  onTogglePin: (index: number) => void;
  onSetTabColor: (index: number, color: string | undefined) => void;
  onSetRenameTabIndex: (index: number) => void;
  onOpenColorPicker: (index: number, pos: { left: number; top: number }) => void;
  onCloseColorPicker: () => void;
  onCompareResults: (leftTab: number, rightTab: number) => void;
  onSetError: (error: string | null) => void;
}

export function EditorTabBar({
  tabs,
  activeTabIndex,
  colorPickerTab,
  colorPickerPos,
  onActivateTab,
  onAddTab,
  onCloseTab,
  onTogglePin,
  onSetTabColor,
  onSetRenameTabIndex,
  onOpenColorPicker,
  onCloseColorPicker,
  onCompareResults,
  onSetError,
}: EditorTabBarProps) {
  const handleCompareFromColorPicker = () => {
    if (colorPickerTab === null) return;

    // Find another tab with results to compare with
    const otherTabsWithResults = tabs
      .map((tab, idx) => ({ tab, idx }))
      .filter(({ tab, idx }) => idx !== colorPickerTab && tab.results && tab.results.length > 0);

    if (otherTabsWithResults.length === 0) {
      onSetError('Need another tab with results to compare');
      setTimeout(() => onSetError(null), 3000);
      onCloseColorPicker();
      return;
    }

    // Compare with the first available tab
    onCompareResults(colorPickerTab, otherTabsWithResults[0].idx);
    onCloseColorPicker();
  };

  return (
    <>
      {/* Query Tabs */}
      <div className="border-b border-gray-200/60 dark:border-gray-700/60 px-6 py-3 flex items-center gap-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
        {tabs.map((tab, index) => (
          <EditorTab
            key={tab.id}
            tab={tab}
            index={index}
            isActive={index === activeTabIndex}
            tabCount={tabs.length}
            onActivate={() => onActivateTab(index)}
            onClose={(e) => onCloseTab(index, e)}
            onContextMenu={(e) => {
              e.preventDefault();
              if (colorPickerTab === index) {
                onCloseColorPicker();
              } else {
                const rect = e.currentTarget.getBoundingClientRect();
                onOpenColorPicker(index, {
                  left: rect.left,
                  top: rect.bottom + 4,
                });
              }
            }}
            onDoubleClickName={() => onSetRenameTabIndex(index)}
          />
        ))}

        <NewTabButton onAddTab={onAddTab} />
      </div>

      {/* Color Picker Portal */}
      {colorPickerTab !== null && colorPickerPos && (
        <TabColorPicker
          tabs={tabs}
          colorPickerTab={colorPickerTab}
          position={colorPickerPos}
          onTogglePin={onTogglePin}
          onSetColor={onSetTabColor}
          onCompare={handleCompareFromColorPicker}
          onClose={onCloseColorPicker}
        />
      )}
    </>
  );
}
