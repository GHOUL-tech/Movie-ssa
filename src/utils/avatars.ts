export interface AvatarPreset {
  id: string;
  name: string;
  url: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 'profile-photo-1',
    name: 'Profile 1',
    url: 'https://i.pinimg.com/736x/93/54/21/9354219edd52122d9211235db494e710.jpg',
  },
  {
    id: 'profile-photo-2',
    name: 'Profile 2',
    url: 'https://i.pinimg.com/736x/a5/22/c1/a522c1fdedad50f412ff96ef21a74d9b.jpg',
  },
  {
    id: 'profile-photo-3',
    name: 'Profile 3',
    url: 'https://i.pinimg.com/736x/cc/23/ca/cc23ca44b25e21771d01316257f08d3b.jpg',
  },
  {
    id: 'profile-photo-4',
    name: 'Profile 4',
    url: 'https://i.pinimg.com/736x/15/04/f6/1504f6fdaa3545db7568306470bda4d0.jpg',
  },
  {
    id: 'profile-photo-5',
    name: 'Profile 5',
    url: 'https://i.pinimg.com/736x/ab/27/26/ab2726710985e3951a66cd7b00f9c653.jpg',
  },
  {
    id: 'profile-photo-6',
    name: 'Profile 6',
    url: 'https://i.pinimg.com/736x/48/43/d6/4843d69eafd9c353027534a67181ad27.jpg',
  },
];

export const ANIME_AVATARS: AvatarPreset[] = AVATAR_PRESETS;

export const ALL_AVATARS: AvatarPreset[] = AVATAR_PRESETS;

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
