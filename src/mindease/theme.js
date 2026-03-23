export const THEMES = {
  okay: {
    primary: '#F59E0B',
    primaryLight: '#FEF3C7',
    accent: '#F97316',
    bg: '#0F0E0A',
    bgCard: '#1C1A14',
    bgInput: '#2A2720',
    text: '#FEF9EE',
    textMuted: '#A8956E',
    border: '#2A2720',
    glow: 'rgba(245,158,11,0.3)',
    gradient: 'linear-gradient(135deg, #F59E0B22, #F9731622)',
  },
  anxiety: {
    primary: '#38BDF8',
    primaryLight: '#E0F2FE',
    accent: '#0EA5E9',
    bg: '#080F1A',
    bgCard: '#0F1D2E',
    bgInput: '#162840',
    text: '#F0F9FF',
    textMuted: '#7AB3CC',
    border: '#162840',
    glow: 'rgba(56,189,248,0.3)',
    gradient: 'linear-gradient(135deg, #38BDF822, #0EA5E922)',
  },
  depression: {
    primary: '#A78BFA',
    primaryLight: '#EDE9FE',
    accent: '#8B5CF6',
    bg: '#0A080F',
    bgCard: '#16112A',
    bgInput: '#1E1640',
    text: '#F5F3FF',
    textMuted: '#9B87C4',
    border: '#1E1640',
    glow: 'rgba(167,139,250,0.3)',
    gradient: 'linear-gradient(135deg, #A78BFA22, #8B5CF622)',
  },
  burnout: {
    primary: '#34D399',
    primaryLight: '#D1FAE5',
    accent: '#10B981',
    bg: '#080F0C',
    bgCard: '#0F1E17',
    bgInput: '#162B20',
    text: '#ECFDF5',
    textMuted: '#6BAF8E',
    border: '#162B20',
    glow: 'rgba(52,211,153,0.3)',
    gradient: 'linear-gradient(135deg, #34D39922, #10B98122)',
  },
  stress: {
    primary: '#FB7185',
    primaryLight: '#FFE4E6',
    accent: '#F43F5E',
    bg: '#0F080A',
    bgCard: '#1E1014',
    bgInput: '#2A1620',
    text: '#FFF1F2',
    textMuted: '#C4788A',
    border: '#2A1620',
    glow: 'rgba(251,113,133,0.3)',
    gradient: 'linear-gradient(135deg, #FB718522, #F43F5E22)',
  },
}

export function getTheme(wellnessMode) {
  return THEMES[wellnessMode] || THEMES.okay
}

export function applyTheme(theme) {
  const root = document.documentElement
  Object.entries(theme).forEach(([key, value]) => {
    root.style.setProperty(`--t-${key}`, value)
  })
}
