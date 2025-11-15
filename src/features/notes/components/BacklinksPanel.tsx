import React, { useEffect, useState } from 'react';
import { Link, FileText, Clock } from 'lucide-react';
import { Backlink } from '../services/NoteLinkService';
import { formatDistanceToNow } from 'date-fns';

interface BacklinksPanelProps {
  noteId: string;
  noteTitle: string;
  notes: any[]; // This would be properly typed in a real implementation
  onNavigateToNote: (noteId: string) => void;
}

export default function BacklinksPanel({ noteId, noteTitle, notes, onNavigateToNote }: BacklinksPanelProps) {
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [mentions, setMentions] = useState<Backlink[]>([]);

  useEffect(() => {
    // Import the service dynamically to avoid circular dependencies
    const { noteLinkService } = require('../services/NoteLinkService');
    
    // Get backlinks from the service
    const links = noteLinkService.getBacklinksToNote(noteId);
    setBacklinks(links);
    
    // Find mentions in other notes
    const foundMentions = noteLinkService.findMentions(notes, noteId, noteTitle);
    setMentions(foundMentions);
  }, [noteId, noteTitle, notes]);

  const allReferences = [...backlinks, ...mentions];
  
  if (allReferences.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-2 mb-4">
        <Link className="w-4 h-4 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Backlinks & Mentions ({allReferences.length})
        </h3>
      </div>
      
      <div className="space-y-3">
        {allReferences.map((backlink, index) => (
          <div 
            key={index}
            className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            onClick={() => onNavigateToNote(backlink.sourceNoteId)}
          >
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {backlink.sourceNoteTitle}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>
                    {formatDistanceToNow(new Date(backlink.createdAt), { addSuffix: true })}
                  </span>
                </div>
                {backlink.linkText && (
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate">
                    "{backlink.linkText}"
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}