interface CIStatus {
  id: string;
  name: string;
  state: 'pending' | 'success' | 'failure' | 'error';
  description?: string;
  targetUrl?: string;
  createdAt: string;
  completedAt?: string;
}

interface PRCheckStatus {
  sha: string;
  total: number;
  statuses: CIStatus[];
  conclusion: 'success' | 'failure' | 'pending' | null;
}

class CICDService {
  async getPRCheckStatus(
    repoOwner: string,
    repoName: string,
    prNumber: number,
    token: string
  ): Promise<PRCheckStatus> {
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

      // Get combined status for the commit
      const statusResponse = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/commits/${headSha}/status`,
        {
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );

      if (!statusResponse.ok) {
        throw new Error(`Failed to fetch status: ${statusResponse.status}`);
      }

      const statusData = await statusResponse.json();

      // Transform GitHub API response to our format
      const statuses: CIStatus[] = statusData.statuses.map((status: any) => ({
        id: status.id.toString(),
        name: status.context,
        state: status.state,
        description: status.description,
        targetUrl: status.target_url,
        createdAt: status.created_at,
        completedAt: status.updated_at,
      }));

      return {
        sha: headSha,
        total: statusData.total_count,
        statuses,
        conclusion: statusData.state as 'success' | 'failure' | 'pending' | null,
      };
    } catch (error) {
      console.error('Failed to get PR check status:', error);
      throw error;
    }
  }

  async getPRCheckRuns(
    repoOwner: string,
    repoName: string,
    prNumber: number,
    token: string
  ): Promise<PRCheckStatus> {
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

      // Get check runs for the commit (more detailed than statuses)
      const checkRunsResponse = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/commits/${headSha}/check-runs`,
        {
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );

      if (!checkRunsResponse.ok) {
        throw new Error(`Failed to fetch check runs: ${checkRunsResponse.status}`);
      }

      const checkRunsData = await checkRunsResponse.json();

      // Transform GitHub API response to our format
      const statuses: CIStatus[] = checkRunsData.check_runs.map((run: any) => ({
        id: run.id.toString(),
        name: run.name,
        state: run.status === 'queued' ? 'pending' : 
               run.status === 'in_progress' ? 'pending' :
               run.conclusion === 'success' ? 'success' :
               run.conclusion === 'failure' ? 'failure' : 'error',
        description: run.output?.title || run.output?.summary,
        targetUrl: run.html_url,
        createdAt: run.created_at,
        completedAt: run.completed_at,
      }));

      // Determine overall conclusion
      let conclusion: 'success' | 'failure' | 'pending' | null = null;
      if (statuses.length > 0) {
        const hasFailures = statuses.some(s => s.state === 'failure' || s.state === 'error');
        const hasPending = statuses.some(s => s.state === 'pending');
        
        if (hasFailures) {
          conclusion = 'failure';
        } else if (hasPending) {
          conclusion = 'pending';
        } else {
          conclusion = 'success';
        }
      }

      return {
        sha: headSha,
        total: statuses.length,
        statuses,
        conclusion,
      };
    } catch (error) {
      console.error('Failed to get PR check runs:', error);
      throw error;
    }
  }

  // Get combined status from both statuses and check runs
  async getCompletePRStatus(
    repoOwner: string,
    repoName: string,
    prNumber: number,
    token: string
  ): Promise<PRCheckStatus> {
    try {
      const [checkStatus, checkRuns] = await Promise.all([
        this.getPRCheckStatus(repoOwner, repoName, prNumber, token),
        this.getPRCheckRuns(repoOwner, repoName, prNumber, token),
      ]);

      // Combine and deduplicate by name
      const combinedStatuses = new Map<string, CIStatus>();
      
      // Add check runs first (they're more detailed)
      checkRuns.statuses.forEach(status => {
        combinedStatuses.set(status.name, status);
      });

      // Add legacy statuses if we don't have them from check runs
      checkStatus.statuses.forEach(status => {
        if (!combinedStatuses.has(status.name)) {
          combinedStatuses.set(status.name, status);
        }
      });

      const statuses = Array.from(combinedStatuses.values());

      // Determine overall conclusion
      let conclusion: 'success' | 'failure' | 'pending' | null = null;
      if (statuses.length > 0) {
        const hasFailures = statuses.some(s => s.state === 'failure' || s.state === 'error');
        const hasPending = statuses.some(s => s.state === 'pending');
        
        if (hasFailures) {
          conclusion = 'failure';
        } else if (hasPending) {
          conclusion = 'pending';
        } else {
          conclusion = 'success';
        }
      }

      return {
        sha: checkStatus.sha,
        total: statuses.length,
        statuses,
        conclusion,
      };
    } catch (error) {
      console.error('Failed to get complete PR status:', error);
      throw error;
    }
  }
}

export const cicdService = new CICDService();