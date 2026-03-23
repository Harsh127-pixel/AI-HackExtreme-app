export const LANGUAGES = {
  en: { label: 'English', flag: '🇬🇧' },
  hi: { label: 'हिंदी',   flag: '🇮🇳' },
}

export const STRINGS = {
  en: {
    appName: 'MindEase',
    tagline: 'Setting up your private AI companion',
    greeting_morning: 'Good morning',
    greeting_afternoon: 'Good afternoon',
    greeting_evening: 'Good evening',
    mood_today: "Today's mood",
    sleep_quality: 'How did you sleep?',
    start_listening: 'Start Listening',
    stop: 'Stop',
    this_week: 'This week',
    breathe: 'Breathe',
    reflect: 'Reflect',
    focus: 'Focus',
    home: 'Home',
    streak_days: 'day streak',
    session_complete: 'Session complete',
    start_focus: '🎯 Focus',
    take_break: '☕ Break',
  },
  hi: {
    appName: 'माइंडईज़',
    tagline: 'आपका निजी AI साथी तैयार हो रहा है',
    greeting_morning: 'सुप्रभात',
    greeting_afternoon: 'नमस्ते',
    greeting_evening: 'शुभ संध्या',
    mood_today: 'आज का मूड',
    sleep_quality: 'नींद कैसी रही?',
    start_listening: 'सुनना शुरू करें',
    stop: 'रोकें',
    this_week: 'इस सप्ताह',
    breathe: 'सांस',
    reflect: 'विचार',
    focus: 'ध्यान',
    home: 'होम',
    streak_days: 'दिन की लकीर',
    session_complete: 'सत्र पूरा',
    start_focus: '🎯 फोकस',
    take_break: '☕ ब्रेक',
  }
}

let currentLang = localStorage.getItem('mindease_lang') || 'en'

export function getLang() { return currentLang }
export function setLang(lang) {
  currentLang = lang
  localStorage.setItem('mindease_lang', lang)
  window.location.reload() // Simple reload to apply everywhere
}
export function t(key) { return STRINGS[currentLang]?.[key] || STRINGS.en[key] || key }
