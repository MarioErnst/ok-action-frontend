import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useRef } from 'react'

export const ProfilePage = () => {
  const { user, logout, updateUser } = useAuthStore()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!user) return null

  const handleLogout = () => {
    logout()
    navigate('/auth')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        updateUser({ avatar: reader.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  const getInitials = (fullName: string): string =>
    fullName
      .split(' ')
      .slice(0, 2)
      .map(n => n[0])
      .join('')
      .toUpperCase()

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text">Mi Perfil</h1>
          <p className="text-text-muted mt-2">
            Gestiona tu información personal y cuenta
          </p>
        </div>
      </div>

      <div className="bg-surface/50 backdrop-blur-xl border border-border/50 rounded-3xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
          <div className="relative group shrink-0">
            <div className="w-24 h-24 rounded-full bg-accent/20 border-2 border-accent/30 flex items-center justify-center shadow-inner overflow-hidden">
              {user.avatar ? (
                <img src={user.avatar} alt={user.fullName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-accent text-3xl font-bold">
                  {getInitials(user.fullName)}
                </span>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <span className="text-white text-xs font-medium">Cambiar</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>
          
          <div className="flex-1 space-y-4 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-sm font-medium text-text-muted">Nombre completo</label>
                <div className="p-3 bg-surface border border-border/50 rounded-xl text-text">
                  {user.fullName}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-text-muted">Correo electrónico</label>
                <div className="p-3 bg-surface border border-border/50 rounded-xl text-text">
                  {user.email}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 space-y-8">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-text border-b border-border/50 pb-2">
              Mis Ejercicios
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { id: 'fonacion', label: 'Evaluación de Fonación' },
                { id: 'pronunciacion', label: 'Práctica de Pronunciación' },
                { id: 'acentuacion', label: 'Práctica de Acentuación' },
              ].map((exercise) => {
                return (
                <Link
                  key={exercise.id}
                  to={`/perfil/ejercicios/${exercise.id}`}
                  className="flex items-center gap-3 p-4 bg-surface border border-border/50 rounded-xl hover:border-accent/50 hover:bg-surface-alt transition-colors group cursor-pointer"
                >
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-text group-hover:text-accent transition-colors">
                      {exercise.label}
                    </span>
                    <svg className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
                )})}
              </div>
            </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-text border-b border-border/50 pb-2">
              Cápsulas
            </h2>
            <div className="p-6 bg-surface border border-border/50 border-dashed rounded-xl flex items-center justify-center">
              <p className="text-text-muted text-sm text-center">
                El contenido de las cápsulas estará disponible próximamente.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border/50 flex justify-end">
          <button
            onClick={handleLogout}
            className="px-6 py-2.5 rounded-xl bg-danger/10 text-danger font-medium hover:bg-danger/20 transition-all duration-200"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
