import { useState } from 'react';
import { X, Search, FileText, Zap } from 'lucide-react';
import { requestTemplates, getTemplateCategories, searchTemplates, type RequestTemplate } from '../../data/requestTemplates';
import type { ApiRequest } from '../../api/apiTester';

interface TemplatesBrowserProps {
  onSelectTemplate: (request: ApiRequest, name: string) => void;
  onClose: () => void;
}

export default function TemplatesBrowser({ onSelectTemplate, onClose }: TemplatesBrowserProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const categories = getTemplateCategories();

  const displayedTemplates = searchQuery
    ? searchTemplates(searchQuery)
    : selectedCategory
    ? requestTemplates.filter(t => t.category === selectedCategory)
    : requestTemplates;

  const handleSelectTemplate = (template: RequestTemplate) => {
    onSelectTemplate(template.request, template.name);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-5xl mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Request Templates
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Start with pre-configured requests for common scenarios
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Categories */}
          <div className="w-64 border-r border-gray-200 dark:border-slate-700 flex flex-col">
            <div className="p-3">
              <div className="relative mb-3">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedCategory(null);
                  }}
                  placeholder="Search templates..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="px-2">
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setSearchQuery('');
                  }}
                  className={`w-full text-left px-3 py-2 text-sm rounded mb-1 transition-colors ${
                    !selectedCategory && !searchQuery
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
                >
                  All Templates ({requestTemplates.length})
                </button>

                <div className="mt-3 mb-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  Categories
                </div>

                {categories.map(category => {
                  const count = requestTemplates.filter(t => t.category === category).length;
                  return (
                    <button
                      key={category}
                      onClick={() => {
                        setSelectedCategory(category);
                        setSearchQuery('');
                      }}
                      className={`w-full text-left px-3 py-2 text-sm rounded mb-1 transition-colors ${
                        selectedCategory === category
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 font-medium'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{category}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{count}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Content - Templates */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {searchQuery
                  ? `Found ${displayedTemplates.length} template${displayedTemplates.length !== 1 ? 's' : ''} matching "${searchQuery}"`
                  : selectedCategory
                  ? `${displayedTemplates.length} template${displayedTemplates.length !== 1 ? 's' : ''} in ${selectedCategory}`
                  : `${displayedTemplates.length} templates available`}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {displayedTemplates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className="text-left p-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:border-yellow-500 dark:hover:border-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/10 transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded group-hover:bg-yellow-200 dark:group-hover:bg-yellow-900/40 transition-colors">
                        <FileText className="w-5 h-5 text-yellow-700 dark:text-yellow-300" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white mb-1">
                          {template.name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {template.description}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                            template.request.method === 'GET'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              : template.request.method === 'POST'
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                              : template.request.method === 'PUT' || template.request.method === 'PATCH'
                              ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          }`}>
                            {template.request.method}
                          </span>

                          {template.tags.map(tag => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {displayedTemplates.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  <Search className="w-12 h-12 mb-3 text-gray-400" />
                  <p className="text-sm">No templates found</p>
                  <p className="text-xs mt-1">Try a different search term</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Click on a template to start using it
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
