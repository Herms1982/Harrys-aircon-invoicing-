export const CURRENT_APP_VERSION = '1.1.0';
export const DEFAULT_GITHUB_REPO = 'herms1982/Harrys-aircon-invoicing-';

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

/**
 * Fetch latest release details from GitHub API with intelligent fallbacks
 */
export async function checkForGitHubUpdate(
  repoPath: string = DEFAULT_GITHUB_REPO,
  currentVersion: string = CURRENT_APP_VERSION
): Promise<UpdateCheckResult> {
  const cleanRepo = repoPath
    .replace(/^https?:\/\/github\.com\//, '')
    .replace(/\.git$/, '')
    .replace(/\/$/, '')
    .trim();

  const releasePageUrl = `https://github.com/${cleanRepo}/releases`;
  const actionsPageUrl = `https://github.com/${cleanRepo}/actions`;
  const repoArchiveUrl = `https://github.com/${cleanRepo}/archive/refs/heads/main.zip`;

  if (!cleanRepo || !cleanRepo.includes('/')) {
    return {
      hasUpdate: false,
      currentVersion,
      latestVersion: currentVersion,
      releasePageUrl,
      actionsPageUrl,
      repoArchiveUrl,
      error: 'Invalid GitHub repository format. Use "username/repository".',
    };
  }

  const headers = {
    Accept: 'application/vnd.github.v3+json',
  };

  try {
    // Stage 1: Try /releases/latest
    let response = await fetch(`https://api.github.com/repos/${cleanRepo}/releases/latest`, { headers });

    // Stage 2: If 404, try /releases (all releases including pre-releases)
    if (response.status === 404) {
      const allReleasesResp = await fetch(`https://api.github.com/repos/${cleanRepo}/releases`, { headers });
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
            apkDownloadUrl: apkAsset?.browser_download_url || `https://github.com/${cleanRepo}/releases/download/${latestVersion}/app-release.apk`,
            releasePageUrl: latestRel.html_url || releasePageUrl,
            actionsPageUrl,
            repoArchiveUrl,
            apkSizeFormatted: apkAsset ? formatBytes(apkAsset.size) : undefined,
          };
        }
      }

      // Stage 3: If no releases exist, try /tags
      const tagsResp = await fetch(`https://api.github.com/repos/${cleanRepo}/tags`, { headers });
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
            apkDownloadUrl: `https://github.com/${cleanRepo}/releases/download/${latestTag}/app-release.apk`,
            releasePageUrl: `https://github.com/${cleanRepo}/releases/tag/${latestTag}`,
            actionsPageUrl,
            repoArchiveUrl,
            isTagFallback: true,
          };
        }
      }

      // Stage 4: Check latest commit on main branch
      const commitResp = await fetch(`https://api.github.com/repos/${cleanRepo}/commits/main`, { headers });
      if (commitResp.ok) {
        const commitData = await commitResp.json();
        const shortSha = commitData.sha ? commitData.sha.substring(0, 7) : 'head';
        const commitMsg = commitData.commit?.message?.split('\n')[0] || 'Latest main branch commit';
        const commitDate = commitData.commit?.committer?.date ? new Date(commitData.commit.committer.date).toLocaleDateString() : undefined;

        return {
          hasUpdate: true, // Signal that new code is present on main
          currentVersion,
          latestVersion: `main-${shortSha}`,
          releaseTitle: `Main Branch (${shortSha})`,
          releaseNotes: `Latest commit on main: "${commitMsg}" (${commitDate}). GitHub Actions generates an updated APK for every commit!`,
          apkDownloadUrl: actionsPageUrl,
          releasePageUrl,
          actionsPageUrl,
          repoArchiveUrl,
          isTagFallback: true,
        };
      }

      return {
        hasUpdate: false,
        currentVersion,
        latestVersion: currentVersion,
        releasePageUrl,
        actionsPageUrl,
        repoArchiveUrl,
        error: `Connected to repository "${cleanRepo}", but no published GitHub Releases or tags were found yet. Push a commit or create a tag on GitHub to build your first APK!`,
      };
    }

    if (response.status === 403 || response.status === 429) {
      return {
        hasUpdate: false,
        currentVersion,
        latestVersion: currentVersion,
        releasePageUrl,
        actionsPageUrl,
        repoArchiveUrl,
        error: `GitHub API rate limit reached. You can still download updates directly on GitHub!`,
      };
    }

    if (!response.ok) {
      throw new Error(`GitHub API returned HTTP ${response.status}`);
    }

    const release: GitHubReleaseInfo = await response.json();
    const latestVersion = release.tag_name || release.name || currentVersion;

    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0 || latestVersion !== currentVersion;

    // Find APK asset if present
    const apkAsset = release.assets?.find(
      (a) => a.name.endsWith('.apk') || a.content_type.includes('vnd.android.package-archive')
    );

    const directApkUrl = apkAsset?.browser_download_url || `https://github.com/${cleanRepo}/releases/download/${release.tag_name || 'v1.1.0'}/app-release.apk`;

    return {
      hasUpdate,
      currentVersion,
      latestVersion,
      releaseTitle: release.name || release.tag_name,
      releaseNotes: release.body || 'New GitHub Release build available.',
      publishedAt: release.published_at ? new Date(release.published_at).toLocaleDateString() : undefined,
      apkDownloadUrl: directApkUrl,
      releasePageUrl: release.html_url || releasePageUrl,
      actionsPageUrl,
      repoArchiveUrl,
      apkSizeFormatted: apkAsset ? formatBytes(apkAsset.size) : undefined,
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

