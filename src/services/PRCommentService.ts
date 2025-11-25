export interface Reaction {
  id: number;
  user: {
    login: string;
    avatar_url?: string;
  };
  content: '+1' | '-1' | 'laugh' | 'hooray' | 'confused' | 'heart' | 'rocket' | 'eyes';
  created_at: string;
}

export interface LineComment {
  id: string;
  line: number;
  originalLine?: number;
  body: string;
  author: {
    login: string;
    avatar_url?: string;
  };
  created_at: string;
  updated_at?: string;
  path: string;
  position?: number;
  commitId: string;
  in_reply_to?: string;
  reactions?: Reaction[];
}

export interface NewComment {
  body: string;
  line?: number;
  original_line?: number;
  path: string;
  position?: number;
  commit_id?: string;
  in_reply_to?: string;
  subject_type?: 'line' | 'file';
}

class PRCommentService {
  async addLineComment(
    repoOwner: string,
    repoName: string,
    prNumber: number,
    comment: NewComment,
    token: string
  ): Promise<LineComment> {
    // Validate required fields
    if (!comment.path || comment.path === '') {
      throw new Error('File path is required for line comments');
    }

    // For line comments, we need either line or original_line, and position
    const payload: any = {
      body: comment.body,
      path: comment.path,
    };

    if (comment.line) {
      payload.line = comment.line;
    }
    if (comment.original_line) {
      payload.original_line = comment.original_line;
    }
    if (comment.position) {
      payload.position = comment.position;
    }
    if (comment.commit_id) {
      payload.commit_id = comment.commit_id;
    }
    if (comment.in_reply_to) {
      payload.in_reply_to = comment.in_reply_to;
    }

    const response = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/pulls/${prNumber}/comments`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('GitHub API Error:', errorData);
      throw new Error(errorData.message || `Failed to add comment: ${response.status}`);
    }

    return response.json();
  }

  async getPRComments(
    repoOwner: string,
    repoName: string,
    prNumber: number,
    token: string
  ): Promise<LineComment[]> {
    const response = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/pulls/${prNumber}/comments`,
      {
        headers: {
          'Authorization': token ? `token ${token}` : '',
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to fetch comments: ${response.status}`);
    }

    return response.json();
  }

  async updateComment(
    repoOwner: string,
    repoName: string,
    commentId: string,
    body: string,
    token: string
  ): Promise<LineComment> {
    const response = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/pulls/comments/${commentId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to update comment: ${response.status}`);
    }

    return response.json();
  }

  async deleteComment(
    repoOwner: string,
    repoName: string,
    commentId: string,
    token: string
  ): Promise<void> {
    const response = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/pulls/comments/${commentId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to delete comment: ${response.status}`);
    }
  }

  // Add a general PR comment (issue comment, not line comment)
  async addPRComment(
    repoOwner: string,
    repoName: string,
    prNumber: number,
    body: string,
    token: string
  ): Promise<any> {
    const response = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/issues/${prNumber}/comments`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to add PR comment: ${response.status}`);
    }

    return response.json();
  }

  // Get general PR comments (issue comments)
  async getPRIssueComments(
    repoOwner: string,
    repoName: string,
    prNumber: number,
    token: string
  ): Promise<any[]> {
    const response = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/issues/${prNumber}/comments`,
      {
        headers: {
          'Authorization': token ? `token ${token}` : '',
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to fetch PR comments: ${response.status}`);
    }

    return response.json();
  }

  // Get comments for a specific file and line
  getCommentsForLine(comments: LineComment[], filePath: string, line: number): LineComment[] {
    return comments.filter(comment => 
      comment.path === filePath && 
      (comment.line === line || comment.original_line === line)
    );
  }

  // Get comments for a specific file
  getCommentsForFile(comments: LineComment[], filePath: string): LineComment[] {
    return comments.filter(comment => comment.path === filePath);
  }

  // Group comments by file
  groupCommentsByFile(comments: LineComment[]): Record<string, LineComment[]> {
    return comments.reduce((acc, comment) => {
      if (!acc[comment.path]) {
        acc[comment.path] = [];
      }
      acc[comment.path].push(comment);
      return acc;
    }, {} as Record<string, LineComment[]>);
  }

  // Get reactions for a comment
  async getCommentReactions(
    repoOwner: string,
    repoName: string,
    commentId: string,
    token: string
  ): Promise<Reaction[]> {
    const response = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/issues/comments/${commentId}/reactions`,
      {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to fetch reactions: ${response.status}`);
    }

    return response.json();
  }

  // Add a reaction to a comment
  async addCommentReaction(
    repoOwner: string,
    repoName: string,
    commentId: string,
    content: '+1' | '-1' | 'laugh' | 'hooray' | 'confused' | 'heart' | 'rocket' | 'eyes',
    token: string
  ): Promise<Reaction> {
    const response = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/issues/comments/${commentId}/reactions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to add reaction: ${response.status}`);
    }

    return response.json();
  }

  // Remove a reaction from a comment
  async removeCommentReaction(
    repoOwner: string,
    repoName: string,
    reactionId: number,
    token: string
  ): Promise<void> {
    const response = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/reactions/${reactionId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to remove reaction: ${response.status}`);
    }
  }

  // Get reactions for a pull request comment
  async getPRCommentReactions(
    repoOwner: string,
    repoName: string,
    commentId: string,
    token: string
  ): Promise<Reaction[]> {
    const response = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/pulls/comments/${commentId}/reactions`,
      {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to fetch PR comment reactions: ${response.status}`);
    }

    return response.json();
  }

  // Add a reaction to a pull request comment
  async addPRCommentReaction(
    repoOwner: string,
    repoName: string,
    commentId: string,
    content: '+1' | '-1' | 'laugh' | 'hooray' | 'confused' | 'heart' | 'rocket' | 'eyes',
    token: string
  ): Promise<Reaction> {
    const response = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/pulls/comments/${commentId}/reactions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to add PR comment reaction: ${response.status}`);
    }

    return response.json();
  }

  // Load comments with reactions
  async getPRCommentsWithReactions(
    repoOwner: string,
    repoName: string,
    prNumber: number,
    token: string
  ): Promise<LineComment[]> {
    const comments = await this.getPRComments(repoOwner, repoName, prNumber, token);
    
    // Load reactions for each comment
    const commentsWithReactions = await Promise.all(
      comments.map(async (comment) => {
        try {
          const reactions = await this.getPRCommentReactions(repoOwner, repoName, comment.id, token);
          return { ...comment, reactions };
        } catch (error) {
          console.warn(`Failed to load reactions for comment ${comment.id}:`, error);
          return { ...comment, reactions: [] };
        }
      })
    );

    return commentsWithReactions;
  }
}

export const prCommentService = new PRCommentService();