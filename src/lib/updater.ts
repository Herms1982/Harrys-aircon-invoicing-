export const CURRENT_APP_VERSION = '1.1.0';
export const DEFAULT_GITHUB_REPO = 'herms1982/harrys-aircon-app';

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
  apkSizeFormatted?: string;
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
 * Fetch latest release details from GitHub API
 */
export async function checkForGitHubUpdate(
  repoPath: string = DEFAULT_GITHUB_REPO,
  currentVersion: string = CURRENT_APP_VERSION
): Promise<UpdateCheckResult> {
  const cleanRepo = repoPath.replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '').trim();

  if (!cleanRepo || !cleanRepo.includes('/')) {
    return {
      hasUpdate: false,
      currentVersion,
      latestVersion: currentVersion,
      error: 'Invalid GitHub repository format. Use "username/repository".',
    };
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${cleanRepo}/releases/latest`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (response.status === 404) {
      return {
        hasUpdate: false,
        currentVersion,
        latestVersion: currentVersion,
        error: `No published GitHub Releases found in repository "${cleanRepo}". Create a release tag on GitHub first.`,
      };
    }

    if (!response.ok) {
      throw new Error(`GitHub API returned status ${response.status}`);
    }

    const release: GitHubReleaseInfo = await response.json();
    const latestVersion = release.tag_name || release.name || currentVersion;

    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;

    // Find APK asset if present
    const apkAsset = release.assets?.find(
      (a) => a.name.endsWith('.apk') || a.content_type.includes('vnd.android.package-archive')
    );

    return {
      hasUpdate,
      currentVersion,
      latestVersion,
      releaseTitle: release.name || release.tag_name,
      releaseNotes: release.body || 'No release notes provided.',
      publishedAt: release.published_at ? new Date(release.published_at).toLocaleDateString() : undefined,
      apkDownloadUrl: apkAsset?.browser_download_url || release.html_url,
      releasePageUrl: release.html_url,
      apkSizeFormatted: apkAsset ? formatBytes(apkAsset.size) : undefined,
    };
  } catch (err: any) {
    console.error('Update Check Error:', err);
    return {
      hasUpdate: false,
      currentVersion,
      latestVersion: currentVersion,
      error: err.message || 'Failed to connect to GitHub. Check internet connection.',
    };
  }
}
