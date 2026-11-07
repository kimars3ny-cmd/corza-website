
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

function AuthModal({ open, onClose }) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingProvider, setLoadingProvider] = useState('')

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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
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

      const { data: adminData, error: adminError } = await supabase.rpc(
        'is_corza_admin'
      )

      if (!active) return

      setIsAdmin(!adminError && adminData === true)
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
          .limit(10),
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

  // Вход через Google или Discord
  async function handleOAuthLogin(provider) {
    setLoading(true)
    setLoadingProvider(provider)
    setMessage('')

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
          ...(provider === 'discord'
            ? { scopes: 'identify email' }
            : {}),
        },
      })

      if (error) throw error
    } catch (error) {
      console.error('Ошибка OAuth:', error)
      setMessage('Не удалось войти: ' + error.message)
      setLoading(false)
      setLoadingProvider('')
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

  // Форматирование даты и времени операции
  function formatDateTime(date) {
    if (!date) return ''

    return new Date(date).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
      task_reward: 'Награда за задание',
      activity: 'Активность',
      achievement: 'Достижение',
    }

    return names[operation] || operation || 'Операция'
  }

  if (!open) return null

  const accountName =
    profile?.game_nickname ||
    user?.user_metadata?.global_name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.user_name ||
    user?.email ||
    'Игрок CORZA'

  const accountInitial = accountName.charAt(0).toUpperCase()

  const authProvider =
    user?.app_metadata?.provider ||
    user?.identities?.[0]?.provider ||
    ''

  const discordName =
    user?.user_metadata?.global_name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.user_name

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
                <h2>Загрузка аккаунта</h2>
                <p className="auth-description">
                  Подготавливаем твой личный кабинет CORZA...
                </p>
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
                    <strong>
                      {profile?.game_nickname || 'Не указан'}
                    </strong>
                  </div>

                  <div className="auth-user">
                    <span>Электронная почта</span>
                    <strong>{user.email || 'Не указана'}</strong>
                  </div>

                  <div className="auth-user">
                    <span>Способ входа</span>
                    <strong>
                      {authProvider === 'discord'
                        ? 'Discord'
                        : authProvider === 'google'
                          ? 'Google'
                          : authProvider || 'Не определён'}
                    </strong>
                  </div>

                  {authProvider === 'discord' && (
                    <div className="auth-user">
                      <span>Discord</span>
                      <strong>{discordName || 'Подключён'}</strong>
                    </div>
                  )}

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

                {/* Кошелёк Corza Coin */}
                <div className="profile-section">
                  <h3>Мой кошелёк</h3>

                  <div
                    style={{
                      padding: '24px',
                      marginTop: '14px',
                      borderRadius: '18px',
                      border: '1px solid rgba(150, 110, 255, 0.35)',
                      background:
                        'linear-gradient(135deg, rgba(100, 70, 200, 0.2), rgba(40, 150, 255, 0.12))',
                      textAlign: 'center',
                    }}
                  >
                    <span
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        opacity: 0.75,
                        marginBottom: '8px',
                      }}
                    >
                      ТВОЙ БАЛАНС
                    </span>

                    <strong
                      style={{
                        display: 'block',
                        fontSize: '34px',
                        fontWeight: 900,
                        color: '#b69aff',
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
                        marginTop: '8px',
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
                            background: 'rgba(120, 100, 180, 0.08)',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '12px',
                            }}
                          >
                            <strong style={{ fontSize: '13px' }}>
                              {getOperationName(transaction.operation)}
                            </strong>

                            <strong
                              style={{
                                color:
                                  Number(transaction.amount) > 0
                                    ? '#78e6b0'
                                    : '#ff8585',
                                whiteSpace: 'nowrap',
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
                              marginTop: '7px',
                            }}
                          >
                            {transaction.description || 'Без описания'}
                          </p>

                          <small
                            style={{
                              display: 'block',
                              opacity: 0.5,
                              marginTop: '7px',
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
            <h2>Добро пожаловать</h2>

            <p className="auth-description">
              Войди в государственную семью CORZA.
              Выбери удобный способ авторизации.
            </p>

            <div
              style={{
                display: 'grid',
                gap: '14px',
                marginTop: '25px',
              }}
            >
              <button
                className="auth-submit"
                type="button"
                onClick={() => handleOAuthLogin('google')}
                disabled={loading}
                style={{
                  background: '#ffffff',
                  color: '#222222',
                  border: '1px solid rgba(255,255,255,0.3)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <span style={{ fontSize: '20px' }}>G</span>
                {loading && loadingProvider === 'google'
                  ? 'Подключаем Google...'
                  : 'Продолжить с Google'}
              </button>

              <button
                className="auth-submit"
                type="button"
                onClick={() => handleOAuthLogin('discord')}
                disabled={loading}
                style={{
                  background: 'linear-gradient(100deg, #5865F2, #8065FF)',
                  color: '#ffffff',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <span style={{ fontSize: '20px' }}>🎮</span>
                {loading && loadingProvider === 'discord'
                  ? 'Подключаем Discord...'
                  : 'Продолжить с Discord'}
              </button>
            </div>

            <p
              style={{
                textAlign: 'center',
                fontSize: '12px',
                opacity: 0.55,
                marginTop: '22px',
                lineHeight: 1.6,
              }}
            >
              Авторизуясь, ты получаешь доступ к личному кабинету CORZA.
            </p>

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
