import { requestUrl, Notice } from "obsidian";
import type { VaultSnapshot } from "@vault-insights/shared";

// `dashboard-assets.generated.ts` is generated during build. We import the type/value.
// In dev, it might not exist until we run the embed script, so we use a safe import or assume it's there.
// @ts-ignore
import { DASHBOARD_ASSETS } from "./embedded-dashboard/dashboard-assets.generated";

export class DeployOrchestrator {
  private token: string;
  private owner: string = "";

  constructor(token: string) {
    this.token = token;
  }

  private async request(path: string, options: any = {}) {
    const url = path.startsWith("http") ? path : `https://api.github.com${path}`;
    
    try {
      const response = await requestUrl({
        url,
        method: options.method || "GET",
        headers: {
          "Authorization": `Bearer ${this.token}`,
          "Accept": "application/vnd.github.v3+json",
          "Content-Type": "application/json",
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      return { status: response.status, data: response.json };
    } catch (err: any) {
      if (err.status) {
        return { status: err.status, data: err.json || {} };
      }
      throw err;
    }
  }

  async runDeployment(repoName: string, snapshot: VaultSnapshot, label: string): Promise<void> {
    try {
      // 1. Get authenticated user
      const userRes = await this.request("/user");
      if (userRes.status !== 200) {
        throw new Error("Failed to authenticate with GitHub. Token may be expired.");
      }
      this.owner = userRes.data.login;
      new Notice(`Vault Insights: Authenticated as ${this.owner}`);

      // 2. Create Repository (or skip if exists)
      new Notice("Vault Insights: Preparing repository...");
      await this.createRepository(repoName);

      // 3. Push Dashboard Assets (HTML, JS, CSS)
      new Notice("Vault Insights: Deploying dashboard assets...");
      await this.pushDashboardAssets(repoName);

      // 4. Push Initial Snapshot
      new Notice("Vault Insights: Pushing initial data snapshot...");
      await this.pushSnapshot(repoName, snapshot, label);

      // 5. Enable GitHub Pages
      new Notice("Vault Insights: Enabling GitHub Pages...");
      await this.enableGitHubPages(repoName);

      new Notice(`Vault Insights: Deployment Complete! Visit https://${this.owner}.github.io/${repoName}/ (It may take a few minutes to go live)`);
      
    } catch (error: any) {
      console.error("DeployOrchestrator Error:", error);
      new Notice(`Vault Insights Deployment Failed: ${error.message}`);
    }
  }

  async pushSnapshotOnly(repoName: string, snapshot: VaultSnapshot, label: string): Promise<void> {
    try {
      // 1. Get authenticated user
      const userRes = await this.request("/user");
      if (userRes.status !== 200) {
        throw new Error("Failed to authenticate with GitHub. Token may be expired.");
      }
      this.owner = userRes.data.login;

      // 2. Push snapshot
      await this.pushSnapshot(repoName, snapshot, label);
      
      // No success Notice here to avoid spamming the user on background syncs
    } catch (error: any) {
      console.error("DeployOrchestrator Error (Sync):", error);
      throw error; // Re-throw to let the caller handle consecutive failure counts
    }
  }

  private async createRepository(repoName: string) {
    const res = await this.request("/user/repos", {
      method: "POST",
      body: {
        name: repoName,
        description: "Vault Insights Dashboard",
        private: false, // Pages requires public repo for free accounts
        auto_init: true, // Creates an initial commit so we have a main branch
      }
    });

    if (res.status === 422) {
      // Usually means repo already exists, which is fine.
      console.log(`Repository ${repoName} already exists.`);
    } else if (res.status !== 201) {
      throw new Error(`Failed to create repository: ${res.data.message}`);
    } else {
      // Give GitHub a moment to initialize the repo
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  private async pushDashboardAssets(repoName: string) {
    if (!DASHBOARD_ASSETS) {
      throw new Error("Dashboard assets are not available. Please rebuild the plugin.");
    }

    for (const [filePath, asset] of Object.entries(DASHBOARD_ASSETS as Record<string, any>)) {
      await this.putFile(repoName, filePath, asset.content, asset.type === "base64");
    }
  }

  private async pushSnapshot(repoName: string, snapshot: VaultSnapshot, label: string) {
    const vaultId = snapshot.vaultId;

    // 1. Push snapshot.json
    await this.putFile(
      repoName, 
      `vaults/${vaultId}/snapshot.json`, 
      JSON.stringify(snapshot, null, 2), 
      false
    );

    // 2. Read-modify-write index.json with optimistic locking
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        let sha: string | undefined = undefined;
        let indexData: any = { schemaVersion: 1, vaults: [] };

        // GET current index.json
        const getRes = await this.request(`/repos/${this.owner}/${repoName}/contents/vaults/index.json`);
        
        if (getRes.status === 200 && getRes.data.content) {
          sha = getRes.data.sha;
          try {
            const decoded = decodeURIComponent(escape(window.atob(getRes.data.content)));
            indexData = JSON.parse(decoded);
          } catch (e) {
            console.warn("Failed to parse existing index.json, overwriting.", e);
          }
        }

        // Make sure it's valid structure
        if (!indexData || !Array.isArray(indexData.vaults)) {
          indexData = { schemaVersion: 1, vaults: [] };
        }

        // Upsert vault entry
        const existingIndex = indexData.vaults.findIndex((v: any) => v.vaultId === vaultId);
        const vaultEntry = {
          vaultId: vaultId,
          snapshotPath: `/vaults/${vaultId}/snapshot.json`,
          label: label || vaultId
        };

        if (existingIndex >= 0) {
          indexData.vaults[existingIndex] = vaultEntry;
        } else {
          indexData.vaults.push(vaultEntry);
        }

        const contentStr = JSON.stringify(indexData, null, 2);
        const contentBase64 = window.btoa(unescape(encodeURIComponent(contentStr)));

        // PUT updated index.json
        const putRes = await this.request(`/repos/${this.owner}/${repoName}/contents/vaults/index.json`, {
          method: "PUT",
          body: {
            message: `Vault Insights: Update index.json for ${label}`,
            content: contentBase64,
            sha: sha
          }
        });

        if (putRes.status === 200 || putRes.status === 201) {
          return; // Success
        }

        if (putRes.status === 409) {
          console.warn(`Conflict updating index.json (Attempt ${attempt}/${maxRetries}). Retrying...`);
          if (attempt === maxRetries) {
            throw new Error("Conflict updating index.json: Max retries exceeded.");
          }
          // Jitter delay: 500ms to 2000ms
          const delay = Math.floor(Math.random() * 1500) + 500;
          await new Promise(r => setTimeout(r, delay));
          continue; // Retry
        }

        throw new Error(`Failed to update index.json. Status: ${putRes.status}`);

      } catch (error: any) {
        if (attempt === maxRetries) {
          throw error;
        }
        console.warn(`Error updating index.json (Attempt ${attempt}/${maxRetries}).`, error);
        const delay = Math.floor(Math.random() * 1500) + 500;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  private async putFile(repoName: string, path: string, content: string, isBase64: boolean) {
    // Get file SHA if it exists to update it
    let sha: string | undefined = undefined;
    const getRes = await this.request(`/repos/${this.owner}/${repoName}/contents/${path}`);
    if (getRes.status === 200 && getRes.data.sha) {
      sha = getRes.data.sha;
    }

    // Convert string to base64 for GitHub API if it's text
    const contentBase64 = isBase64 ? content : window.btoa(unescape(encodeURIComponent(content)));

    const putRes = await this.request(`/repos/${this.owner}/${repoName}/contents/${path}`, {
      method: "PUT",
      body: {
        message: `Vault Insights: Update ${path}`,
        content: contentBase64,
        sha: sha
      }
    });

    if (putRes.status !== 200 && putRes.status !== 201) {
      console.error(`Failed to push ${path}`, putRes.data);
      // We don't throw to allow other files to continue, but ideally we should.
    }
  }

  private async enableGitHubPages(repoName: string) {
    const res = await this.request(`/repos/${this.owner}/${repoName}/pages`, {
      method: "POST",
      headers: {
        "Accept": "application/vnd.github.switcheroo-preview+json" // legacy header sometimes needed
      },
      body: {
        source: {
          branch: "main",
          path: "/"
        }
      }
    });

    if (res.status === 409) {
      // Pages already enabled
      console.log(`GitHub Pages is already enabled for ${repoName}.`);
    } else if (res.status !== 201) {
      console.log(`Could not enable GitHub Pages automatically: ${res.data.message}`);
      // Usually, if the repo is empty or doesn't have a main branch, it might fail.
    }
  }
}
