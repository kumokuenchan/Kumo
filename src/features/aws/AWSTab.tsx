import { useState, lazy, Suspense, useEffect } from 'react';
import { motion } from 'framer-motion';
import GoogleLoginButton from '../../components/GoogleLoginButton';
import { awsCredentialsService } from '../../services/AWSCredentialsService';
import { AWSCredentials } from '../../services/GoogleOAuthService';

// Lazy load heavy components
const SSMParameterStore = lazy(() => import('./SSMParameterStore'));
const CloudTrailViewer = lazy(() => import('./CloudTrailViewer'));
const S3BucketExplorer = lazy(() => import('./S3BucketExplorer'));
const LambdaLogsTailer = lazy(() => import('./LambdaLogsTailer'));
const IAMPermissionChecker = lazy(() => import('./IAMPermissionChecker'));
const APIGatewayInspector = lazy(() => import('./APIGatewayInspector'));
const CloudWatchMetricsDashboard = lazy(() => import('./CloudWatchMetricsDashboard'));
const ECSTaskManager = lazy(() => import('./ECSTaskManager'));
const SessionManager = lazy(() => import('./SessionManager'));
const EventBridgeRulesViewer = lazy(() => import('./EventBridgeRulesViewer'));
const ElasticBeanstalkManager = lazy(() => import('./ElasticBeanstalkManager'));
const EC2InstanceManager = lazy(() => import('./EC2InstanceManager'));
const CodeDeployViewer = lazy(() => import('./CodeDeployViewer'));

type AWSToolType = 'auth' | 'ssm' | 'cloudtrail' | 's3' | 'lambda' | 'iam' | 'apigateway' | 'cloudwatch' | 'ecs' | 'sessionmanager' | 'eventbridge' | 'elasticbeanstalk' | 'ec2' | 'codedeploy';

export default function AWSTab() {
  const [activeTool, setActiveTool] = useState<AWSToolType>('auth');
  const [credentials, setCredentials] = useState<AWSCredentials | null>(null);

  useEffect(() => {
    // Check for existing credentials on mount
    const existingCredentials = awsCredentialsService.getActiveCredentials();
    setCredentials(existingCredentials);
    
    if (existingCredentials) {
      setActiveTool('ssm'); // Switch to SSM if credentials exist
    }
  }, []);

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-[#f8fafc] to-[#e2e8f0] dark:from-[#0d1117] dark:to-[#1a1d23]">
      {/* Credentials Status Bar */}
      {credentials && (
        <div className="px-4 py-2 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-green-700 dark:text-green-300 font-medium">
                Authenticated as {credentials.userEmail}
              </span>
              <span className="text-green-600 dark:text-green-400">
                ({credentials.region})
              </span>
            </div>
            <button
              onClick={() => setActiveTool('auth')}
              className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200 text-xs"
            >
              Manage Credentials
            </button>
          </div>
        </div>
      )}

      {/* Tool Tabs */}
      <div className="px-4 py-2 bg-white/60 dark:bg-[#161b22]/60 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-800/50 shadow-sm">
        <div className="flex gap-1.5 overflow-x-auto">
          {[
            { id: 'auth', label: 'Authentication', icon: '🔐', color: 'from-blue-500 to-purple-500' },
            { id: 'ssm', label: 'SSM Parameter Store', icon: '🔑', color: 'from-blue-500 to-cyan-500' },
            { id: 'cloudtrail', label: 'CloudTrail Events', icon: '📋', color: 'from-purple-500 to-pink-500' },
            { id: 's3', label: 'S3 Buckets', icon: '🗄️', color: 'from-orange-500 to-red-500' },
            { id: 'lambda', label: 'Lambda Logs', icon: 'λ', color: 'from-yellow-500 to-orange-500' },
            { id: 'iam', label: 'IAM Permissions', icon: '👥', color: 'from-green-500 to-emerald-500' },
            { id: 'apigateway', label: 'API Gateway Inspector', icon: '🌐', color: 'from-indigo-500 to-purple-500' },
            { id: 'cloudwatch', label: 'CloudWatch Metrics', icon: '📊', color: 'from-teal-500 to-blue-500' },
            { id: 'ecs', label: 'ECS Task Manager', icon: '📦', color: 'from-purple-500 to-pink-500' },
            { id: 'sessionmanager', label: 'Session Manager', icon: '🖥️', color: 'from-amber-500 to-orange-500' },
            { id: 'eventbridge', label: 'EventBridge Rules', icon: '⚡', color: 'from-violet-500 to-purple-500' },
            { id: 'elasticbeanstalk', label: 'Elastic Beanstalk', icon: '☁️', color: 'from-cyan-500 to-blue-500' },
            { id: 'ec2', label: 'EC2 Instance Manager', icon: '🖥️', color: 'from-red-500 to-orange-500' },
            { id: 'codedeploy', label: 'CodeDeploy Viewer', icon: '📦', color: 'from-indigo-500 to-blue-500' },
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
          {activeTool === 'auth' && (
            <div className="flex items-center justify-center h-full p-8">
              <GoogleLoginButton
                onCredentialsReceived={(creds) => {
                  setCredentials(creds);
                  setActiveTool('ssm');
                }}
                onError={(error) => {
                  console.error('Authentication error:', error);
                }}
              />
            </div>
          )}
          {activeTool === 'ssm' && <SSMParameterStore />}
          {activeTool === 'cloudtrail' && <CloudTrailViewer />}
          {activeTool === 's3' && <S3BucketExplorer />}
          {activeTool === 'lambda' && <LambdaLogsTailer />}
          {activeTool === 'iam' && <IAMPermissionChecker />}
          {activeTool === 'apigateway' && <APIGatewayInspector />}
          {activeTool === 'cloudwatch' && <CloudWatchMetricsDashboard />}
          {activeTool === 'ecs' && <ECSTaskManager />}
          {activeTool === 'sessionmanager' && <SessionManager />}
          {activeTool === 'eventbridge' && <EventBridgeRulesViewer />}
          {activeTool === 'elasticbeanstalk' && <ElasticBeanstalkManager />}
          {activeTool === 'ec2' && <EC2InstanceManager />}
          {activeTool === 'codedeploy' && <CodeDeployViewer />}
        </Suspense>
      </div>
    </div>
  );
}
