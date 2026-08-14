export const CURRENT_APP_VERSION = '1.1.0';
export const DEFAULT_GITHUB_REPO = 'herms1982/Harrys-aircon-invoicing';

export interface GitHubReleaseAsset {
  name: string;
  size: number;
  download_count: number;
  browser_download_url: string;
  content_type: string;
}

export interface GitHubReleaseInfo {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
  assets: GitHubReleaseAsset[];
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseTitle?: string;
  releaseNotes?: string;
  publishedAt?: string;
  apkDownloadUrl?: string;
  releasePageUrl?: string;
  actionsPageUrl?: string;
  repoArchiveUrl?: string;
  apkSizeFormatted?: string;
  isTagFallback?: boolean;
  error?: string;
}

/**
 * Compare semantic versions (e.g., "1.2.0" vs "1.1.0")
 * Returns > 0 if v1 > v2, < 0 if v1 < v2, 0 if equal
 */
export function compareVersions(v1: string, v2: string): number {
  const cleanV1 = v1.replace(/^v/i, '').trim();
  const cleanV2 = v2.replace(/^v/i, '').trim();

  const parts1 = cleanV1.split('.').map((n) => parseInt(n, 10) || 0);
  const parts2 = cleanV2.split('.').map((n) => parseInt(n, 10) || 0);

  const maxLen = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  return 0;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function cleanRepoPath(repoPath: string): string {
  return repoPath
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '')
    .trim();
}

/**
 * Fetch latest release details from GitHub API with intelligent fallbacks
 */
export async function checkForGitHubUpdate(
  repoPath: string = DEFAULT_GITHUB_REPO,
  currentVersion: string = CURRENT_APP_VERSION
): Promise<UpdateCheckResult> {
  let cleanRepo = cleanRepoPath(repoPath);

  if (!cleanRepo || !cleanRepo.includes('/')) {
    return {
      hasUpdate: false,
      currentVersion,
      latestVersion: currentVersion,
      releasePageUrl: `https://github.com/${cleanRepo}`,
      actionsPageUrl: `https://github.com/${cleanRepo}/actions`,
      repoArchiveUrl: `https://github.com/${cleanRepo}/archive/refs/heads/main.zip`,
      error: 'Invalid GitHub repository format. Please enter "username/repository" (e.g. herms1982/Harrys-aircon-invoicing).',
    };
  }

  const releasePageUrl = `https://github.com/${cleanRepo}/releases`;
  const actionsPageUrl = `https://github.com/${cleanRepo}/actions`;
  const repoArchiveUrl = `https://github.com/${cleanRepo}/archive/refs/heads/main.zip`;

  const headers = {
    Accept: 'application/vnd.github.v3+json',
  };

  // Try candidate repo names (e.g. sanitized without trailing hyphens/spaces, and as entered)
  const candidateRepos = Array.from(new Set([
    cleanRepo,
    cleanRepo.replace(/[\-_]+$/, ''),
    cleanRepo.toLowerCase(),
    cleanRepo.toLowerCase().replace(/[\-_]+$/, ''),
  ])).filter(r => r.includes('/'));

  try {
    for (const targetRepo of candidateRepos) {
      // Stage 1: Try /releases/latest
      const response = await fetch(`https://api.github.com/repos/${targetRepo}/releases/latest`, { headers });
      if (response.ok) {
        const release: GitHubReleaseInfo = await response.json();
        const latestVersion = release.tag_name || release.name || currentVersion;
        const hasUpdate = compareVersions(latestVersion, currentVersion) > 0 || latestVersion !== currentVersion;
        const apkAsset = release.assets?.find(
          (a) => a.name.endsWith('.apk') || a.content_type?.includes('vnd.android.package-archive')
        );
        const directApkUrl = apkAsset?.browser_download_url || `https://github.com/${targetRepo}/releases/download/${release.tag_name || 'v1.1.0'}/app-release.apk`;

        return {
          hasUpdate,
          currentVersion,
          latestVersion,
          releaseTitle: release.name || release.tag_name,
          releaseNotes: release.body || 'New GitHub Release build available.',
          publishedAt: release.published_at ? new Date(release.published_at).toLocaleDateString() : undefined,
          apkDownloadUrl: directApkUrl,
          releasePageUrl: release.html_url || `https://github.com/${targetRepo}/releases`,
          actionsPageUrl: `https://github.com/${targetRepo}/actions`,
          repoArchiveUrl: `https://github.com/${targetRepo}/archive/refs/heads/main.zip`,
          apkSizeFormatted: apkAsset ? formatBytes(apkAsset.size) : undefined,
        };
      }

      // Stage 2: Try all /releases
      const allReleasesResp = await fetch(`https://api.github.com/repos/${targetRepo}/releases`, { headers });
      if (allReleasesResp.ok) {
        const releasesList = await allReleasesResp.json();
        if (Array.isArray(releasesList) && releasesList.length > 0) {
          const latestRel = releasesList[0];
          const latestVersion = latestRel.tag_name || latestRel.name || currentVersion;
          const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;
          const apkAsset = latestRel.assets?.find(
            (a: any) => a.name?.endsWith('.apk') || a.content_type?.includes('vnd.android.package-archive')
          );

          return {
            hasUpdate,
            currentVersion,
            latestVersion,
            releaseTitle: latestRel.name || latestRel.tag_name,
            releaseNotes: latestRel.body || 'New GitHub Release build.',
            publishedAt: latestRel.published_at ? new Date(latestRel.published_at).toLocaleDateString() : undefined,
            apkDownloadUrl: apkAsset?.browser_download_url || `https://github.com/${targetRepo}/releases/download/${latestVersion}/app-release.apk`,
            releasePageUrl: latestRel.html_url || `https://github.com/${targetRepo}/releases`,
            actionsPageUrl: `https://github.com/${targetRepo}/actions`,
            repoArchiveUrl: `https://github.com/${targetRepo}/archive/refs/heads/main.zip`,
            apkSizeFormatted: apkAsset ? formatBytes(apkAsset.size) : undefined,
          };
        }
      }

      // Stage 3: Try /tags
      const tagsResp = await fetch(`https://api.github.com/repos/${targetRepo}/tags`, { headers });
      if (tagsResp.ok) {
        const tags = await tagsResp.json();
        if (Array.isArray(tags) && tags.length > 0) {
          const latestTag = tags[0].name;
          const hasUpdate = compareVersions(latestTag, currentVersion) > 0;
          return {
            hasUpdate,
            currentVersion,
            latestVersion: latestTag,
            releaseTitle: `Tag ${latestTag}`,
            releaseNotes: `Code tag ${latestTag} found in GitHub repo. Click below to download APK or view build runs.`,
            apkDownloadUrl: `https://github.com/${targetRepo}/releases/download/${latestTag}/app-release.apk`,
            releasePageUrl: `https://github.com/${targetRepo}/releases/tag/${latestTag}`,
            actionsPageUrl: `https://github.com/${targetRepo}/actions`,
            repoArchiveUrl: `https://github.com/${targetRepo}/archive/refs/heads/main.zip`,
            isTagFallback: true,
          };
        }
      }

      // Stage 4: Check /commits (automatic default branch detection)
      const commitResp = await fetch(`https://api.github.com/repos/${targetRepo}/commits`, { headers });
      if (commitResp.ok) {
        const commits = await commitResp.json();
        if (Array.isArray(commits) && commits.length > 0) {
          const latestCommit = commits[0];
          const shortSha = latestCommit.sha ? latestCommit.sha.substring(0, 7) : 'head';
          const commitMsg = latestCommit.commit?.message?.split('\n')[0] || 'Latest repository commit';
          const commitDate = latestCommit.commit?.committer?.date ? new Date(latestCommit.commit.committer.date).toLocaleDateString() : undefined;

          return {
            hasUpdate: false,
            currentVersion,
            latestVersion: `git-${shortSha}`,
            releaseTitle: `Repository Connected (${shortSha})`,
            releaseNotes: `Latest commit: "${commitMsg}" (${commitDate}). When you create a Release or Tag on GitHub, the automated APK builder compiles it for you.`,
            apkDownloadUrl: `https://github.com/${targetRepo}/actions`,
            releasePageUrl: `https://github.com/${targetRepo}/releases`,
            actionsPageUrl: `https://github.com/${targetRepo}/actions`,
            repoArchiveUrl: `https://github.com/${targetRepo}/archive/refs/heads/main.zip`,
            isTagFallback: true,
          };
        }
      }

      // Stage 5: Check if base repo exists
      const baseRepoResp = await fetch(`https://api.github.com/repos/${targetRepo}`, { headers });
      if (baseRepoResp.ok) {
        const repoData = await baseRepoResp.json();
        return {
          hasUpdate: false,
          currentVersion,
          latestVersion: currentVersion,
          releaseTitle: repoData.full_name,
          releaseNotes: `Repository "${repoData.full_name}" is connected! No APK releases or release tags have been published yet.`,
          releasePageUrl: `https://github.com/${targetRepo}/releases`,
          actionsPageUrl: `https://github.com/${targetRepo}/actions`,
          repoArchiveUrl: `https://github.com/${targetRepo}/archive/refs/heads/main.zip`,
        };
      }
    }

    // If all candidate repos returned 404
    return {
      hasUpdate: false,
      currentVersion,
      latestVersion: currentVersion,
      releasePageUrl,
      actionsPageUrl,
      repoArchiveUrl,
      error: `GitHub returned 404 for repository "${cleanRepo}". If your repository is private or spelled differently, select or enter your repository name below, or open GitHub directly.`,
    };
  } catch (err: any) {
    console.error('Update Check Error:', err);
    return {
      hasUpdate: false,
      currentVersion,
      latestVersion: currentVersion,
      releasePageUrl,
      actionsPageUrl,
      repoArchiveUrl,
      error: err.message || 'Could not connect to GitHub. Please check your internet connection or repository permissions.',
    };
  }
}

