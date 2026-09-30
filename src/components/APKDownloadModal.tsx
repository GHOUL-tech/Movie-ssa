import React, { useState } from 'react';
import { 
  X, 
  Smartphone, 
  Download, 
  CheckCircle2, 
  Zap, 
  ShieldCheck, 
  ExternalLink, 
  Share2, 
  QrCode,
  Globe,
  Sparkles
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface APKDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const APKDownloadModal: React.FC<APKDownloadModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'instant' | 'builder' | 'ios'>('instant');

  if (!isOpen) return null;

  const currentAppUrl = window.location.href;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(currentAppUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePwaInstall = async () => {
    const installed = await install();
    if (installed) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl shadow-red-950/20 text-white overflow-hidden my-8">
        
        {/* Header Background Accent */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-r from-red-600/20 via-amber-600/20 to-purple-600/20 blur-xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative p-6 pb-4 border-b border-neutral-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 p-0.5 shadow-lg shadow-red-600/30 flex items-center justify-center">
              <div className="w-full h-full bg-neutral-950 rounded-[14px] flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-red-500" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-white">Download Android App</h2>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                  APK / WebAPK
                </span>
              </div>
              <p className="text-xs text-neutral-400">Install Zinovis directly on Android phone or tablet</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-neutral-700/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/60 p-1.5 gap-1">
          <button
            onClick={() => setActiveTab('instant')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'instant'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>1-Tap Install</span>
          </button>
          <button
            onClick={() => setActiveTab('builder')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'builder'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Build .APK File</span>
          </button>
          <button
            onClick={() => setActiveTab('ios')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'ios'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>iOS / Safari</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">

          {/* TAB 1: INSTANT ANDROID WEBAPK INSTALLATION */}
          {activeTab === 'instant' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-neutral-950 to-neutral-900 rounded-2xl p-4 border border-neutral-800 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Native Android WebAPK Package</h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Installs Zinovis as an Android App with home screen icon, fullscreen playback, and ad-shield protection without needing Google Play Store.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                    <span className="text-[11px] font-semibold text-neutral-300">0% Ads & Popups</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                    <span className="text-[11px] font-semibold text-neutral-300">Full Landscape 4K</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                    <span className="text-[11px] font-semibold text-neutral-300">Offline Caching</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                    <span className="text-[11px] font-semibold text-neutral-300">Auto Updates</span>
                  </div>
                </div>
              </div>

              {isInstalled ? (
                <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/30 text-center space-y-1">
                  <p className="text-sm font-bold text-green-400 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Zinovis App is Already Installed!
                  </p>
                  <p className="text-xs text-neutral-400">Launch Zinovis from your Android home screen or app drawer.</p>
                </div>
              ) : isInstallable ? (
                <button
                  onClick={handlePwaInstall}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-extrabold text-sm shadow-xl shadow-red-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  <span>Install Zinovis App Now (Android)</span>
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-400" />
                      To Install via Chrome / Mobile Browser:
                    </p>
                    <ol className="list-decimal list-inside text-neutral-300 space-y-1 pt-1">
                      <li>Tap the <strong>3 Dots (Menu)</strong> in top right of Chrome.</li>
                      <li>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
                      <li>Confirm to get the native Android icon!</li>
                    </ol>
                  </div>

                  <button
                    onClick={handleCopyUrl}
                    className="w-full py-3 px-4 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 border border-neutral-700"
                  >
                    <Share2 className="w-4 h-4 text-red-400" />
                    <span>{copied ? 'Link Copied to Clipboard!' : 'Copy App Link for Phone Browser'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BUILD STANDALONE .APK FILE */}
          {activeTab === 'builder' && (
            <div className="space-y-4">
              <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 space-y-2">
                <h3 className="text-xs font-bold text-neutral-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-400" />
                  Generate Standalone .APK via PWABuilder
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  PWABuilder (by Microsoft & Google) generates signed Android `.apk` / `.aab` packages for sideloading or Google Play distribution directly from this URL.
                </p>
              </div>

              <div className="space-y-2 text-xs text-neutral-300">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                  <span className="w-5 h-5 rounded-full bg-red-600 text-white font-extrabold text-[10px] flex items-center justify-center">1</span>
                  <span>Copy app URL: <strong className="text-red-400">{currentAppUrl.slice(0, 32)}...</strong></span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                  <span className="w-5 h-5 rounded-full bg-red-600 text-white font-extrabold text-[10px] flex items-center justify-center">2</span>
                  <span>Open <strong>PWABuilder.com</strong> in browser</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                  <span className="w-5 h-5 rounded-full bg-red-600 text-white font-extrabold text-[10px] flex items-center justify-center">3</span>
                  <span>Paste URL and click <strong>Generate Android Package (.apk)</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleCopyUrl}
                  className="flex-1 py-3 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 border border-neutral-700"
                >
                  <Share2 className="w-4 h-4 text-red-400" />
                  <span>{copied ? 'Copied!' : 'Copy URL'}</span>
                </button>
                <a
                  href="https://www.pwabuilder.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-red-600/30"
                >
                  <span>Open PWABuilder</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}

          {/* TAB 3: IOS SAFARI INSTALLATION */}
          {activeTab === 'ios' && (
            <div className="space-y-4 text-xs text-neutral-300">
              <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 space-y-2">
                <h3 className="text-xs font-bold text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-400" />
                  iPhone & iPad Safari Installation
                </h3>
                <p className="text-neutral-400 leading-relaxed">
                  Apple iOS lets you install Zinovis directly from Safari with full offline caching and zero address bar.
                </p>
              </div>

              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <div>
                    <strong className="text-white">Tap Share Button</strong>
                    <p className="text-neutral-400 text-[11px]">In Safari bottom toolbar, tap the Share icon (square with arrow up).</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <div>
                    <strong className="text-white">Add to Home Screen</strong>
                    <p className="text-neutral-400 text-[11px]">Scroll down the menu list and tap "Add to Home Screen".</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <div>
                    <strong className="text-white">Launch App</strong>
                    <p className="text-neutral-400 text-[11px]">Confirm name and launch Zinovis from your iPhone home screen!</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer info */}
        <div className="p-4 bg-neutral-950/80 border-t border-neutral-800 text-center">
          <p className="text-[11px] text-neutral-500 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
            <span>Official Zinovis Verified Mobile Application Package</span>
          </p>
        </div>

      </div>
    </div>
  );
};
