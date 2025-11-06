/**
 * Environment Variables Storage Service
 * Manages environments and variables for API testing
 */

export interface EnvironmentVariable {
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

export interface Environment {
  id: string;
  name: string;
  variables: EnvironmentVariable[];
  createdAt: number;
  updatedAt: number;
}

class EnvironmentStorage {
  private storageKey = 'apiTester:environments';
  private activeEnvKey = 'apiTester:activeEnvironment';

  /**
   * Get all environments
   */
  getEnvironments(): Environment[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      console.error('Failed to load environments:', error);
      return [];
    }
  }

  /**
   * Get active environment ID
   */
  getActiveEnvironmentId(): string | null {
    try {
      return localStorage.getItem(this.activeEnvKey);
    } catch (error) {
      console.error('Failed to load active environment:', error);
      return null;
    }
  }

  /**
   * Set active environment
   */
  setActiveEnvironment(envId: string | null): void {
    try {
      if (envId) {
        localStorage.setItem(this.activeEnvKey, envId);
      } else {
        localStorage.removeItem(this.activeEnvKey);
      }
    } catch (error) {
      console.error('Failed to set active environment:', error);
    }
  }

  /**
   * Get active environment
   */
  getActiveEnvironment(): Environment | null {
    const activeId = this.getActiveEnvironmentId();
    if (!activeId) return null;

    const environments = this.getEnvironments();
    return environments.find(env => env.id === activeId) || null;
  }

  /**
   * Create a new environment
   */
  createEnvironment(name: string, variables: EnvironmentVariable[] = []): Environment {
    try {
      const environments = this.getEnvironments();
      const newEnv: Environment = {
        id: `env_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        variables,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      environments.push(newEnv);
      localStorage.setItem(this.storageKey, JSON.stringify(environments));

      // Set as active if it's the first environment
      if (environments.length === 1) {
        this.setActiveEnvironment(newEnv.id);
      }

      return newEnv;
    } catch (error) {
      console.error('Failed to create environment:', error);
      throw error;
    }
  }

  /**
   * Update an environment
   */
  updateEnvironment(id: string, updates: Partial<Omit<Environment, 'id' | 'createdAt'>>): void {
    try {
      const environments = this.getEnvironments();
      const index = environments.findIndex(env => env.id === id);

      if (index !== -1) {
        environments[index] = {
          ...environments[index],
          ...updates,
          updatedAt: Date.now(),
        };
        localStorage.setItem(this.storageKey, JSON.stringify(environments));
      }
    } catch (error) {
      console.error('Failed to update environment:', error);
    }
  }

  /**
   * Delete an environment
   */
  deleteEnvironment(id: string): void {
    try {
      const environments = this.getEnvironments();
      const filtered = environments.filter(env => env.id !== id);
      localStorage.setItem(this.storageKey, JSON.stringify(filtered));

      // Clear active if deleting active environment
      if (this.getActiveEnvironmentId() === id) {
        this.setActiveEnvironment(filtered.length > 0 ? filtered[0].id : null);
      }
    } catch (error) {
      console.error('Failed to delete environment:', error);
    }
  }

  /**
   * Duplicate an environment
   */
  duplicateEnvironment(id: string): Environment | null {
    try {
      const environments = this.getEnvironments();
      const env = environments.find(e => e.id === id);

      if (!env) return null;

      return this.createEnvironment(
        `${env.name} (Copy)`,
        JSON.parse(JSON.stringify(env.variables))
      );
    } catch (error) {
      console.error('Failed to duplicate environment:', error);
      return null;
    }
  }

  /**
   * Replace variables in a string with their values
   * Supports {{variableName}} syntax
   */
  replaceVariables(text: string, envId?: string): string {
    const env = envId
      ? this.getEnvironments().find(e => e.id === envId)
      : this.getActiveEnvironment();

    if (!env) return text;

    let result = text;

    // Replace {{variableName}} with actual values
    env.variables
      .filter(v => v.enabled)
      .forEach(variable => {
        const regex = new RegExp(`\\{\\{\\s*${variable.key}\\s*\\}\\}`, 'g');
        result = result.replace(regex, variable.value);
      });

    return result;
  }

  /**
   * Get all variable names from active environment (for autocomplete)
   */
  getVariableNames(): string[] {
    const env = this.getActiveEnvironment();
    if (!env) return [];

    return env.variables
      .filter(v => v.enabled)
      .map(v => v.key);
  }

  /**
   * Extract variables from text (find all {{variableName}} patterns)
   */
  extractVariables(text: string): string[] {
    const regex = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
    const matches = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (!matches.includes(match[1])) {
        matches.push(match[1]);
      }
    }

    return matches;
  }

  /**
   * Set a variable in the active environment
   */
  setVariable(key: string, value: string): void {
    const env = this.getActiveEnvironment();
    if (!env) return;

    const existingIndex = env.variables.findIndex(v => v.key === key);

    if (existingIndex >= 0) {
      // Update existing variable
      env.variables[existingIndex].value = value;
    } else {
      // Add new variable
      env.variables.push({
        key,
        value,
        enabled: true,
        description: 'Auto-extracted from response',
      });
    }

    this.updateEnvironment(env.id, { variables: env.variables });
  }

  /**
   * Get a variable value from active environment
   */
  getVariable(key: string): string | null {
    const env = this.getActiveEnvironment();
    if (!env) return null;

    const variable = env.variables.find(v => v.key === key && v.enabled);
    return variable ? variable.value : null;
  }

  /**
   * Extract value from JSON response using JSONPath-like syntax
   * Examples: "data.token", "user.id", "items[0].name"
   */
  extractFromResponse(responseData: any, path: string): string | null {
    try {
      const parts = path.split('.');
      let current = responseData;

      for (const part of parts) {
        // Handle array index notation: items[0]
        const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
        if (arrayMatch) {
          const [, key, index] = arrayMatch;
          current = current[key]?.[parseInt(index)];
        } else {
          current = current[part];
        }

        if (current === undefined || current === null) {
          return null;
        }
      }

      return String(current);
    } catch (error) {
      console.error('Failed to extract from response:', error);
      return null;
    }
  }
}

export const environmentStorage = new EnvironmentStorage();
