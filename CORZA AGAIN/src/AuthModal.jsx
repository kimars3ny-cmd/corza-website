
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

function AuthModal({ open, onClose }) {
  const [mode, setMode] = useState('register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [server, setServer] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Проверяем авторизацию
  useEffect(() => {
    let mounted = true

    async function checkSession() {
      const { data, error } = await supabase.auth.getSession()

      if (!mounted) return

      if (error) {
        setMessage(error.message)
        return
      }

      setUser(data.session?.user ?? null)
    }

    checkSession()

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  // Загружаем профиль и проверяем администратора
  useEffect(() => {
    let active = true

    async function loadProfile() {
      if (!user) {
        setProfile(null)
        setIsAdmin(false)
        setProfileLoading(false)
        return
      }

      setProfileLoading(true)

      const { data, error } = await supabase
        .from('profiles')
        .select('game_nickname, server, rank, position, joined_at')
        .eq('id', user.id)
        .maybeSingle()

      if (!active) return

      if (error) {
        setProfile(null)
        setMessage('Ошибка загрузки профиля: ' + error.message)
      } else {
        setProfile(data)
      }

      // Проверяем наличие пользователя в site_admins
      const { data: adminData, error: adminError } = await supabase
        .from('site_admins')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!active) return

      setIsAdmin(!adminError && !!adminData)
      setProfileLoading(false)
    }

    loadProfile()

    return () => {
      active = false
    }
  }, [user])

  // Регистрация и вход
  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              game_nickname: nickname.trim(),
              server: server.trim(),
            },
            emailRedirectTo: window.location.origin,
          },
        })

        if (error) throw error

        if (data.session) {
          setMessage('Аккаунт CORZA успешно создан!')
        } else {
          setMessage('Аккаунт создан. Проверь почту и подтверди регистрацию.')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        setMessage('Ты успешно вошёл в аккаунт CORZA!')
      }
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Выход из аккаунта
  async function handleLogout() {
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signOut()

    if (error) {
      setMessage(error.message)
    } else {
      setProfile(null)
      setIsAdmin(false)
      setPassword('')
      setMessage('')
      onClose()
    }

    setLoading(false)
  }

  // Форматирование даты
  function formatDate(date) {
    if (!date) return 'Не указана'

    return new Date(date).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  if (!open) return null

  const accountName =
    profile?.game_nickname ||
    user?.user_metadata?.game_nickname ||
    'Игрок CORZA'

  const accountInitial = accountName.charAt(0).toUpperCase()

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div
        className="auth-modal glass"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="auth-close"
          onClick={onClose}
          type="button"
          aria-label="Закрыть"
        >
          ×
        </button>

        <div className="auth-logo">C</div>

        <span className="section-label">
          CORZA FAMILY PORTAL
        </span>

        {user ? (
          <div className="auth-content">
            <h2>Мой аккаунт</h2>

            <p className="auth-description">
              Добро пожаловать в государственную семью CORZA.
            </p>

            <div className="profile-avatar-area">
              <div className="profile-avatar-wrapper">
                <div className="profile-avatar">
                  {accountInitial}
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="admin-profile-badge">
                <span className="admin-profile-icon">♛</span>
                АДМИНИСТРАТОР
              </div>
            )}

            <div className="profile-section">
              <h3>Информация об аккаунте</h3>

              {profileLoading ? (
                <p className="auth-description">
                  Загружаем профиль...
                </p>
              ) : (
                <>
                  <div className="auth-user">
                    <span>Игровой никнейм</span>
                    <strong>
                      {profile?.game_nickname || 'Не указан'}
                    </strong>
                  </div>

                  <div className="auth-user">
                    <span>Электронная почта</span>
                    <strong>{user.email}</strong>
                  </div>

                  <div className="auth-user">
                    <span>Сервер Majestic RP</span>
                    <strong>{profile?.server || 'Не указан'}</strong>
                  </div>

                  <div className="auth-user">
                    <span>Текущий ранг</span>
                    <strong>{profile?.rank || 'Новичок'}</strong>
                  </div>

                  <div className="auth-user">
                    <span>Должность</span>
                    <strong>{profile?.position || 'Участник'}</strong>
                  </div>

                  <div className="auth-user">
                    <span>Дата вступления</span>
                    <strong>{formatDate(profile?.joined_at)}</strong>
                  </div>
                </>
              )}
            </div>

            {message && (
              <div className="auth-message">
                {message}
              </div>
            )}

            <button
              className="auth-submit auth-logout"
              onClick={handleLogout}
              type="button"
              disabled={loading}
            >
              {loading ? 'Подожди...' : 'Выйти из аккаунта'}
            </button>
          </div>
        ) : (
          <div className="auth-content">
            <h2>
              {mode === 'register'
                ? 'Создать аккаунт'
                : 'С возвращением'}
            </h2>

            <p className="auth-description">
              {mode === 'register'
                ? 'Стань частью государственной семьи CORZA.'
                : 'Войди в свой личный кабинет CORZA.'}
            </p>

            <div className="auth-tabs">
              <button
                type="button"
                className={mode === 'register' ? 'active' : ''}
                onClick={() => {
                  setMode('register')
                  setMessage('')
                }}
              >
                Регистрация
              </button>

              <button
                type="button"
                className={mode === 'login' ? 'active' : ''}
                onClick={() => {
                  setMode('login')
                  setMessage('')
                }}
              >
                Вход
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {mode === 'register' && (
                <>
                  <label>Игровой ник</label>
                  <input
                    type="text"
                    placeholder="Например, Ivan_Corza"
                    value={nickname}
                    onChange={(event) => setNickname(event.target.value)}
                    required
                    minLength={2}
                  />

                  <label>Сервер Majestic RP</label>
                  <input
                    type="text"
                    placeholder="Например, Memphis"
                    value={server}
                    onChange={(event) => setServer(event.target.value)}
                    required
                  />
                </>
              )}

              <label>Электронная почта</label>
              <input
                type="email"
                placeholder="example@mail.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />

              <label>Пароль</label>
              <input
                type="password"
                placeholder="Минимум 8 символов"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
              />

              <button
                className="auth-submit"
                type="submit"
                disabled={loading}
              >
                {loading
                  ? 'Подожди...'
                  : mode === 'register'
                    ? 'Создать аккаунт'
                    : 'Войти в аккаунт'}
              </button>
            </form>

            {message && (
              <div className="auth-message">
                {message}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default AuthModal
