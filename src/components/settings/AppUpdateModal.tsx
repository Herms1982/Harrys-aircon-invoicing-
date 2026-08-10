import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, X, Sparkles, AlertCircle, CheckCircle2, Github, ExternalLink, ShieldCheck } from 'lucide-react';
import { BusinessSettings } from '../../types';
import { CURRENT_APP_VERSION, DEFAULT_GITHUB_REPO, checkForGitHubUpdate, UpdateCheckResult } from '../../lib/updater';

interface AppUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BusinessSettings;
  onUpdateSettings: (newSettings: BusinessSettings) => void;
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const currentRepo = settings.githubRepo || DEFAULT_GITHUB_REPO;
  const currentVersion = settings.appVersion || CURRENT_APP_VERSION;

  const [repoInput, setRepoInput] = useState(currentRepo);
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<UpdateCheckResult | null>(null);

  const handleCheckUpdate = async (repoToUse = repoInput) => {
    setIsChecking(true);
    setCheckResult(null);

    const result = await checkForGitHubUpdate(repoToUse, currentVersion);
    setCheckResult(result);
    setIsChecking(false);
  };

  useEffect(() => {
    if (isOpen) {
      handleCheckUpdate(currentRepo);
    }
  }, [isOpen]);

  const handleSaveRepo = () => {
    onUpdateSettings({
      ...settings,
      githubRepo: repoInput.trim(),
    });
    handleCheckUpdate(repoInput.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>In-App GitHub Updates</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-mono px-2 py-0.5 rounded-full border border-indigo-400/30 font-bold">
                  v{currentVersion}
                </span>
              </h2>
              <p className="text-xs text-slate-400">Direct update & APK releases from GitHub</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* GitHub Repo Input Field */}
          <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-2">
            <label className="block text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
              Connected GitHub Repository
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                placeholder="e.g. username/repository-name"
                className="flex-1 bg-slate-900 border border-slate-800 text-white font-mono text-xs px-3.5 py-2.5 rounded-xl focus:border-indigo-500 focus:outline-none"
              />
              <button
                onClick={handleSaveRepo}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-700 text-xs transition-colors cursor-pointer"
              >
                Save
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              When you push code or publish a new release tag in this GitHub repo, users can download the updated APK directly here.
            </p>
          </div>

          {/* Action: Manual Check */}
          <div className="flex items-center justify-between bg-slate-950/40 p-3.5 rounded-2xl border border-slate-800/80">
            <div>
              <span className="text-white font-bold block text-xs">Installed App Version</span>
              <span className="text-slate-400 text-[11px]">Current build release tag: <strong className="text-slate-200">v{currentVersion}</strong></span>
            </div>
            <button
              onClick={() => handleCheckUpdate(repoInput)}
              disabled={isChecking}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-900/30 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Checking GitHub...' : 'Check Now'}</span>
            </button>
          </div>

          {/* Results State */}
          {isChecking && (
            <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
              <p className="text-white font-bold">Querying GitHub Releases API...</p>
              <p className="text-slate-400 text-[11px]">Checking https://github.com/{repoInput}</p>
            </div>
          )}

          {!isChecking && checkResult?.error && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-300 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span>GitHub Update Check Notice</span>
              </div>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">{checkResult.error}</p>
              <div className="pt-2 text-[10px] text-slate-400 border-t border-amber-500/20 flex items-center justify-between">
                <span>To publish updates: create a Release tag on GitHub with an .apk asset attached.</span>
                <a
                  href={`https://github.com/${repoInput}/releases`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 hover:underline flex items-center gap-1 font-bold"
                >
                  View GitHub Releases <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {!isChecking && checkResult && !checkResult.error && !checkResult.hasUpdate && (
            <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>You are on the Latest Version (v{checkResult.currentVersion})</span>
              </div>
              <p className="text-[11px] text-emerald-200/80">
                Your application is completely up to date. No new releases found on GitHub repository <strong className="text-white">{repoInput}</strong>.
              </p>
            </div>
          )}

          {!isChecking && checkResult && checkResult.hasUpdate && (
            <div className="bg-gradient-to-b from-indigo-950/60 to-slate-950 p-5 rounded-2xl border border-indigo-500/50 space-y-4 shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    New Update Available!
                  </span>
                  <h3 className="text-base font-bold text-white mt-1">
                    Release {checkResult.releaseTitle || checkResult.latestVersion}
                  </h3>
                  <p className="text-slate-400 text-[11px]">
                    Published on {checkResult.publishedAt || 'GitHub'} {checkResult.apkSizeFormatted ? `• ${checkResult.apkSizeFormatted}` : ''}
                  </p>
                </div>
                <div className="p-2 bg-indigo-600/20 rounded-xl text-indigo-300 border border-indigo-500/30">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
              </div>

              {/* Release Notes */}
              <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Changelog & Release Notes:</span>
                <p className="text-slate-200 text-xs whitespace-pre-wrap leading-relaxed font-sans">
                  {checkResult.releaseNotes}
                </p>
              </div>

              {/* Download CTA Button */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                {checkResult.apkDownloadUrl && (
                  <a
                    href={checkResult.apkDownloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer text-xs"
                  >
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>Download Update APK ({checkResult.latestVersion})</span>
                  </a>
                )}

                <a
                  href={checkResult.releasePageUrl || `https://github.com/${repoInput}/releases`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl flex items-center justify-center gap-1.5 text-xs transition-colors cursor-pointer border border-slate-700"
                >
                  <span>Open GitHub</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* Workflow guide note */}
          <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800/90 text-slate-400 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-300 text-[11px]">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Automated GitHub CI/CD Build Workflow Active</span>
            </div>
            <p className="text-[10px] leading-normal text-slate-400">
              When you push updates to GitHub, the workflow in <code className="text-indigo-300 font-mono">.github/workflows/build-apk.yml</code> automatically builds the Android APK. Create a Release on GitHub to publish updates directly to your users!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
