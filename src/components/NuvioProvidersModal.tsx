import React, { useState, useEffect } from 'react';
import { 
  X, 
  Layers, 
  ExternalLink, 
  CheckCircle2, 
  Search, 
  Film, 
  Tv, 
  ShieldCheck, 
  Cpu, 
  Check, 
  RefreshCw,
  Compass,
  Zap,
  Filter,
  Power,
  RotateCcw,
  AlertTriangle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { NuvioRepository, NuvioScraper } from '../types';
import { 
  fetchNuvioRepositories, 
  fetchNuvioProviders, 
  DEFAULT_NUVIO_REPOSITORIES 
} from '../services/nuvioService';
import {
  getEnabledRepositories,
  setRepositoryEnabled,
  setAllRepositoriesEnabled,
  getEnabledProviders,
  setProviderEnabled,
  setAllProvidersEnabled,
  resetProviderSettings,
  isRepositoryEnabled,
  isProviderEnabled
} from '../utils/storage';

interface NuvioProvidersModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProviderId?: string;
  onSelectProvider?: (providerId: string) => void;
  onTogglesChanged?: () => void;
}

export const NuvioProvidersModal: React.FC<NuvioProvidersModalProps> = ({
  isOpen,
  onClose,
  selectedProviderId = 'auto',
  onSelectProvider,
  onTogglesChanged
}) => {
  const [repositories, setRepositories] = useState<NuvioRepository[]>(DEFAULT_NUVIO_REPOSITORIES);
  const [providers, setProviders] = useState<NuvioScraper[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'providers' | 'repos'>('repos');
  const [selectedRepoId, setSelectedRepoId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'tv' | 'anime'>('all');
  const [langFilter, setLangFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  
  // Track on/off status locally for instant reactive UI
  const [repoStatus, setRepoStatus] = useState<Record<string, boolean>>({});
  const [providerStatus, setProviderStatus] = useState<Record<string, boolean>>({});

  const reloadStatuses = () => {
    setRepoStatus(getEnabledRepositories());
    setProviderStatus(getEnabledProviders());
  };

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);
    reloadStatuses();

    Promise.all([
      fetchNuvioRepositories(),
      fetchNuvioProviders()
    ]).then(([repos, provs]) => {
      if (!isMounted) return;
      setRepositories(repos);
      setProviders(provs);
      reloadStatuses();
      setLoading(false);
    }).catch((err) => {
      console.warn('Failed to load Nuvio providers:', err);
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Toggle individual repository ON / OFF
  const handleToggleRepo = (repoId: string) => {
    const currentVal = repoStatus[repoId.toLowerCase()] !== false;
    const nextVal = !currentVal;
    setRepositoryEnabled(repoId, nextVal);
    setRepoStatus((prev) => ({ ...prev, [repoId.toLowerCase()]: nextVal }));
    onTogglesChanged?.();
  };

  // Toggle all repositories ON / OFF
  const handleToggleAllRepos = (enabled: boolean) => {
    const ids = repositories.map((r) => r.id);
    setAllRepositoriesEnabled(ids, enabled);
    const updated: Record<string, boolean> = {};
    ids.forEach((id) => {
      updated[id.toLowerCase()] = enabled;
    });
    setRepoStatus((prev) => ({ ...prev, ...updated }));
    onTogglesChanged?.();
  };

  // Toggle individual provider ON / OFF
  const handleToggleProvider = (providerId: string) => {
    const currentVal = providerStatus[providerId.toLowerCase()] !== false;
    const nextVal = !currentVal;
    setProviderEnabled(providerId, nextVal);
    setProviderStatus((prev) => ({ ...prev, [providerId.toLowerCase()]: nextVal }));
    onTogglesChanged?.();
  };

  // Toggle all filtered providers ON / OFF
  const handleToggleAllProviders = (enabled: boolean) => {
    const ids = filteredProviders.map((p) => p.id);
    setAllProvidersEnabled(ids, enabled);
    const updated: Record<string, boolean> = {};
    ids.forEach((id) => {
      updated[id.toLowerCase()] = enabled;
    });
    setProviderStatus((prev) => ({ ...prev, ...updated }));
    onTogglesChanged?.();
  };

  // Reset all toggles back to default ON
  const handleResetDefaults = () => {
    resetProviderSettings();
    reloadStatuses();
    onTogglesChanged?.();
  };

  // Filter providers
  const filteredProviders = providers.filter((p) => {
    if (selectedRepoId !== 'all' && p.repoId.toLowerCase() !== selectedRepoId.toLowerCase()) {
      return false;
    }
    if (typeFilter !== 'all' && !p.supportedTypes.includes(typeFilter)) {
      return false;
    }
    if (langFilter !== 'all') {
      const languages = (p.contentLanguage || []).map((l) => l.toLowerCase());
      if (!languages.includes(langFilter.toLowerCase())) {
        return false;
      }
    }
    const isRepoOn = repoStatus[p.repoId.toLowerCase()] !== false;
    const isProvOn = isRepoOn && providerStatus[p.id.toLowerCase()] !== false;

    if (statusFilter === 'enabled' && !isProvOn) return false;
    if (statusFilter === 'disabled' && isProvOn) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = 
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const activeReposCount = repositories.filter(
    (r) => repoStatus[r.id.toLowerCase()] !== false
  ).length;

  const activeProvidersCount = providers.filter((p) => {
    const isRepoOn = repoStatus[p.repoId.toLowerCase()] !== false;
    return isRepoOn && providerStatus[p.id.toLowerCase()] !== false;
  }).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div 
        className="relative w-full max-w-5xl bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-8 py-5 border-b border-neutral-800/80 bg-neutral-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-red-600 via-rose-600 to-amber-500 flex items-center justify-center shadow-lg shadow-red-600/25 text-white">
              <Power className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white">
                  Streaming APIs & Providers
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-colors ${
                  activeReposCount > 0 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}>
                  {activeReposCount}/{repositories.length} Repos ON
                </span>
              </div>
              <p className="text-xs text-neutral-400 hidden sm:block">
                Turn streaming repositories & scrapers ON or OFF anytime to customize your sources
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetDefaults}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
              title="Reset all repositories and scrapers to ON"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All ON</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 sm:p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs & Master Controls */}
        <div className="flex items-center justify-between px-5 sm:px-8 py-3 bg-neutral-900/90 border-b border-neutral-800 text-xs gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('repos')}
              className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'repos'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'bg-neutral-800/60 hover:bg-neutral-800 text-neutral-300'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>6 Manifest Repositories ({activeReposCount}/{repositories.length} ON)</span>
            </button>

            <button
              onClick={() => setActiveTab('providers')}
              className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'providers'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'bg-neutral-800/60 hover:bg-neutral-800 text-neutral-300'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Scrapers & Providers ({activeProvidersCount}/{providers.length || '200+'} ON)</span>
            </button>
          </div>

          {/* Quick Actions for active tab */}
          <div className="flex items-center gap-2">
            {activeTab === 'repos' ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleToggleAllRepos(true)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-[11px] transition-all cursor-pointer"
                >
                  Enable All Repos
                </button>
                <button
                  onClick={() => handleToggleAllRepos(false)}
                  className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-[11px] transition-all cursor-pointer"
                >
                  Disable All Repos
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleToggleAllProviders(true)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-[11px] transition-all cursor-pointer"
                >
                  Enable Filtered
                </button>
                <button
                  onClick={() => handleToggleAllProviders(false)}
                  className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-[11px] transition-all cursor-pointer"
                >
                  Disable Filtered
                </button>
              </div>
            )}
          </div>
        </div>

        {/* TAB 1: 6 Manifest Repositories (ON/OFF Options) */}
        {activeTab === 'repos' && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-4">
            <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-white">
                  6 Official Manifest URLs Integrated
                </span>
                <span className="text-xs text-neutral-400">
                  — Toggle any repository ON or OFF. Turning a repository OFF silences all scrapers under it.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {repositories.map((repo) => {
                const isEnabled = repoStatus[repo.id.toLowerCase()] !== false;
                return (
                  <div
                    key={repo.id}
                    className={`p-5 rounded-3xl border transition-all space-y-4 flex flex-col justify-between ${
                      isEnabled
                        ? 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700 shadow-lg shadow-black/40'
                        : 'bg-neutral-950/80 border-neutral-900 opacity-70'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Card Header & ON/OFF Switch */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-white">{repo.name}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isEnabled 
                                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
                                : 'bg-neutral-800 border border-neutral-700 text-neutral-400'
                            }`}>
                              {isEnabled ? 'ACTIVE' : 'OFF'}
                            </span>
                          </div>
                          <span className="text-xs text-neutral-400">by {repo.author}</span>
                        </div>

                        {/* Interactive ON / OFF Toggle Switch */}
                        <button
                          onClick={() => handleToggleRepo(repo.id)}
                          className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors cursor-pointer focus:outline-none p-1 shadow-inner ${
                            isEnabled ? 'bg-emerald-500' : 'bg-neutral-800'
                          }`}
                          title={isEnabled ? 'Click to Turn OFF' : 'Click to Turn ON'}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-md ${
                              isEnabled ? 'translate-x-7' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      <p className="text-xs text-neutral-300 leading-relaxed">
                        {repo.description}
                      </p>

                      {/* Manifest URL Link */}
                      <div className="p-2.5 rounded-2xl bg-neutral-950 border border-neutral-800/80 text-[11px] font-mono text-neutral-400 flex items-center justify-between gap-2">
                        <span className="truncate">{repo.url}</span>
                        <a
                          href={repo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-400 hover:text-red-300 p-1 rounded-lg hover:bg-neutral-800 transition-all flex-shrink-0"
                          title="Open Raw Manifest"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    {/* Bottom Status & Quick Action */}
                    <div className="pt-2 border-t border-neutral-800/60 flex items-center justify-between text-xs text-neutral-400">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-amber-300">{repo.scrapersCount} Scrapers</span>
                        <span className="text-neutral-500">•</span>
                        <span className={isEnabled ? 'text-emerald-400 font-semibold' : 'text-neutral-500'}>
                          {isEnabled ? 'Searching Enabled' : 'Disabled (Silenced)'}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedRepoId(repo.id);
                          setActiveTab('providers');
                        }}
                        className="px-3 py-1 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition-all cursor-pointer"
                      >
                        Scrapers →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: Scrapers & Providers (ON/OFF Options) */}
        {activeTab === 'providers' && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-4">
            {/* Filter, Search & Status Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search 200+ scrapers (e.g. 4KHDHub, Airflix, AnimePahe, MoviesDrive)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-900 border border-neutral-800 focus:border-red-500 rounded-2xl text-xs sm:text-sm text-white placeholder:text-neutral-500 focus:outline-none"
                />
              </div>

              {/* Status Filter (All / ON / OFF) */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs font-semibold rounded-2xl px-3 py-2.5 focus:outline-none cursor-pointer"
              >
                <option value="all">All States (ON & OFF)</option>
                <option value="enabled">Enabled (ON Only)</option>
                <option value="disabled">Disabled (OFF Only)</option>
              </select>

              {/* Repo Selector */}
              <select
                value={selectedRepoId}
                onChange={(e) => setSelectedRepoId(e.target.value)}
                className="bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs font-semibold rounded-2xl px-3 py-2.5 focus:outline-none cursor-pointer"
              >
                <option value="all">All Repositories</option>
                {repositories.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} {repoStatus[r.id.toLowerCase()] === false ? '(OFF)' : ''}
                  </option>
                ))}
              </select>

              {/* Media Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs font-semibold rounded-2xl px-3 py-2.5 focus:outline-none cursor-pointer"
              >
                <option value="all">All Media</option>
                <option value="movie">Movies</option>
                <option value="tv">TV Series</option>
                <option value="anime">Anime</option>
              </select>
            </div>

            {/* Provider Cards Grid */}
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-3 text-neutral-400">
                <RefreshCw className="w-8 h-8 animate-spin text-red-500" />
                <p className="text-sm">Connecting to Nuvio provider manifests...</p>
              </div>
            ) : filteredProviders.length === 0 ? (
              <div className="py-16 text-center text-neutral-500 text-sm space-y-2">
                <p>No providers match your search filters.</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedRepoId('all');
                    setTypeFilter('all');
                    setLangFilter('all');
                    setStatusFilter('all');
                  }}
                  className="text-xs text-red-400 hover:underline cursor-pointer"
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredProviders.map((p) => {
                  const isRepoOn = repoStatus[p.repoId.toLowerCase()] !== false;
                  const isProvOn = providerStatus[p.id.toLowerCase()] !== false;
                  const isEffectiveOn = isRepoOn && isProvOn;
                  const isSelected = selectedProviderId === p.id;

                  return (
                    <div
                      key={`${p.repoId}-${p.id}`}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                        !isRepoOn
                          ? 'bg-neutral-950/60 border-neutral-900 opacity-60'
                          : isEffectiveOn
                          ? 'bg-neutral-900/80 hover:bg-neutral-900 border-neutral-800/80 hover:border-neutral-700'
                          : 'bg-neutral-950/90 border-neutral-900 opacity-70'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {p.logo ? (
                              <img
                                src={p.logo}
                                alt={p.name}
                                className="w-7 h-7 rounded-lg object-contain bg-neutral-950 p-0.5 border border-neutral-800 flex-shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-lg bg-neutral-800 flex items-center justify-center text-red-400 font-bold text-xs flex-shrink-0">
                                {p.name[0]}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                                <span>{p.name}</span>
                                {isSelected && (
                                  <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                                )}
                              </h4>
                              <span className="text-[10px] text-neutral-400 truncate block">
                                from {p.repoName} {!isRepoOn && '(Repo OFF)'}
                              </span>
                            </div>
                          </div>

                          {/* Individual ON / OFF Toggle */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => {
                                if (!isRepoOn) {
                                  // Prompt or enable repo
                                  handleToggleRepo(p.repoId);
                                } else {
                                  handleToggleProvider(p.id);
                                }
                              }}
                              className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors cursor-pointer focus:outline-none p-0.5 ${
                                isEffectiveOn ? 'bg-emerald-500' : 'bg-neutral-800'
                              }`}
                              title={
                                !isRepoOn
                                  ? 'Parent Repository is OFF (Click to Enable Repo)'
                                  : isProvOn
                                  ? 'Provider is ON (Click to turn OFF)'
                                  : 'Provider is OFF (Click to turn ON)'
                              }
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
                                  isEffectiveOn ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        </div>

                        <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                          {p.description || 'Nuvio streaming provider plugin'}
                        </p>

                        {!isRepoOn && (
                          <div className="text-[10px] text-amber-400 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                            <span>Parent repository is turned OFF</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-neutral-800/60 flex items-center justify-between gap-2 flex-wrap text-[10px]">
                        <div className="flex items-center gap-1 flex-wrap">
                          {p.supportedTypes.map((t) => (
                            <span
                              key={t}
                              className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-medium uppercase text-[9px]"
                            >
                              {t}
                            </span>
                          ))}
                          {(p.formats || []).slice(0, 2).map((fmt) => (
                            <span
                              key={fmt}
                              className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold uppercase text-[9px]"
                            >
                              {fmt}
                            </span>
                          ))}
                        </div>

                        {onSelectProvider && isEffectiveOn && (
                          <button
                            onClick={() => onSelectProvider(p.id)}
                            className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 text-[11px] ${
                              isSelected
                                ? 'bg-red-600 text-white'
                                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white'
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Selected</span>
                              </>
                            ) : (
                              <span>Use Provider</span>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-5 sm:px-8 py-4 bg-neutral-900/60 border-t border-neutral-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-neutral-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>
              {activeReposCount} Repositories and {activeProvidersCount} Scrapers currently active
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-all shadow-md shadow-red-600/30 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
