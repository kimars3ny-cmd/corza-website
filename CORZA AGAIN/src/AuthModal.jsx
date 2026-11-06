
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

  // Corza Coin
  const [coinBalance, setCoinBalance] = useState(null)
  const [coinTransactions, setCoinTransactions] = useState([])

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

  // Загружаем кошелёк и историю Corza Coin
  useEffect(() => {
    let active = true

    async function loadCoinData() {
      if (!user) {
        setCoinBalance(null)
        setCoinTransactions([])
        return
      }

      setCoinBalance(null)

      const [walletResult, transactionsResult] = await Promise.all([
        supabase
          .from('corza_wallets')
          .select('balance')
          .eq('user_id', user.id)
          .maybeSingle(),

        supabase
          .from('corza_coin_transactions')
          .select('id, amount, operation, description, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)
      ])

      if (!active) return

      if (walletResult.error) {
        setMessage('Ошибка загрузки кошелька: ' + walletResult.error.message)
      } else {
        setCoinBalance(Number(walletResult.data?.balance ?? 0))
      }

      if (transactionsResult.error) {
        setMessage(
          'Ошибка загрузки истории CC: ' + transactionsResult.error.message
        )
      } else {
        setCoinTransactions(transactionsResult.data || [])
      }
    }

    loadCoinData()

    return () => {
      active = false
    }
  }, [user])

  // Вход через Discord
  async function handleDiscordLogin() {
    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: window.location.origin,
          scopes: 'identify email'
        }
      })

      if (error) throw error
    } catch (error) {
      setMessage('Ошибка входа через Discord: ' + error.message)
      setLoading(false)
    }
  }

  // Сохраняем игровой профиль
  async function handleProfileSave(event) {
    event.preventDefault()
    setMessage('')

    const cleanNickname = nickname.trim()
    const cleanServer = server.trim()

    if (cleanNickname.length < 2) {
      setMessage('Игровой никнейм должен содержать минимум 2 символа.')
      return
    }

    if (!cleanServer) {
      setMessage('Укажи сервер Majestic RP.')
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          game_nickname: cleanNickname,
          server: cleanServer
        })
        .eq('id', user.id)
        .select('game_nickname, server, rank, position, joined_at')
        .maybeSingle()

      if (error) throw error

      if (!data) {
        throw new Error('Профиль не найден. Обратись к администрации CORZA.')
      }

      setProfile(data)
      setMessage('Профиль CORZA успешно заполнен!')
    } catch (error) {
      setMessage('Не удалось сохранить профиль: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Регистрация и вход по электронной почте
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
              server: server.trim()
            },
            emailRedirectTo: window.location.origin
          }
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
          password
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
      setCoinBalance(null)
      setCoinTransactions([])
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
      year: 'numeric'
    })
  }

  // Форматирование даты и времени операции
  function formatDateTime(date) {
    if (!date) return ''

    return new Date(date).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Названия операций
  function getOperationName(operation) {
    const names = {
      admin_credit: 'Начисление администрацией',
      admin_debit: 'Списание администрацией',
      purchase: 'Покупка',
      promotion: 'Повышение ранга',
      reward: 'Награда',
      activity: 'Активность',
      achievement: 'Достижение'
    }

    return names[operation] || operation || 'Операция'
  }

  if (!open) return null

  const accountName =
    profile?.game_nickname ||
    user?.user_metadata?.game_nickname ||
    user?.user_metadata?.global_name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.user_name ||
    user?.email ||
    'Игрок CORZA'

  const accountInitial = accountName.charAt(0).toUpperCase()

  const needsProfileSetup =
    user &&
    !profileLoading &&
    (!profile?.game_nickname?.trim() || !profile?.server?.trim())

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
            {profileLoading ? (
              <>
                <h2>Загрузка профиля</h2>
                <p className="auth-description">
                  Подготавливаем твой личный кабинет CORZA...
                </p>
              </>
            ) : needsProfileSetup ? (
              <>
                <h2>Заполни профиль</h2>

                <p className="auth-description">
                  Добро пожаловать в CORZA! Осталось указать
                  игровой никнейм и сервер Majestic RP.
                </p>

                <div className="profile-section">
                  <h3>Данные игрока</h3>

                  <form onSubmit={handleProfileSave}>
                    <label>Игровой никнейм</label>
                    <input
                      type="text"
                      placeholder="Например, Senya_Corza"
                      value={nickname}
                      onChange={(event) => setNickname(event.target.value)}
                      minLength={2}
                      required
                    />

                    <label>Сервер Majestic RP</label>
                    <input
                      type="text"
                      placeholder="Например, Memphis"
                      value={server}
                      onChange={(event) => setServer(event.target.value)}
                      required
                    />

                    <button
                      className="auth-submit"
                      type="submit"
                      disabled={loading}
                    >
                      {loading ? 'Сохраняем...' : 'Сохранить профиль'}
                    </button>
                  </form>
                </div>

                {message && (
                  <div className="auth-message">
                    {message}
                  </div>
                )}
              </>
            ) : (
              <>
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

                  <div className="auth-user">
                    <span>Игровой никнейм</span>
                    <strong>{profile?.game_nickname || 'Не указан'}</strong>
                  </div>

                  <div className="auth-user">
                    <span>Электронная почта</span>
                    <strong>{user.email || 'Не указана'}</strong>
                  </div>

                  <div className="auth-user">
                    <span>Discord</span>
                    <strong>
                      {user.app_metadata?.provider === 'discord'
                        ? user.user_metadata?.global_name ||
                          user.user_metadata?.name ||
                          user.user_metadata?.user_name ||
                          'Подключён'
                        : 'Не подключён'}
                    </strong>
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
                </div>

                {/* Личный кошелёк Corza Coin */}
                <div className="profile-section">
                  <h3>Мой кошелёк</h3>

                  <div
                    style={{
                      padding: '24px',
                      marginTop: '14px',
                      borderRadius: '18px',
                      border: '1px solid rgba(150, 110, 255, 0.35)',
                      background: 'linear-gradient(135deg, rgba(100, 70, 200, 0.2), rgba(40, 150, 255, 0.12))',
                      textAlign: 'center'
                    }}
                  >
                    <span
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        opacity: 0.75,
                        marginBottom: '8px'
                      }}
                    >
                      ТВОЙ БАЛАНС
                    </span>

                    <strong
                      style={{
                        display: 'block',
                        fontSize: '34px',
                        fontWeight: 900,
                        color: '#b69aff'
                      }}
                    >
                      {coinBalance === null
                        ? 'Загрузка...'
                        : `${coinBalance.toLocaleString('ru-RU')} CC`}
                    </strong>

                    <span
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        opacity: 0.65,
                        marginTop: '8px'
                      }}
                    >
                      CORZA COIN
                    </span>
                  </div>
                </div>

                {/* История операций */}
                <div className="profile-section">
                  <h3>История операций</h3>

                  {coinBalance === null ? (
                    <p className="auth-description">
                      Загружаем историю операций...
                    </p>
                  ) : coinTransactions.length === 0 ? (
                    <p className="auth-description">
                      Операций пока нет. Здесь будут отображаться
                      все начисления и списания CC.
                    </p>
                  ) : (
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {coinTransactions.map((transaction) => (
                        <div
                          key={transaction.id}
                          style={{
                            padding: '14px',
                            borderRadius: '12px',
                            border: '1px solid rgba(160, 140, 220, 0.2)',
                            background: 'rgba(120, 100, 180, 0.08)'
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '12px'
                            }}
                          >
                            <strong style={{ fontSize: '13px' }}>
                              {getOperationName(transaction.operation)}
                            </strong>

                            <strong
                              style={{
                                color: Number(transaction.amount) > 0
                                  ? '#78e6b0'
                                  : '#ff8585',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {Number(transaction.amount) > 0 ? '+' : ''}
                              {Number(transaction.amount).toLocaleString('ru-RU')} CC
                            </strong>
                          </div>

                          <p
                            style={{
                              fontSize: '12px',
                              opacity: 0.75,
                              marginTop: '7px'
                            }}
                          >
                            {transaction.description || 'Без описания'}
                          </p>

                          <small
                            style={{
                              display: 'block',
                              opacity: 0.5,
                              marginTop: '7px'
                            }}
                          >
                            {formatDateTime(transaction.created_at)}
                          </small>
                        </div>
                      ))}
                    </div>
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
              </>
            )}
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

            <button
              className="auth-submit"
              type="button"
              onClick={handleDiscordLogin}
              disabled={loading}
              style={{
                background: 'linear-gradient(100deg, #5865F2, #8065FF)',
                marginBottom: '18px'
              }}
            >
              {loading ? 'Подключаем Discord...' : '🎮 Войти через Discord'}
            </button>

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
