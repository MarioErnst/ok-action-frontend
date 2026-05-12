import type { NavIconName } from '../atoms/NavIcon'

export type NavItemConfig = {
  to: string
  icon: NavIconName
  label: string
  end?: boolean
}

export const NAV_ITEMS: NavItemConfig[] = [
  { to: '/dashboard', icon: 'dashboard', label: 'Inicio', end: true },
  { to: '/ejercicios', icon: 'exercises', label: 'Ejercicios' },
  { to: '/capsulas', icon: 'capsules', label: 'Cápsulas' },
  { to: '/fonacion', icon: 'phonation', label: 'Fonación' },
  { to: '/pronunciacion', icon: 'pronunciation', label: 'Pronunciación' },
  { to: '/acentuacion', icon: 'accentuation', label: 'Acentuación' },
  { to: '/volumen', icon: 'loudness', label: 'Volumen' },
  { to: '/pausas', icon: 'pauses', label: 'Pausas' },
  { to: '/muletillas', icon: 'muletillas', label: 'Muletillas' },
  { to: '/precision', icon: 'precision', label: 'Precisión' },
  { to: '/sesion-libre', icon: 'live', label: 'Sesión Libre' },
  { to: '/expresion-facial', icon: 'facial', label: 'Expresión Facial' },
  { to: '/expresion-corporal', icon: 'body', label: 'Expresion Corporal' },
  { to: '/versatilidad-linguistica', icon: 'lexical', label: 'Versatilidad' },
  { to: '/fluidez', icon: 'fluency', label: 'Fluidez' },
  { to: '/consistencia', icon: 'consistency', label: 'Consistencia' },
  { to: '/perfil', icon: 'user', label: 'Perfil' },
]
