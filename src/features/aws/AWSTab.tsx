import { useState, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';

// Lazy load heavy components
const SSMParameterStore = lazy(() => import('./SSMParameterStore'));
const CloudTrailViewer = lazy(() => import('./CloudTrailViewer'));
const S3BucketExplorer = lazy(() => import('./S3BucketExplorer'));
const LambdaLogsTailer = lazy(() => import('./LambdaLogsTailer'));
const IAMPermissionChecker = lazy(() => import('./IAMPermissionChecker'));
const APIGatewayInspector = lazy(() => import('./APIGatewayInspector'));

type AWSToolType = 'ssm' | 'cloudtrail' | 's3' | 'lambda' | 'iam' | 'apigateway';

export default function AWSTab() {
  const [activeTool, setActiveTool] = useState<AWSToolType>('ssm');

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-[#f8fafc] to-[#e2e8f0] dark:from-[#0d1117] dark:to-[#1a1d23]">
      {/* Tool Tabs */}
      <div className="px-4 py-2 bg-white/60 dark:bg-[#161b22]/60 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-800/50 shadow-sm">
        <div className="flex gap-1.5 overflow-x-auto">
          {[
            { id: 'ssm', label: 'SSM Parameter Store', icon: '🔑', color: 'from-blue-500 to-cyan-500' },
            { id: 'cloudtrail', label: 'CloudTrail Events', icon: '📋', color: 'from-purple-500 to-pink-500' },
            { id: 's3', label: 'S3 Buckets', icon: '🗄️', color: 'from-orange-500 to-red-500' },
            { id: 'lambda', label: 'Lambda Logs', icon: 'λ', color: 'from-yellow-500 to-orange-500' },
            { id: 'iam', label: 'IAM Permissions', icon: '👥', color: 'from-green-500 to-emerald-500' },
            { id: 'apigateway', label: 'API Gateway Inspector', icon: '🌐', color: 'from-indigo-500 to-purple-500' },
          ].map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id as AWSToolType)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
                activeTool === tool.id
                  ? `bg-gradient-to-r ${tool.color} text-white shadow-md`
                  : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <span className="text-sm">{tool.icon}</span>
              {tool.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tool Content */}
      <div className="flex-1 overflow-hidden">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Loading AWS tool...</div>
            </div>
          }
        >
          {activeTool === 'ssm' && <SSMParameterStore />}
          {activeTool === 'cloudtrail' && <CloudTrailViewer />}
          {activeTool === 's3' && <S3BucketExplorer />}
          {activeTool === 'lambda' && <LambdaLogsTailer />}
          {activeTool === 'iam' && <IAMPermissionChecker />}
          {activeTool === 'apigateway' && <APIGatewayInspector />}
        </Suspense>
      </div>
    </div>
  );
}
