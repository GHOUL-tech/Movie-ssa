export interface AvatarPreset {
  id: string;
  name: string;
  url: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 'cinema-director',
    name: 'Film Director',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'cyber-neon',
    name: 'Cyberpunk Streamer',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'cinephile-gold',
    name: 'Cinephile Gold',
    url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'retro-synth',
    name: 'Sci-Fi Explorer',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'popcorn-buff',
    name: 'Popcorn Buff',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'action-hero',
    name: 'Action Maverick',
    url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'anime-rebel',
    name: 'Anime Fanatic',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'noir-detective',
    name: 'Noir Critic',
    url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
  },
];

export const ANIME_AVATARS: AvatarPreset[] = [
  {
    id: 'anime-luffy',
    name: 'Pirate Captain',
    url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'anime-naruto',
    name: 'Shadow Shinobi',
    url: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'anime-gojo',
    name: 'Infinity Sorcerer',
    url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'anime-tanjiro',
    name: 'Demon Slayer',
    url: 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'anime-cyber',
    name: 'Mecha Cyber',
    url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'anime-samurai',
    name: 'Neon Ronin',
    url: 'https://images.unsplash.com/photo-1614036417651-efe5912149d8?w=150&auto=format&fit=crop&q=80',
  },
];

export const ALL_AVATARS: AvatarPreset[] = [...AVATAR_PRESETS, ...ANIME_AVATARS];

export const DEFAULT_AVATAR = AVATAR_PRESETS[0].url;

/**
 * Generates an SVG initial avatar if no photo is chosen
 */
export function getInitialAvatar(name: string): string {
  const trimmed = name?.trim() || 'User';
  const initial = trimmed.charAt(0).toUpperCase();
  
  // Palette of vibrant, sleek colors
  const colors = [
    { bg: '%23e50914', text: '%23ffffff' }, // Crimson Netflix
    { bg: '%236366f1', text: '%23ffffff' }, // Indigo
    { bg: '%238b5cf6', text: '%23ffffff' }, // Violet
    { bg: '%23ec4899', text: '%23ffffff' }, // Pink
    { bg: '%2306b6d4', text: '%23ffffff' }, // Cyan
    { bg: '%2310b981', text: '%23ffffff' }, // Emerald
    { bg: '%23f59e0b', text: '%23ffffff' }, // Amber
  ];
  
  const charCode = initial.charCodeAt(0) || 0;
  const color = colors[charCode % colors.length];

  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="64" fill="${color.bg}"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-weight="bold" font-size="56" fill="${color.text}">${initial}</text></svg>`;
}
