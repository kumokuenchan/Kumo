import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { WebLinksAddon } from '@xterm/addon-web-links';

interface LinkDetectorProps {
  terminal: XTerm | null;
  onLinkHover?: (url: string) => void;
  onLinkLeave?: () => void;
}

export default function LinkDetector({ terminal, onLinkHover, onLinkLeave }: LinkDetectorProps) {
  const webLinksAddonRef = useRef<WebLinksAddon | null>(null);

  useEffect(() => {
    if (!terminal) return;

    // Create and activate WebLinksAddon
    const webLinksAddon = new WebLinksAddon(
      (event: MouseEvent, uri: string) => {
        // Handle link click - Ctrl+Click to open in browser
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          window.open(uri, '_blank');
        }
      },
      {
        // Custom hover handler to show file paths or URLs
        hover: (event: MouseEvent, uri: string, location: { x: number; y: number }) => {
          if (onLinkHover) {
            onLinkHover(uri);
          }
          // Show tooltip with the link
          terminal.element?.setAttribute('title', uri);
        },
        leave: () => {
          if (onLinkLeave) {
            onLinkLeave();
          }
          // Remove tooltip
          terminal.element?.removeAttribute('title');
        }
      }
    );

    webLinksAddonRef.current = webLinksAddon;
    terminal.loadAddon(webLinksAddon);

    // Cleanup on unmount
    return () => {
      if (webLinksAddonRef.current) {
        try {
          webLinksAddonRef.current.dispose();
        } catch (e) {
          // Ignore disposal errors
        }
        webLinksAddonRef.current = null;
      }
    };
  }, [terminal, onLinkHover, onLinkLeave]);

  // This component doesn't render anything visible
  return null;
}