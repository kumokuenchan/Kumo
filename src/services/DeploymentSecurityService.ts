export interface DeploymentEnvironment {
  id: number;
  name: string;
  url?: string;
  environment: string;
  state: 'pending' | 'success' | 'failure' | 'inactive';
  created_at: string;
  updated_at: string;
  creator?: {
    login: string;
    avatar_url: string;
  };
  description?: string;
}

class DeploymentSecurityService {
  async getDeploymentsForPR(
    repoOwner: string,
    repoName: string,
    prNumber: number,
    token: string
  ): Promise<DeploymentEnvironment[]> {
    try {
      // Get the PR head SHA
      const prResponse = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/pulls/${prNumber}`,
        {
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );

      if (!prResponse.ok) {
        throw new Error(`Failed to fetch PR: ${prResponse.status}`);
      }

      const pr = await prResponse.json();
      const headSha = pr.head.sha;

      // Get deployments for this commit
      const deploymentsResponse = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/deployments?sha=${headSha}`,
        {
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );

      if (!deploymentsResponse.ok) {
        console.warn(`Failed to fetch deployments: ${deploymentsResponse.status}`);
        return [];
      }

      const deployments = await deploymentsResponse.json();

      // Get deployment statuses for each deployment
      const deploymentWithStatuses = await Promise.all(
        deployments.map(async (deployment: any) => {
          try {
            const statusResponse = await fetch(
              `https://api.github.com/repos/${repoOwner}/${repoName}/deployments/${deployment.id}/statuses`,
              {
                headers: {
                  'Authorization': `token ${token}`,
                  'Accept': 'application/vnd.github.v3+json',
                },
              }
            );

            if (statusResponse.ok) {
              const statuses = await statusResponse.json();
              const latestStatus = statuses[0]; // Most recent status

              return {
                id: deployment.id,
                name: deployment.environment,
                url: deployment.html_url,
                environment: deployment.environment,
                state: latestStatus?.state || 'pending',
                created_at: deployment.created_at,
                updated_at: latestStatus?.updated_at || deployment.updated_at,
                creator: deployment.creator,
                description: latestStatus?.description,
              };
            }

            return {
              id: deployment.id,
              name: deployment.environment,
              environment: deployment.environment,
              state: 'pending',
              created_at: deployment.created_at,
              updated_at: deployment.updated_at,
              creator: deployment.creator,
            };
          } catch (error) {
            console.error(`Failed to fetch deployment status for ${deployment.id}:`, error);
            return {
              id: deployment.id,
              name: deployment.environment,
              environment: deployment.environment,
              state: 'pending',
              created_at: deployment.created_at,
              updated_at: deployment.updated_at,
              creator: deployment.creator,
            };
          }
        })
      );

      return deploymentWithStatuses;
    } catch (error) {
      console.error('Failed to get deployments:', error);
      throw error;
    }
  }
}

export const deploymentSecurityService = new DeploymentSecurityService();