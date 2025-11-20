import express, { Request, Response } from 'express';
import { SSMClient, GetParametersByPathCommand, DescribeInstanceInformationCommand, StartSessionCommand, TerminateSessionCommand, SendCommandCommand } from '@aws-sdk/client-ssm';
import { S3Client, ListBucketsCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { LambdaClient, ListFunctionsCommand } from '@aws-sdk/client-lambda';
import { CloudWatchLogsClient, FilterLogEventsCommand, DescribeLogGroupsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { CloudWatchClient, ListMetricsCommand, GetMetricDataCommand, DescribeAlarmsCommand } from '@aws-sdk/client-cloudwatch';
import { EC2Client, DescribeInstancesCommand, StartInstancesCommand, StopInstancesCommand, RebootInstancesCommand } from '@aws-sdk/client-ec2';
import { ECSClient, ListClustersCommand, ListServicesCommand, ListTasksCommand, DescribeTasksCommand, DescribeTaskDefinitionCommand, UpdateServiceCommand, RunTaskCommand, StopTaskCommand } from '@aws-sdk/client-ecs';
import { IAMClient, ListUsersCommand, GetUserPolicyCommand, SimulatePrincipalPolicyCommand, ListAttachedUserPoliciesCommand, ListUserPoliciesCommand } from '@aws-sdk/client-iam';
import { CloudTrailClient, LookupEventsCommand } from '@aws-sdk/client-cloudtrail';
import { APIGatewayClient, GetRestApisCommand, GetStagesCommand, GetDeploymentsCommand, GetApiKeysCommand, GetUsagePlansCommand } from '@aws-sdk/client-api-gateway';
import { ApiGatewayV2Client, GetApisCommand } from '@aws-sdk/client-apigatewayv2';
import { EventBridgeClient, ListRulesCommand, EnableRuleCommand, DisableRuleCommand } from '@aws-sdk/client-eventbridge';
import { ElasticBeanstalkClient, DescribeApplicationsCommand, DescribeEnvironmentsCommand, DescribeEventsCommand, DescribeConfigurationSettingsCommand, RequestEnvironmentInfoCommand, RetrieveEnvironmentInfoCommand } from '@aws-sdk/client-elastic-beanstalk';
import { CodeDeployClient, ListApplicationsCommand, ListDeploymentGroupsCommand, ListDeploymentsCommand, ListDeploymentInstancesCommand, GetDeploymentInstanceCommand } from '@aws-sdk/client-codedeploy';

const router = express.Router();

// Helper to create AWS credentials config
function getAWSConfig(region: string, accessKeyId: string, secretAccessKey: string) {
  return {
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  };
}

// ====================
// SSM Parameter Store
// ====================

router.post('/ssm/parameters', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey, path } = req.body;

    if (!region || !accessKeyId || !secretAccessKey) {
      return res.status(400).json({ message: 'Missing required AWS credentials' });
    }

    const client = new SSMClient(getAWSConfig(region, accessKeyId, secretAccessKey));

    const parameters: any[] = [];
    let nextToken: string | undefined;

    do {
      const command = new GetParametersByPathCommand({
        Path: path || '/',
        Recursive: true,
        WithDecryption: true,
        MaxResults: 10,
        NextToken: nextToken,
      });

      const response = await client.send(command);

      if (response.Parameters) {
        parameters.push(...response.Parameters.map(param => ({
          name: param.Name,
          type: param.Type,
          value: param.Value,
          version: param.Version,
          lastModified: param.LastModifiedDate?.toISOString(),
          description: '',
        })));
      }

      nextToken = response.NextToken;
    } while (nextToken);

    res.json({ parameters });
  } catch (error: any) {
    console.error('SSM parameters error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch SSM parameters' });
  }
});

// ====================
// SSM Session Manager
// ====================

router.post('/ssm/instances', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey } = req.body;

    const client = new SSMClient(getAWSConfig(region, accessKeyId, secretAccessKey));
    const command = new DescribeInstanceInformationCommand({});
    const response = await client.send(command);

    const instances = response.InstanceInformationList?.map(instance => ({
      instanceId: instance.InstanceId,
      name: instance.Name || instance.InstanceId,
      platformType: instance.PlatformType,
      platformName: instance.PlatformName,
      platformVersion: instance.PlatformVersion,
      agentVersion: instance.AgentVersion,
      lastPingDateTime: instance.LastPingDateTime?.toISOString(),
      pingStatus: instance.PingStatus,
      ipAddress: instance.IPAddress,
    })) || [];

    res.json({ instances });
  } catch (error: any) {
    console.error('SSM instances error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch SSM instances' });
  }
});

router.post('/ssm/start-session', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey, instanceId } = req.body;

    const client = new SSMClient(getAWSConfig(region, accessKeyId, secretAccessKey));
    const command = new StartSessionCommand({
      Target: instanceId,
    });
    const response = await client.send(command);

    res.json({
      sessionId: response.SessionId,
      streamUrl: response.StreamUrl,
      tokenValue: response.TokenValue,
    });
  } catch (error: any) {
    console.error('SSM start session error:', error);
    res.status(500).json({ message: error.message || 'Failed to start session' });
  }
});

router.post('/ssm/terminate-session', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey, sessionId } = req.body;

    const client = new SSMClient(getAWSConfig(region, accessKeyId, secretAccessKey));
    const command = new TerminateSessionCommand({
      SessionId: sessionId,
    });
    await client.send(command);

    res.json({ success: true });
  } catch (error: any) {
    console.error('SSM terminate session error:', error);
    res.status(500).json({ message: error.message || 'Failed to terminate session' });
  }
});

router.post('/ssm/send-command', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey, instanceId, command: cmd } = req.body;

    const client = new SSMClient(getAWSConfig(region, accessKeyId, secretAccessKey));
    const command = new SendCommandCommand({
      InstanceIds: [instanceId],
      DocumentName: 'AWS-RunShellScript',
      Parameters: {
        commands: [cmd],
      },
    });
    const response = await client.send(command);

    res.json({
      commandId: response.Command?.CommandId,
      status: response.Command?.Status,
    });
  } catch (error: any) {
    console.error('SSM send command error:', error);
    res.status(500).json({ message: error.message || 'Failed to send command' });
  }
});

// ====================
// S3
// ====================

router.post('/s3/buckets', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey } = req.body;

    const client = new S3Client(getAWSConfig(region, accessKeyId, secretAccessKey));
    const command = new ListBucketsCommand({});
    const response = await client.send(command);

    const buckets = response.Buckets?.map(bucket => ({
      name: bucket.Name,
      creationDate: bucket.CreationDate?.toISOString(),
    })) || [];

    res.json({ buckets });
  } catch (error: any) {
    console.error('S3 buckets error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch buckets' });
  }
});

router.post('/s3/objects', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey, bucket, prefix } = req.body;

    const client = new S3Client(getAWSConfig(region, accessKeyId, secretAccessKey));
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix || '',
      Delimiter: '/',
    });
    const response = await client.send(command);

    const objects = [
      ...(response.CommonPrefixes?.map(prefix => ({
        key: prefix.Prefix,
        isFolder: true,
      })) || []),
      ...(response.Contents?.map(obj => ({
        key: obj.Key,
        size: obj.Size,
        lastModified: obj.LastModified?.toISOString(),
        isFolder: false,
      })) || []),
    ];

    res.json({ objects });
  } catch (error: any) {
    console.error('S3 objects error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch objects' });
  }
});

router.post('/s3/download', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey, bucket, key } = req.body;

    const client = new S3Client(getAWSConfig(region, accessKeyId, secretAccessKey));
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    const response = await client.send(command);

    const bodyContents = await response.Body?.transformToString();

    res.json({
      content: bodyContents,
      contentType: response.ContentType,
    });
  } catch (error: any) {
    console.error('S3 download error:', error);
    res.status(500).json({ message: error.message || 'Failed to download object' });
  }
});

// ====================
// Lambda
// ====================

router.post('/lambda/functions', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey } = req.body;

    const client = new LambdaClient(getAWSConfig(region, accessKeyId, secretAccessKey));
    const command = new ListFunctionsCommand({});
    const response = await client.send(command);

    const functions = response.Functions?.map(fn => ({
      name: fn.FunctionName,
      runtime: fn.Runtime,
      handler: fn.Handler,
      lastModified: fn.LastModified,
      memorySize: fn.MemorySize,
      timeout: fn.Timeout,
      description: fn.Description,
    })) || [];

    res.json({ functions });
  } catch (error: any) {
    console.error('Lambda functions error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch Lambda functions' });
  }
});

router.post('/lambda/logs', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey, functionName, startTime, endTime } = req.body;

    const client = new CloudWatchLogsClient(getAWSConfig(region, accessKeyId, secretAccessKey));
    const logGroupName = `/aws/lambda/${functionName}`;

    const command = new FilterLogEventsCommand({
      logGroupName,
      startTime: startTime ? new Date(startTime).getTime() : Date.now() - 3600000,
      endTime: endTime ? new Date(endTime).getTime() : Date.now(),
      limit: 100,
    });
    const response = await client.send(command);

    const events = response.events?.map(event => ({
      timestamp: event.timestamp,
      message: event.message,
      logStreamName: event.logStreamName,
    })) || [];

    res.json({ events });
  } catch (error: any) {
    console.error('Lambda logs error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch Lambda logs' });
  }
});

// ====================
// CloudWatch
// ====================

router.post('/cloudwatch/metrics', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey, namespace } = req.body;

    const client = new CloudWatchClient(getAWSConfig(region, accessKeyId, secretAccessKey));
    const command = new ListMetricsCommand({
      Namespace: namespace,
    });
    const response = await client.send(command);

    const metrics = response.Metrics?.map(metric => ({
      namespace: metric.Namespace,
      metricName: metric.MetricName,
      dimensions: metric.Dimensions,
    })) || [];

    res.json({ metrics });
  } catch (error: any) {
    console.error('CloudWatch metrics error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch metrics' });
  }
});

router.post('/cloudwatch/metric-data', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey, namespace, metricName, dimensions, startTime, endTime, period, stat } = req.body;

    const client = new CloudWatchClient(getAWSConfig(region, accessKeyId, secretAccessKey));
    const command = new GetMetricDataCommand({
      MetricDataQueries: [{
        Id: 'm1',
        MetricStat: {
          Metric: {
            Namespace: namespace,
            MetricName: metricName,
            Dimensions: dimensions,
          },
          Period: period || 300,
          Stat: stat || 'Average',
        },
      }],
      StartTime: new Date(startTime),
      EndTime: new Date(endTime),
    });
    const response = await client.send(command);

    res.json({
      timestamps: response.MetricDataResults?.[0]?.Timestamps,
      values: response.MetricDataResults?.[0]?.Values,
    });
  } catch (error: any) {
    console.error('CloudWatch metric data error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch metric data' });
  }
});

router.post('/cloudwatch/alarms', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey } = req.body;

    const client = new CloudWatchClient(getAWSConfig(region, accessKeyId, secretAccessKey));
    const command = new DescribeAlarmsCommand({});
    const response = await client.send(command);

    const alarms = response.MetricAlarms?.map(alarm => ({
      alarmName: alarm.AlarmName,
      stateValue: alarm.StateValue,
      metricName: alarm.MetricName,
      namespace: alarm.Namespace,
      threshold: alarm.Threshold,
      comparisonOperator: alarm.ComparisonOperator,
      evaluationPeriods: alarm.EvaluationPeriods,
    })) || [];

    res.json({ alarms });
  } catch (error: any) {
    console.error('CloudWatch alarms error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch alarms' });
  }
});

// ====================
// EC2
// ====================

router.post('/ec2/instances', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey } = req.body;

    const client = new EC2Client(getAWSConfig(region, accessKeyId, secretAccessKey));
    const command = new DescribeInstancesCommand({});
    const response = await client.send(command);

    const instances: any[] = [];
    response.Reservations?.forEach(reservation => {
      reservation.Instances?.forEach(instance => {
        instances.push({
          instanceId: instance.InstanceId,
          instanceType: instance.InstanceType,
          state: instance.State?.Name,
          publicIp: instance.PublicIpAddress,
          privateIp: instance.PrivateIpAddress,
          launchTime: instance.LaunchTime?.toISOString(),
          name: instance.Tags?.find(tag => tag.Key === 'Name')?.Value || instance.InstanceId,
          availabilityZone: instance.Placement?.AvailabilityZone,
        });
      });
    });

    res.json({ instances });
  } catch (error: any) {
    console.error('EC2 instances error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch EC2 instances' });
  }
});

router.post('/ec2/instance-metrics', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey, instanceId } = req.body;

    const client = new CloudWatchClient(getAWSConfig(region, accessKeyId, secretAccessKey));
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 3600000); // Last hour

    const command = new GetMetricDataCommand({
      MetricDataQueries: [
        {
          Id: 'cpu',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/EC2',
              MetricName: 'CPUUtilization',
              Dimensions: [{ Name: 'InstanceId', Value: instanceId }],
            },
            Period: 300,
            Stat: 'Average',
          },
        },
      ],
      StartTime: startTime,
      EndTime: endTime,
    });
    const response = await client.send(command);

    res.json({
      cpu: {
        timestamps: response.MetricDataResults?.[0]?.Timestamps,
        values: response.MetricDataResults?.[0]?.Values,
      },
    });
  } catch (error: any) {
    console.error('EC2 metrics error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch EC2 metrics' });
  }
});

router.post('/ec2/start-instance', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey, instanceId } = req.body;

    const client = new EC2Client(getAWSConfig(region, accessKeyId, secretAccessKey));
    const command = new StartInstancesCommand({
      InstanceIds: [instanceId],
    });
    const response = await client.send(command);

    res.json({
      previousState: response.StartingInstances?.[0]?.PreviousState?.Name,
      currentState: response.StartingInstances?.[0]?.CurrentState?.Name,
    });
  } catch (error: any) {
    console.error('EC2 start instance error:', error);
    res.status(500).json({ message: error.message || 'Failed to start instance' });
  }
});

router.post('/ec2/stop-instance', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey, instanceId } = req.body;

    const client = new EC2Client(getAWSConfig(region, accessKeyId, secretAccessKey));
    const command = new StopInstancesCommand({
      InstanceIds: [instanceId],
    });
    const response = await client.send(command);

    res.json({
      previousState: response.StoppingInstances?.[0]?.PreviousState?.Name,
      currentState: response.StoppingInstances?.[0]?.CurrentState?.Name,
    });
  } catch (error: any) {
    console.error('EC2 stop instance error:', error);
    res.status(500).json({ message: error.message || 'Failed to stop instance' });
  }
});

router.post('/ec2/restart-instance', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey, instanceId } = req.body;

    const client = new EC2Client(getAWSConfig(region, accessKeyId, secretAccessKey));
    const command = new RebootInstancesCommand({
      InstanceIds: [instanceId],
    });
    await client.send(command);

    res.json({ success: true });
  } catch (error: any) {
    console.error('EC2 restart instance error:', error);
    res.status(500).json({ message: error.message || 'Failed to restart instance' });
  }
});

// ====================
// ECS
// ====================

router.post('/ecs/clusters', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey } = req.body;

    const client = new ECSClient(getAWSConfig(region, accessKeyId, secretAccessKey));
    const command = new ListClustersCommand({});
    const response = await client.send(command);

    const clusters = response.clusterArns?.map(arn => ({
      arn,
      name: arn.split('/').pop(),
    })) || [];

    res.json({ clusters });
  } catch (error: any) {
    console.error('ECS clusters error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch ECS clusters' });
  }
});

router.post('/ecs/services', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey, cluster } = req.body;

    const client = new ECSClient(getAWSConfig(region, accessKeyId, secretAccessKey));
    const command = new ListServicesCommand({
      cluster,
    });
    const response = await client.send(command);

    const services = response.serviceArns?.map(arn => ({
      arn,
      name: arn.split('/').pop(),
    })) || [];

    res.json({ services });
  } catch (error: any) {
    console.error('ECS services error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch ECS services' });
  }
});

router.post('/ecs/tasks', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey, cluster, serviceName } = req.body;

    const client = new ECSClient(getAWSConfig(region, accessKeyId, secretAccessKey));
    const listCommand = new ListTasksCommand({
      cluster,
      serviceName,
    });
    const listResponse = await client.send(listCommand);

    if (!listResponse.taskArns?.length) {
      return res.json({ tasks: [] });
    }

    const describeCommand = new DescribeTasksCommand({
      cluster,
      tasks: listResponse.taskArns,
    });
    const describeResponse = await client.send(describeCommand);

    const tasks = describeResponse.tasks?.map(task => ({
      taskArn: task.taskArn,
      taskDefinitionArn: task.taskDefinitionArn,
      lastStatus: task.lastStatus,
      desiredStatus: task.desiredStatus,
      cpu: task.cpu,
      memory: task.memory,
      startedAt: task.startedAt?.toISOString(),
      containers: task.containers?.map(c => ({
        name: c.name,
        lastStatus: c.lastStatus,
        exitCode: c.exitCode,
      })),
    })) || [];

    res.json({ tasks });
  } catch (error: any) {
    console.error('ECS tasks error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch ECS tasks' });
  }
});

router.post('/ecs/task-definition', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey, taskDefinitionArn } = req.body;

    const client = new ECSClient(getAWSConfig(region, accessKeyId, secretAccessKey));
    const command = new DescribeTaskDefinitionCommand({
      taskDefinition: taskDefinitionArn,
    });
    const response = await client.send(command);

    res.json({
      taskDefinition: {
        family: response.taskDefinition?.family,
        cpu: response.taskDefinition?.cpu,
        memory: response.taskDefinition?.memory,
        containerDefinitions: response.taskDefinition?.containerDefinitions,
      },
    });
  } catch (error: any) {
    console.error('ECS task definition error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch task definition' });
  }
});

router.post('/ecs/task-logs', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey, logGroupName, logStreamName } = req.body;

    const client = new CloudWatchLogsClient(getAWSConfig(region, accessKeyId, secretAccessKey));
    const command = new FilterLogEventsCommand({
      logGroupName,
      logStreamNames: logStreamName ? [logStreamName] : undefined,
      startTime: Date.now() - 3600000,
      endTime: Date.now(),
      limit: 100,
    });
    const response = await client.send(command);

    const events = response.events?.map(event => ({
      timestamp: event.timestamp,
      message: event.message,
    })) || [];

    res.json({ events });
  } catch (error: any) {
    console.error('ECS task logs error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch task logs' });
  }
});

router.post('/ecs/scale-service', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey, cluster, serviceName, desiredCount } = req.body;

    const client = new ECSClient(getAWSConfig(region, accessKeyId, secretAccessKey));
    const command = new UpdateServiceCommand({
      cluster,
      service: serviceName,
      desiredCount,
    });
    const response = await client.send(command);

    res.json({
      serviceName: response.service?.serviceName,
      desiredCount: response.service?.desiredCount,
      runningCount: response.service?.runningCount,
    });
  } catch (error: any) {
    console.error('ECS scale service error:', error);
    res.status(500).json({ message: error.message || 'Failed to scale service' });
  }
});

router.post('/ecs/start-task', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey, cluster, taskDefinition } = req.body;

    const client = new ECSClient(getAWSConfig(region, accessKeyId, secretAccessKey));
    const command = new RunTaskCommand({
      cluster,
      taskDefinition,
      launchType: 'FARGATE',
    });
    const response = await client.send(command);

    res.json({
      tasks: response.tasks?.map(task => ({
        taskArn: task.taskArn,
        lastStatus: task.lastStatus,
      })),
    });
  } catch (error: any) {
    console.error('ECS start task error:', error);
    res.status(500).json({ message: error.message || 'Failed to start task' });
  }
});

router.post('/ecs/stop-task', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey, cluster, taskArn } = req.body;

    const client = new ECSClient(getAWSConfig(region, accessKeyId, secretAccessKey));
    const command = new StopTaskCommand({
      cluster,
      task: taskArn,
    });
    const response = await client.send(command);

    res.json({
      taskArn: response.task?.taskArn,
      lastStatus: response.task?.lastStatus,
    });
  } catch (error: any) {
    console.error('ECS stop task error:', error);
    res.status(500).json({ message: error.message || 'Failed to stop task' });
  }
});

// ====================
// IAM
// ====================

router.post('/iam/users', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey } = req.body;

    const client = new IAMClient(getAWSConfig(region, accessKeyId, secretAccessKey));
    const command = new ListUsersCommand({});
    const response = await client.send(command);

    const users = response.Users?.map(user => ({
      userName: user.UserName,
      userId: user.UserId,
      arn: user.Arn,
      createDate: user.CreateDate?.toISOString(),
    })) || [];

    res.json({ users });
  } catch (error: any) {
    console.error('IAM users error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch IAM users' });
  }
});

router.post('/iam/permissions', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey, userName } = req.body;

    const client = new IAMClient(getAWSConfig(region, accessKeyId, secretAccessKey));

    // Get attached policies
    const attachedCommand = new ListAttachedUserPoliciesCommand({
      UserName: userName,
    });
    const attachedResponse = await client.send(attachedCommand);

    // Get inline policies
    const inlineCommand = new ListUserPoliciesCommand({
      UserName: userName,
    });
    const inlineResponse = await client.send(inlineCommand);

    res.json({
      attachedPolicies: attachedResponse.AttachedPolicies || [],
      inlinePolicies: inlineResponse.PolicyNames || [],
    });
  } catch (error: any) {
    console.error('IAM permissions error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch IAM permissions' });
  }
});

router.post('/iam/simulate', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey, policySourceArn, actionNames, resourceArns } = req.body;

    const client = new IAMClient(getAWSConfig(region, accessKeyId, secretAccessKey));
    const command = new SimulatePrincipalPolicyCommand({
      PolicySourceArn: policySourceArn,
      ActionNames: actionNames,
      ResourceArns: resourceArns,
    });
    const response = await client.send(command);

    const results = response.EvaluationResults?.map(result => ({
      actionName: result.EvalActionName,
      decision: result.EvalDecision,
      resourceName: result.EvalResourceName,
    })) || [];

    res.json({ results });
  } catch (error: any) {
    console.error('IAM simulate error:', error);
    res.status(500).json({ message: error.message || 'Failed to simulate IAM policy' });
  }
});

// ====================
// CloudTrail
// ====================

router.post('/cloudtrail/events', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey, startTime, endTime, eventName } = req.body;

    const client = new CloudTrailClient(getAWSConfig(region, accessKeyId, secretAccessKey));
    const command = new LookupEventsCommand({
      StartTime: startTime ? new Date(startTime) : new Date(Date.now() - 86400000),
      EndTime: endTime ? new Date(endTime) : new Date(),
      LookupAttributes: eventName ? [{ AttributeKey: 'EventName', AttributeValue: eventName }] : undefined,
    });
    const response = await client.send(command);

    const events = response.Events?.map(event => ({
      eventId: event.EventId,
      eventName: event.EventName,
      eventTime: event.EventTime?.toISOString(),
      username: event.Username,
      eventSource: event.EventSource,
      resources: event.Resources,
    })) || [];

    res.json({ events });
  } catch (error: any) {
    console.error('CloudTrail events error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch CloudTrail events' });
  }
});

// ====================
// API Gateway
// ====================

router.post('/apigateway/rest-apis', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey } = req.body;

    const client = new APIGatewayClient(getAWSConfig(region, accessKeyId, secretAccessKey));
    const command = new GetRestApisCommand({});
    const response = await client.send(command);

    const apis = response.items?.map(api => ({
      id: api.id,
      name: api.name,
      description: api.description,
      createdDate: api.createdDate?.toISOString(),
    })) || [];

    res.json({ apis });
  } catch (error: any) {
    console.error('API Gateway REST APIs error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch REST APIs' });
  }
});

router.post('/apigateway/http-apis', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey } = req.body;

    const client = new ApiGatewayV2Client(getAWSConfig(region, accessKeyId, secretAccessKey));
    const command = new GetApisCommand({});
    const response = await client.send(command);

    const apis = response.Items?.map(api => ({
      apiId: api.ApiId,
      name: api.Name,
      protocolType: api.ProtocolType,
      apiEndpoint: api.ApiEndpoint,
    })) || [];

    res.json({ apis });
  } catch (error: any) {
    console.error('API Gateway HTTP APIs error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch HTTP APIs' });
  }
});

router.post('/apigateway/stages', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey, restApiId } = req.body;

    const client = new APIGatewayClient(getAWSConfig(region, accessKeyId, secretAccessKey));
    const command = new GetStagesCommand({
      restApiId,
    });
    const response = await client.send(command);

    const stages = response.item?.map(stage => ({
      stageName: stage.stageName,
      deploymentId: stage.deploymentId,
      createdDate: stage.createdDate?.toISOString(),
      lastUpdatedDate: stage.lastUpdatedDate?.toISOString(),
    })) || [];

    res.json({ stages });
  } catch (error: any) {
    console.error('API Gateway stages error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch stages' });
  }
});

router.post('/apigateway/deployments', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey, restApiId } = req.body;

    const client = new APIGatewayClient(getAWSConfig(region, accessKeyId, secretAccessKey));
    const command = new GetDeploymentsCommand({
      restApiId,
    });
    const response = await client.send(command);

    const deployments = response.items?.map(deployment => ({
      id: deployment.id,
      description: deployment.description,
      createdDate: deployment.createdDate?.toISOString(),
    })) || [];

    res.json({ deployments });
  } catch (error: any) {
    console.error('API Gateway deployments error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch deployments' });
  }
});

router.post('/apigateway/api-keys', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey } = req.body;

    const client = new APIGatewayClient(getAWSConfig(region, accessKeyId, secretAccessKey));
    const command = new GetApiKeysCommand({
      includeValues: true,
    });
    const response = await client.send(command);

    const apiKeys = response.items?.map(key => ({
      id: key.id,
      name: key.name,
      enabled: key.enabled,
      createdDate: key.createdDate?.toISOString(),
      lastUpdatedDate: key.lastUpdatedDate?.toISOString(),
    })) || [];

    res.json({ apiKeys });
  } catch (error: any) {
    console.error('API Gateway API keys error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch API keys' });
  }
});

router.post('/apigateway/usage-plans', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey } = req.body;

    const client = new APIGatewayClient(getAWSConfig(region, accessKeyId, secretAccessKey));
    const command = new GetUsagePlansCommand({});
    const response = await client.send(command);

    const usagePlans = response.items?.map(plan => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      throttle: plan.throttle,
      quota: plan.quota,
    })) || [];

    res.json({ usagePlans });
  } catch (error: any) {
    console.error('API Gateway usage plans error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch usage plans' });
  }
});

router.post('/apigateway/logs', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey, restApiId, stageName } = req.body;

    const client = new CloudWatchLogsClient(getAWSConfig(region, accessKeyId, secretAccessKey));
    const logGroupName = `API-Gateway-Execution-Logs_${restApiId}/${stageName}`;

    const command = new FilterLogEventsCommand({
      logGroupName,
      startTime: Date.now() - 3600000,
      endTime: Date.now(),
      limit: 100,
    });
    const response = await client.send(command);

    const events = response.events?.map(event => ({
      timestamp: event.timestamp,
      message: event.message,
    })) || [];

    res.json({ events });
  } catch (error: any) {
    console.error('API Gateway logs error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch API Gateway logs' });
  }
});

// ====================
// EventBridge
// ====================

router.post('/eventbridge/rules', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey, eventBusName } = req.body;

    const client = new EventBridgeClient(getAWSConfig(region, accessKeyId, secretAccessKey));
    const command = new ListRulesCommand({
      EventBusName: eventBusName || 'default',
    });
    const response = await client.send(command);

    const rules = response.Rules?.map(rule => ({
      name: rule.Name,
      arn: rule.Arn,
      state: rule.State,
      description: rule.Description,
      scheduleExpression: rule.ScheduleExpression,
      eventPattern: rule.EventPattern,
    })) || [];

    res.json({ rules });
  } catch (error: any) {
    console.error('EventBridge rules error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch EventBridge rules' });
  }
});

router.post('/eventbridge/rule-metrics', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey, ruleName } = req.body;

    const client = new CloudWatchClient(getAWSConfig(region, accessKeyId, secretAccessKey));
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 3600000);

    const command = new GetMetricDataCommand({
      MetricDataQueries: [
        {
          Id: 'invocations',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/Events',
              MetricName: 'Invocations',
              Dimensions: [{ Name: 'RuleName', Value: ruleName }],
            },
            Period: 300,
            Stat: 'Sum',
          },
        },
      ],
      StartTime: startTime,
      EndTime: endTime,
    });
    const response = await client.send(command);

    res.json({
      invocations: {
        timestamps: response.MetricDataResults?.[0]?.Timestamps,
        values: response.MetricDataResults?.[0]?.Values,
      },
    });
  } catch (error: any) {
    console.error('EventBridge rule metrics error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch rule metrics' });
  }
});

router.post('/eventbridge/toggle-rule', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey, ruleName, enable, eventBusName } = req.body;

    const client = new EventBridgeClient(getAWSConfig(region, accessKeyId, secretAccessKey));

    const command = enable
      ? new EnableRuleCommand({ Name: ruleName, EventBusName: eventBusName || 'default' })
      : new DisableRuleCommand({ Name: ruleName, EventBusName: eventBusName || 'default' });

    await client.send(command);

    res.json({ success: true });
  } catch (error: any) {
    console.error('EventBridge toggle rule error:', error);
    res.status(500).json({ message: error.message || 'Failed to toggle rule' });
  }
});

// ====================
// Elastic Beanstalk
// ====================

router.post('/elasticbeanstalk/applications', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey } = req.body;

    const client = new ElasticBeanstalkClient(getAWSConfig(region, accessKeyId, secretAccessKey));
    const command = new DescribeApplicationsCommand({});
    const response = await client.send(command);

    const applications = response.Applications?.map(app => ({
      applicationName: app.ApplicationName,
      description: app.Description,
      dateCreated: app.DateCreated?.toISOString(),
      dateUpdated: app.DateUpdated?.toISOString(),
    })) || [];

    res.json({ applications });
  } catch (error: any) {
    console.error('Elastic Beanstalk applications error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch applications' });
  }
});

router.post('/elasticbeanstalk/environments', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey, applicationName } = req.body;

    const client = new ElasticBeanstalkClient(getAWSConfig(region, accessKeyId, secretAccessKey));
    const command = new DescribeEnvironmentsCommand({
      ApplicationName: applicationName,
    });
    const response = await client.send(command);

    const environments = response.Environments?.map(env => ({
      environmentId: env.EnvironmentId,
      environmentName: env.EnvironmentName,
      status: env.Status,
      health: env.Health,
      healthStatus: env.HealthStatus,
      solutionStackName: env.SolutionStackName,
      endpointURL: env.EndpointURL,
      dateCreated: env.DateCreated?.toISOString(),
      dateUpdated: env.DateUpdated?.toISOString(),
    })) || [];

    res.json({ environments });
  } catch (error: any) {
    console.error('Elastic Beanstalk environments error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch environments' });
  }
});

router.post('/elasticbeanstalk/deployments', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey, applicationName, environmentName } = req.body;

    const client = new ElasticBeanstalkClient(getAWSConfig(region, accessKeyId, secretAccessKey));
    const command = new DescribeEventsCommand({
      ApplicationName: applicationName,
      EnvironmentName: environmentName,
      MaxRecords: 50,
    });
    const response = await client.send(command);

    const events = response.Events?.map(event => ({
      eventDate: event.EventDate?.toISOString(),
      message: event.Message,
      severity: event.Severity,
      requestId: event.RequestId,
    })) || [];

    res.json({ events });
  } catch (error: any) {
    console.error('Elastic Beanstalk deployments error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch deployment events' });
  }
});

router.post('/elasticbeanstalk/environment-variables', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey, applicationName, environmentName } = req.body;

    const client = new ElasticBeanstalkClient(getAWSConfig(region, accessKeyId, secretAccessKey));
    const command = new DescribeConfigurationSettingsCommand({
      ApplicationName: applicationName,
      EnvironmentName: environmentName,
    });
    const response = await client.send(command);

    const envVars: Record<string, string> = {};
    response.ConfigurationSettings?.[0]?.OptionSettings?.forEach(setting => {
      if (setting.Namespace === 'aws:elasticbeanstalk:application:environment' && setting.OptionName && setting.Value) {
        envVars[setting.OptionName] = setting.Value;
      }
    });

    res.json({ environmentVariables: envVars });
  } catch (error: any) {
    console.error('Elastic Beanstalk environment variables error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch environment variables' });
  }
});

router.post('/elasticbeanstalk/logs', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey, environmentId } = req.body;

    const client = new ElasticBeanstalkClient(getAWSConfig(region, accessKeyId, secretAccessKey));

    // Request logs
    const requestCommand = new RequestEnvironmentInfoCommand({
      EnvironmentId: environmentId,
      InfoType: 'tail',
    });
    await client.send(requestCommand);

    // Wait a bit for logs to be generated
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Retrieve logs
    const retrieveCommand = new RetrieveEnvironmentInfoCommand({
      EnvironmentId: environmentId,
      InfoType: 'tail',
    });
    const response = await client.send(retrieveCommand);

    const logs = response.EnvironmentInfo?.map(info => ({
      ec2InstanceId: info.Ec2InstanceId,
      sampleTimestamp: info.SampleTimestamp?.toISOString(),
      message: info.Message,
    })) || [];

    res.json({ logs });
  } catch (error: any) {
    console.error('Elastic Beanstalk logs error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch logs' });
  }
});

// ====================
// CodeDeploy
// ====================

router.post('/codedeploy/applications', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey } = req.body;

    const client = new CodeDeployClient(getAWSConfig(region, accessKeyId, secretAccessKey));
    const command = new ListApplicationsCommand({});
    const response = await client.send(command);

    const applications = response.applications?.map(name => ({
      applicationName: name,
    })) || [];

    res.json({ applications });
  } catch (error: any) {
    console.error('CodeDeploy applications error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch applications' });
  }
});

router.post('/codedeploy/deployment-groups', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey, applicationName } = req.body;

    const client = new CodeDeployClient(getAWSConfig(region, accessKeyId, secretAccessKey));
    const command = new ListDeploymentGroupsCommand({
      applicationName,
    });
    const response = await client.send(command);

    const deploymentGroups = response.deploymentGroups?.map(name => ({
      deploymentGroupName: name,
    })) || [];

    res.json({ deploymentGroups });
  } catch (error: any) {
    console.error('CodeDeploy deployment groups error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch deployment groups' });
  }
});

router.post('/codedeploy/deployments', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey, applicationName, deploymentGroupName } = req.body;

    const client = new CodeDeployClient(getAWSConfig(region, accessKeyId, secretAccessKey));
    const command = new ListDeploymentsCommand({
      applicationName,
      deploymentGroupName,
    });
    const response = await client.send(command);

    const deployments = response.deployments?.map(id => ({
      deploymentId: id,
    })) || [];

    res.json({ deployments });
  } catch (error: any) {
    console.error('CodeDeploy deployments error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch deployments' });
  }
});

router.post('/codedeploy/deployment-instances', async (req: Request, res: Response) => {
  try {
    const { region, accessKeyId, secretAccessKey, deploymentId } = req.body;

    const client = new CodeDeployClient(getAWSConfig(region, accessKeyId, secretAccessKey));
    const listCommand = new ListDeploymentInstancesCommand({
      deploymentId,
    });
    const listResponse = await client.send(listCommand);

    const instances: any[] = [];
    if (listResponse.instancesList?.length) {
      for (const instanceId of listResponse.instancesList) {
        const getCommand = new GetDeploymentInstanceCommand({
          deploymentId,
          instanceId,
        });
        const instanceResponse = await client.send(getCommand);
        instances.push({
          instanceId: instanceResponse.instanceSummary?.instanceId,
          status: instanceResponse.instanceSummary?.status,
          lastUpdatedAt: instanceResponse.instanceSummary?.lastUpdatedAt?.toISOString(),
        });
      }
    }

    res.json({ instances });
  } catch (error: any) {
    console.error('CodeDeploy deployment instances error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch deployment instances' });
  }
});

export default router;
