import React, { useState, useEffect } from 'react';
import { FileText, Copy, CheckCircle, AlertTriangle, GitBranch, ExternalLink, MessageSquare } from 'lucide-react';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { githubGist, atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
// Import common languages
import javascript from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript';
import typescript from 'react-syntax-highlighter/dist/esm/languages/hljs/typescript';
import python from 'react-syntax-highlighter/dist/esm/languages/hljs/python';
import java from 'react-syntax-highlighter/dist/esm/languages/hljs/java';
import cpp from 'react-syntax-highlighter/dist/esm/languages/hljs/cpp';
import csharp from 'react-syntax-highlighter/dist/esm/languages/hljs/csharp';
import php from 'react-syntax-highlighter/dist/esm/languages/hljs/php';
import ruby from 'react-syntax-highlighter/dist/esm/languages/hljs/ruby';
import go from 'react-syntax-highlighter/dist/esm/languages/hljs/go';
import rust from 'react-syntax-highlighter/dist/esm/languages/hljs/rust';
import swift from 'react-syntax-highlighter/dist/esm/languages/hljs/swift';
import kotlin from 'react-syntax-highlighter/dist/esm/languages/hljs/kotlin';
import scala from 'react-syntax-highlighter/dist/esm/languages/hljs/scala';
import css from 'react-syntax-highlighter/dist/esm/languages/hljs/css';
import scss from 'react-syntax-highlighter/dist/esm/languages/hljs/scss';
import html from 'react-syntax-highlighter/dist/esm/languages/hljs/xml';
import json from 'react-syntax-highlighter/dist/esm/languages/hljs/json';
import yaml from 'react-syntax-highlighter/dist/esm/languages/hljs/yaml';
import markdown from 'react-syntax-highlighter/dist/esm/languages/hljs/markdown';
import sql from 'react-syntax-highlighter/dist/esm/languages/hljs/sql';
import bash from 'react-syntax-highlighter/dist/esm/languages/hljs/bash';
import dockerfile from 'react-syntax-highlighter/dist/esm/languages/hljs/dockerfile';

// Register languages
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('java', java);
SyntaxHighlighter.registerLanguage('cpp', cpp);
SyntaxHighlighter.registerLanguage('csharp', csharp);
SyntaxHighlighter.registerLanguage('php', php);
SyntaxHighlighter.registerLanguage('ruby', ruby);
SyntaxHighlighter.registerLanguage('go', go);
SyntaxHighlighter.registerLanguage('rust', rust);
SyntaxHighlighter.registerLanguage('swift', swift);
SyntaxHighlighter.registerLanguage('kotlin', kotlin);
SyntaxHighlighter.registerLanguage('scala', scala);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('scss', scss);
SyntaxHighlighter.registerLanguage('html', html);
SyntaxHighlighter.registerLanguage('xml', html);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('yaml', yaml);
SyntaxHighlighter.registerLanguage('markdown', markdown);
SyntaxHighlighter.registerLanguage('sql', sql);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('shell', bash);
SyntaxHighlighter.registerLanguage('sh', bash);
SyntaxHighlighter.registerLanguage('dockerfile', dockerfile);

interface Repository {
  id: string;
  name: string;
  owner: string;
  url: string;
  token?: string;
}

interface MultiRepoDiffViewerProps {
  filePath: string;
  diff: string;
  repository: Repository;
  headBranch: string;
  baseBranch: string;
  commitId: string;
  onAddLineComment?: (line: number, originalLine: number | undefined, filePath: string, commitId: string) => void;
  onSubmitComment?: (comment: string, line: number, originalLine: number | undefined, filePath: string, commitId: string) => void;
  getCommentsForLine?: (filePath: string, line: number) => any[];
  onAddReaction?: (commentId: string, content: '+1' | '-1' | 'laugh' | 'hooray' | 'confused' | 'heart' | 'rocket' | 'eyes') => void;
  onRemoveReaction?: (reactionId: number) => void;
  currentUser?: string;
}

type ViewMode = 'unified' | 'split';

interface DiffLine {
  type: 'add' | 'remove' | 'context' | 'header';
  content: string;
  oldLineNum?: number;
  newLineNum?: number;
}

const MultiRepoDiffViewer: React.FC<MultiRepoDiffViewerProps> = ({
  filePath,
  diff,
  repository,
  headBranch,
  baseBranch,
  commitId,
  onAddLineComment,
  onSubmitComment,
  getCommentsForLine,
  onAddReaction,
  onRemoveReaction,
  currentUser
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('unified');
  const [copied, setCopied] = useState(false);
  const [parsedLines, setParsedLines] = useState<DiffLine[]>([]);
  const [showInlineComments, setShowInlineComments] = useState(true);
  const [activeCommentLine, setActiveCommentLine] = useState<{lineNum: number, oldLineNum?: number} | null>(null);
  const [showReactionsPanel, setShowReactionsPanel] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [likedComments, setLikedComments] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('diff_liked_comments');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [readComments, setReadComments] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('diff_read_comments');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    parseDiffContent(diff);
  }, [diff]);

  // Detect theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  // Close reactions panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showReactionsPanel) {
        const target = event.target as Element;
        if (!target.closest('.relative')) {
          setShowReactionsPanel(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showReactionsPanel]);

  const parseDiffContent = (diffContent: string) => {
    if (!diffContent) {
      setParsedLines([]);
      return;
    }

    const lines: DiffLine[] = [];
    const diffLines = diffContent.split('\n');
    let oldLineNum = 0;
    let newLineNum = 0;

    for (const line of diffLines) {
      if (line.startsWith('@@')) {
        // Header line with line numbers
        const match = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
        if (match) {
          oldLineNum = parseInt(match[1]) - 1;
          newLineNum = parseInt(match[3]) - 1;
        }
        lines.push({
          type: 'header',
          content: line,
        });
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        newLineNum++;
        lines.push({
          type: 'add',
          content: line.substring(1),
          oldLineNum: undefined,
          newLineNum,
        });
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        oldLineNum++;
        lines.push({
          type: 'remove',
          content: line.substring(1),
          oldLineNum,
          newLineNum: undefined,
        });
      } else if (line.startsWith(' ')) {
        oldLineNum++;
        newLineNum++;
        lines.push({
          type: 'context',
          content: line.substring(1),
          oldLineNum,
          newLineNum,
        });
      } else {
        // Binary files or other special lines
        lines.push({
          type: 'context',
          content: line,
        });
      }
    }

    setParsedLines(lines);
  };

  const getFileExtension = (path: string) => {
    return path.split('.').pop()?.toLowerCase() || '';
  };

  const getLanguageFromExtension = (path: string): string => {
    const ext = getFileExtension(path);
    const langMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      java: 'java',
      cpp: 'cpp',
      cc: 'cpp',
      cxx: 'cpp',
      c: 'cpp',
      h: 'cpp',
      hpp: 'cpp',
      cs: 'csharp',
      php: 'php',
      rb: 'ruby',
      go: 'go',
      rs: 'rust',
      swift: 'swift',
      kt: 'kotlin',
      scala: 'scala',
      html: 'html',
      htm: 'html',
      css: 'css',
      scss: 'scss',
      sass: 'scss',
      json: 'json',
      xml: 'xml',
      yaml: 'yaml',
      yml: 'yaml',
      md: 'markdown',
      sql: 'sql',
      sh: 'bash',
      bash: 'bash',
      zsh: 'bash',
      dockerfile: 'dockerfile',
    };
    return langMap[ext] || 'text';
  };

  const getLanguageIcon = (extension: string) => {
    const iconMap: Record<string, string> = {
      js: '🟨',
      ts: '🔷',
      jsx: '⚛️',
      tsx: '⚛️',
      py: '🐍',
      java: '☕',
      cpp: '⚙️',
      c: '⚙️',
      cs: '🔷',
      php: '🐘',
      rb: '💎',
      go: '🐹',
      rs: '🦀',
      swift: '🍎',
      kt: '🎯',
      scala: '🔴',
      html: '🌐',
      css: '🎨',
      scss: '🎨',
      sass: '🎨',
      json: '📄',
      xml: '📄',
      yaml: '📄',
      yml: '📄',
      md: '📝',
      sql: '🗃️',
      dockerfile: '🐳',
      gitignore: '📁',
    };
    return iconMap[extension] || '📄';
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(diff);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleAddComment = (lineNum: number, oldLineNum?: number) => {
    setActiveCommentLine({ lineNum, oldLineNum });
    setCommentText('');
  };

  const handleCancelComment = () => {
    setActiveCommentLine(null);
    setCommentText('');
  };

  const handleSubmitComment = () => {
    if (!commentText.trim() || !activeCommentLine) return;

    if (onSubmitComment) {
      onSubmitComment(
        commentText,
        activeCommentLine.lineNum,
        activeCommentLine.oldLineNum,
        filePath,
        commitId
      );
    }

    setActiveCommentLine(null);
    setCommentText('');
  };

  const toggleLikeComment = (commentId: string) => {
    const newLiked = new Set(likedComments);
    if (newLiked.has(commentId)) {
      newLiked.delete(commentId);
    } else {
      newLiked.add(commentId);
    }
    setLikedComments(newLiked);
    localStorage.setItem('diff_liked_comments', JSON.stringify([...newLiked]));
  };

  const toggleReadComment = (commentId: string) => {
    const newRead = new Set(readComments);
    if (newRead.has(commentId)) {
      newRead.delete(commentId);
    } else {
      newRead.add(commentId);
    }
    setReadComments(newRead);
    localStorage.setItem('diff_read_comments', JSON.stringify([...newRead]));
  };

  const extension = getFileExtension(filePath);
  const language = getLanguageFromExtension(filePath);

  const renderHighlightedCode = (content: string, inline: boolean = false) => {
    if (!content || language === 'text') {
      return <pre className="whitespace-pre-wrap">{content}</pre>;
    }

    return (
      <SyntaxHighlighter
        language={language}
        style={isDarkMode ? atomOneDark : githubGist}
        customStyle={{
          margin: 0,
          padding: 0,
          background: 'transparent',
          fontSize: 'inherit',
          lineHeight: 'inherit',
        }}
        codeTagProps={{
          style: {
            fontFamily: 'inherit',
            fontSize: 'inherit',
          },
        }}
        PreTag={inline ? 'span' : 'pre'}
      >
        {content}
      </SyntaxHighlighter>
    );
  };

  if (!diff) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No diff content available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg">{getLanguageIcon(extension)}</span>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">{filePath}</h4>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{repository.owner}/{repository.name}</span>
                <span>•</span>
                <span>{baseBranch} → {headBranch}</span>
                <a
                  href={`https://github.com/${repository.owner}/${repository.name}/blob/${headBranch}/${filePath}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-blue-600"
                >
                  <ExternalLink className="w-3 h-3" />
                  View on GitHub
                </a>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('unified')}
                className={`px-3 py-1 text-xs rounded ${
                  viewMode === 'unified'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Unified
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`px-3 py-1 text-xs rounded ${
                  viewMode === 'split'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Split
              </button>
            </div>
            
            
            
            <button
              onClick={copyToClipboard}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Copy diff"
            >
              {copied ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Diff Content */}
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
        <div className="min-w-full">
          {viewMode === 'unified' ? (
            <div className="font-mono text-sm">
              {parsedLines.map((line, index) => {
                const lineNumber = line.newLineNum || line.oldLineNum || 0;
                const originalLineNumber = line.oldLineNum || 0;
                
                // Skip if this is a header line
                if (line.type === 'header') {
                  return (
                    <React.Fragment key={`${index}-${lineNumber}-${originalLineNumber}`}>
                      <div
                        className={`flex ${
                          line.type === 'header'
                            ? 'bg-blue-100 dark:bg-blue-900/30'
                            : ''
                        }`}
                      >
                        <div className="flex-shrink-0 w-12 text-right text-gray-400 dark:text-gray-500 text-xs px-2 py-1 border-r border-gray-200 dark:border-gray-700 select-none">
                          {line.newLineNum || ''}
                        </div>
                        <div className="flex-shrink-0 w-12 text-right text-gray-400 dark:text-gray-500 text-xs px-2 py-1 border-r border-gray-200 dark:border-gray-700 select-none">
                          {line.oldLineNum || ''}
                        </div>
                        <div className={`flex-1 px-2 py-1 ${
                          line.type === 'header'
                            ? 'text-blue-800 dark:text-blue-200'
                            : 'text-gray-900 dark:text-gray-100'
                        }`}>
                          {renderHighlightedCode(line.content)}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                }
                
                // Get comments for this line - only show on added or context lines (new side)
                // Don't show comments on removed lines to avoid duplicates
                const comments = (getCommentsForLine && line.newLineNum)
                  ? getCommentsForLine(filePath, lineNumber)
                  : [];

                
                
                const hasComments = comments && comments.length > 0;

                // Debug logging - check actual comment structure
                if (hasComments) {
                  console.log(`Line ${lineNumber}/${originalLineNumber} has ${comments.length} comments:`, comments);
                  console.log('First comment structure:', comments[0]);
                  console.log('Comment IDs:', comments.map(c => c.id));
                }
                
                return (
                  <React.Fragment key={`${index}-${lineNumber}-${originalLineNumber}`}>
                    <div
                    className={`flex group transition-colors ${
                      line.type === 'add'
                        ? 'bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/40'
                        : line.type === 'remove'
                        ? 'bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/40'
                        : line.type === 'header'
                        ? 'bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/40'
                        : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    } ${hasComments ? 'border-l-4 border-l-blue-500' : ''}`}
                  >
                      <div className="flex-shrink-0 w-12 text-right text-gray-400 dark:text-gray-500 text-xs px-2 py-1 border-r border-gray-200 dark:border-gray-700 select-none relative">
                        {line.newLineNum || ''}
                        {/* Comment button */}
                        {(line.newLineNum || line.oldLineNum) && line.type !== 'header' && (
                          <button
                            onClick={() => handleAddComment(
                              line.newLineNum || line.oldLineNum || 0,
                              line.oldLineNum
                            )}
                            className="absolute -right-1 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 p-1 bg-blue-600 text-white rounded hover:bg-blue-700 hover:scale-110 shadow-lg"
                            title="Add comment"
                          >
                            <MessageSquare className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div className="flex-shrink-0 w-12 text-right text-gray-400 dark:text-gray-500 text-xs px-2 py-1 border-r border-gray-200 dark:border-gray-700 select-none">
                        {line.oldLineNum || ''}
                      </div>
                      <div className={`flex-1 px-2 py-1 relative ${
                        line.type === 'add'
                          ? 'text-green-800 dark:text-green-200'
                          : line.type === 'remove'
                          ? 'text-red-800 dark:text-red-200'
                          : line.type === 'header'
                          ? 'text-blue-800 dark:text-blue-200'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}>
                        {renderHighlightedCode(line.content)}
                        {/* Comment indicator */}
                        {hasComments && (
                          <div className="absolute right-2 top-1 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                              {comments.length}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Inline comment form */}
                    {activeCommentLine?.lineNum === lineNumber && 
                     ((line.newLineNum && line.newLineNum === activeCommentLine.lineNum) ||
                      (line.oldLineNum && !line.newLineNum && line.oldLineNum === activeCommentLine.oldLineNum)) && (
                      <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
                        <div className="flex flex-col gap-3">
                          <textarea
                            autoFocus
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Leave a comment..."
                            className="w-full min-h-[100px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                                     bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                                     focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                     placeholder-gray-400 dark:placeholder-gray-500
                                     resize-y text-sm"
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                handleCancelComment();
                              } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                handleSubmitComment();
                              }
                            }}
                          />
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Tip: Press Esc to cancel, Cmd+Enter to submit
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={handleCancelComment}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300
                                         bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600
                                         rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleSubmitComment}
                                disabled={!commentText.trim()}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600
                                         rounded-md hover:bg-blue-700 transition-colors
                                         disabled:bg-gray-400 disabled:cursor-not-allowed"
                              >
                                Comment
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* GitHub-style inline comments */}
                    {hasComments && (
                      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                        {comments.map((comment, commentIndex) => (
                          <div
                            key={comment.id}
                            className={`border-b border-gray-100 dark:border-gray-800 ${
                              commentIndex === comments.length - 1 ? 'border-b-0' : ''
                            } ${
                              readComments.has(comment.id.toString())
                                ? 'bg-gray-50 dark:bg-gray-800/50 opacity-75'
                                : ''
                            }`}
                          >
                            <div className="flex items-start gap-3 p-4">
                              {/* Enhanced Avatar */}
                              <div className="relative">
                                {(() => {
                                  // Handle different data structures from GitHub API
                                  const user = comment.user || comment.author;
                                  const avatarUrl = user?.avatar_url;
                                  const login = user?.login || user?.name || 'Unknown';
                                  
                                  return avatarUrl ? (
                                    <img
                                      src={avatarUrl}
                                      alt={login}
                                      className="w-10 h-10 rounded-full flex-shrink-0 ring-2 ring-white dark:ring-gray-700"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0 ring-2 ring-white dark:ring-gray-700">
                                      <span className="text-white font-semibold text-sm">
                                        {login.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                  );
                                })()}
                                {/* Online indicator */}
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
                              </div>
                              
                              {/* Comment Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {(() => {
                                      const user = comment.user || comment.author;
                                      return user?.login || user?.name || 'Unknown User';
                                    })()}
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {comment.created_at ? new Date(comment.created_at).toLocaleString() : ''}
                                  </span>
                                  {comment.updated_at && comment.updated_at !== comment.created_at && (
                                    <span className="text-xs text-blue-600 dark:text-blue-400">
                                      • edited
                                    </span>
                                  )}
                                </div>
                                <div className="prose prose-sm max-w-none dark:prose-invert">
                                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
                                    {comment.body}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Comment Actions */}
                              <div className="flex items-center gap-2">
                                {/* Add Reaction Button */}
                                <div className="relative">
                                  <button
                                    onClick={() => setShowReactionsPanel(showReactionsPanel === comment.id ? null : comment.id)}
                                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                                    title="Add reaction"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </button>
                                  
                                  {/* Reactions Panel */}
                                  {showReactionsPanel === comment.id && (
                                    <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-2 flex gap-1 z-10">
                                      {[
                                        { emoji: '👍', content: '+1' },
                                        { emoji: '👎', content: '-1' },
                                        { emoji: '😄', content: 'laugh' },
                                        { emoji: '🎉', content: 'hooray' },
                                        { emoji: '😕', content: 'confused' },
                                        { emoji: '❤️', content: 'heart' },
                                        { emoji: '🚀', content: 'rocket' },
                                        { emoji: '👀', content: 'eyes' }
                                      ].map(({ emoji, content }) => (
                                        <button
                                          key={content}
                                          onClick={async () => {
                                            setShowReactionsPanel(null);
                                            if (onAddReaction) {
                                              await onAddReaction(comment.id, content);
                                            }
                                          }}
                                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-lg"
                                          title={content}
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                
                                {/* GitHub Reactions */}
                                {comment.reactions && comment.reactions.length > 0 && (
                                  <div className="flex items-center gap-1 mr-2">
                                    {(() => {
                                      const reactionCounts = comment.reactions!.reduce((acc, reaction) => {
                                        acc[reaction.content] = (acc[reaction.content] || 0) + 1;
                                        return acc;
                                      }, {} as Record<string, number>);
                                      
                                      const reactionEmojis: Record<string, string> = {
                                        '+1': '👍',
                                        '-1': '👎',
                                        'laugh': '😄',
                                        'hooray': '🎉',
                                        'confused': '😕',
                                        'heart': '❤️',
                                        'rocket': '🚀',
                                        'eyes': '👀'
                                      };

                                      return Object.entries(reactionCounts).map(([content, count]) => {
                                        // Check if current user has already reacted with this content
                                        const userReaction = comment.reactions!.find(r => 
                                          r.content === content && r.user?.login === currentUser
                                        );
                                        
                                        return (
                                          <button
                                            key={content}
                                            onClick={async () => {
                                              if (userReaction && onRemoveReaction) {
                                                await onRemoveReaction(userReaction.id);
                                              } else if (onAddReaction) {
                                                await onAddReaction(comment.id, content as Reaction['content']);
                                              }
                                            }}
                                            className={`flex items-center gap-1 px-2 py-1 text-xs border rounded-full transition-colors ${
                                              userReaction 
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                                                : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                                            }`}
                                            title={userReaction ? `Click to remove your ${content} reaction` : `${count} reaction${count > 1 ? 's' : ''}`}
                                          >
                                            <span>{reactionEmojis[content] || content}</span>
                                            <span className="text-gray-600 dark:text-gray-400">{count}</span>
                                          </button>
                                        );
                                      });
                                    })()}
                                  </div>
                                )}
                                
                                <button
                                  onClick={() => toggleLikeComment(comment.id.toString())}
                                  className={`p-1.5 transition-colors rounded ${
                                    likedComments.has(comment.id.toString())
                                      ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                                      : 'text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                  }`}
                                  title={likedComments.has(comment.id.toString()) ? 'Unlike' : 'Like'}
                                >
                                  <svg className="w-4 h-4" fill={likedComments.has(comment.id.toString()) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0112.215 21H5a2 2 0 01-1.789-2.894l3.5-7A2 2 0 0110.236 6H14a2 2 0 002 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => toggleReadComment(comment.id.toString())}
                                  className={`p-1.5 transition-colors rounded ${
                                    readComments.has(comment.id.toString())
                                      ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30'
                                      : 'text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                                  }`}
                                  title={readComments.has(comment.id.toString()) ? 'Mark as unread' : 'Mark as read'}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {readComments.has(comment.id.toString()) ? (
                                      <>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </>
                                    ) : (
                                      <>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                      </>
                                    )}
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </React.Fragment>
                );
              })}
            </div>
          ) : (
            <div className="flex">
              {/* Left side (old) */}
              <div className="w-1/2 font-mono text-sm border-r border-gray-200 dark:border-gray-700">
                {parsedLines.map((line, index) => (
                  <div
                    key={`left-${index}`}
                    className={`flex ${
                      line.type === 'remove'
                        ? 'bg-red-100 dark:bg-red-900/30'
                        : line.type === 'context'
                        ? 'bg-white dark:bg-gray-900'
                        : line.type === 'header'
                        ? 'bg-blue-100 dark:bg-blue-900/30'
                        : ''
                    }`}
                  >
                    <div className="flex-shrink-0 w-12 text-right text-gray-400 dark:text-gray-500 text-xs px-2 py-1 border-r border-gray-200 dark:border-gray-700 select-none">
                      {line.oldLineNum || ''}
                    </div>
                    <div className={`flex-1 px-2 py-1 ${
                      line.type === 'remove'
                        ? 'text-red-800 dark:text-red-200'
                        : line.type === 'header'
                        ? 'text-blue-800 dark:text-blue-200'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {line.type !== 'add' ? renderHighlightedCode(line.content) : <pre></pre>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Right side (new) */}
              <div className="w-1/2 font-mono text-sm">
                {parsedLines.map((line, index) => (
                  <div
                    key={`right-${index}`}
                    className={`flex ${
                      line.type === 'add'
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : line.type === 'context'
                        ? 'bg-white dark:bg-gray-900'
                        : line.type === 'header'
                        ? 'bg-blue-100 dark:bg-blue-900/30'
                        : ''
                    }`}
                  >
                    <div className="flex-shrink-0 w-12 text-right text-gray-400 dark:text-gray-500 text-xs px-2 py-1 border-r border-gray-200 dark:border-gray-700 select-none">
                      {line.newLineNum || ''}
                    </div>
                    <div className={`flex-1 px-2 py-1 ${
                      line.type === 'add'
                        ? 'text-green-800 dark:text-green-200'
                        : line.type === 'header'
                        ? 'text-blue-800 dark:text-blue-200'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {line.type !== 'remove' ? renderHighlightedCode(line.content) : <pre></pre>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiRepoDiffViewer;