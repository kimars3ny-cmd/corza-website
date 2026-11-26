
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import './ProfileFrames.css'

function AuthModal({
  open,
  onClose,
  forceProfileEdit = false,
  onProfileSaved,
}) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingProvider, setLoadingProvider] = useState('')

  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  const [editProfile, setEditProfile] = useState(false)
  const [editNickname, setEditNickname] = useState('')
  const [editServer, setEditServer] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  const [coinBalance, setCoinBalance] = useState(null)
  const [coinTransactions, setCoinTransactions] = useState([])
  const [showAllTransactions, setShowAllTransactions] = useState(false)

  // МАГАЗИН РАМОК
  const [frames, setFrames] = useState([])
  const [ownedFrames, setOwnedFrames] = useState([])
  const [framesLoading, setFramesLoading] = useState(false)
  const [frameAction, setFrameAction] = useState('')

  // =========================================
  // ПРОВЕРКА АВТОРИЗАЦИИ
  // =========================================

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

  // =========================================
  // ЗАГРУЗКА ПРОФИЛЯ И ПРОВЕРКА АДМИНА
  // =========================================

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
        .select(
          'game_nickname, server, rank, position, joined_at, equipped_frame'
        )
        .eq('id', user.id)
        .maybeSingle()

      if (!active) return

      if (error) {
        setProfile(null)
        setMessage('Ошибка загрузки профиля: ' + error.message)
      } else {
        setProfile(data)
      }

      const { data: adminData, error: adminError } =
        await supabase.rpc('is_corza_admin')

      if (!active) return

      setIsAdmin(!adminError && adminData === true)
      setProfileLoading(false)
    }

    loadProfile()

    return () => {
      active = false
    }
  }, [user])

  // =========================================
  // ОБЯЗАТЕЛЬНОЕ ЗАПОЛНЕНИЕ ПРОФИЛЯ
  // =========================================

  useEffect(() => {
    if (!open || !forceProfileEdit || !user || profileLoading) return

    setEditNickname(profile?.game_nickname || '')
    setEditServer(profile?.server || '')
    setMessage('')
    setEditProfile(true)
  }, [open, forceProfileEdit, user, profileLoading])

  // =========================================
  // ЗАГРУЗКА CORZA COIN
  // =========================================

  async function refreshCoinData() {
    if (!user) return

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

    if (walletResult.error) {
      setMessage(
        'Ошибка загрузки кошелька: ' + walletResult.error.message
      )
    } else {
      setCoinBalance(Number(walletResult.data?.balance ?? 0))
    }

    if (transactionsResult.error) {
      setMessage(
        'Ошибка загрузки истории CC: ' +
          transactionsResult.error.message
      )
    } else {
      setCoinTransactions(transactionsResult.data || [])
    }
  }

  useEffect(() => {
    let active = true

    async function loadCoinData() {
      if (!user) {
        setCoinBalance(null)
        setCoinTransactions([])
        setShowAllTransactions(false)
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
        setMessage(
          'Ошибка загрузки кошелька: ' + walletResult.error.message
        )
      } else {
        setCoinBalance(Number(walletResult.data?.balance ?? 0))
      }

      if (transactionsResult.error) {
        setMessage(
          'Ошибка загрузки истории CC: ' +
            transactionsResult.error.message
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

  // =========================================
  // ЗАГРУЗКА МАГАЗИНА И КУПЛЕННЫХ РАМОК
  // =========================================

  useEffect(() => {
    let active = true

    async function loadFrames() {
      if (!user) {
        setFrames([])
        setOwnedFrames([])
        return
      }

      setFramesLoading(true)

      const [catalogResult, ownedResult] = await Promise.all([
        supabase
          .from('corza_profile_frames')
          .select('id, name, price, rarity')
          .order('price', { ascending: true }),

        supabase
          .from('corza_user_frames')
          .select('frame_id')
          .eq('user_id', user.id),
      ])

      if (!active) return

      if (catalogResult.error) {
        setMessage(
          'Ошибка загрузки магазина рамок: ' +
            catalogResult.error.message
        )
      } else {
        setFrames(catalogResult.data || [])
      }

      if (ownedResult.error) {
        setMessage(
          'Ошибка загрузки купленных рамок: ' +
            ownedResult.error.message
        )
      } else {
        setOwnedFrames(
          (ownedResult.data || []).map((item) => item.frame_id)
        )
      }

      setFramesLoading(false)
    }

    loadFrames()

    return () => {
      active = false
    }
  }, [user])

  // =========================================
  // ПОКУПКА РАМКИ
  // =========================================

  async function buyFrame(frame) {
    if (!user) {
      setMessage('Сначала необходимо авторизоваться.')
      return
    }

    if (ownedFrames.includes(frame.id)) {
      setMessage('Эта рамка уже есть в твоей коллекции.')
      return
    }

    if (coinBalance === null || coinBalance < Number(frame.price)) {
      setMessage('Недостаточно Corza Coin для покупки этой рамки.')
      return
    }

    setFrameAction(frame.id)
    setMessage('')

    try {
      const { error } = await supabase.rpc('purchase_corza_frame', {
        p_frame_id: frame.id,
      })

      if (error) throw error

      setOwnedFrames((previous) => [...previous, frame.id])

      await refreshCoinData()

      setMessage(`Рамка «${frame.name}» успешно куплена!`)
    } catch (error) {
      console.error('Ошибка покупки рамки:', error)
      setMessage('Не удалось купить рамку: ' + error.message)
    } finally {
      setFrameAction('')
    }
  }

  // =========================================
  // НАДЕТЬ ИЛИ СНЯТЬ РАМКУ
  // =========================================

  async function equipFrame(frameId) {
    if (!user) return

    setFrameAction(frameId || 'none')
    setMessage('')

    try {
      const { error } = await supabase.rpc('equip_corza_frame', {
        p_frame_id: frameId || 'none',
      })

      if (error) throw error

      setProfile((previous) => ({
        ...(previous || {}),
        equipped_frame: frameId || 'none',
      }))

      const selectedFrame = frames.find((frame) => frame.id === frameId)

      setMessage(
        frameId
          ? `Рамка «${selectedFrame?.name || ''}» надета!`
          : 'Рамка снята.'
      )
    } catch (error) {
      console.error('Ошибка смены рамки:', error)
      setMessage('Не удалось изменить рамку: ' + error.message)
    } finally {
      setFrameAction('')
    }
  }

  // =========================================
  // ВХОД ЧЕРЕЗ GOOGLE И DISCORD
  // =========================================

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

  // =========================================
  // РЕДАКТИРОВАНИЕ ПРОФИЛЯ
  // =========================================

  function openProfileEdit() {
    setEditNickname(profile?.game_nickname || '')
    setEditServer(profile?.server || '')
    setMessage('')
    setEditProfile(true)
  }

  async function saveProfile() {
    if (!editNickname.trim() || !editServer.trim()) {
      setMessage('Заполни игровой никнейм и сервер.')
      return
    }

    if (!user) {
      setMessage('Необходимо авторизоваться.')
      return
    }

    setSavingProfile(true)
    setMessage('')

    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            game_nickname: editNickname.trim(),
            server: editServer.trim(),
          },
          {
            onConflict: 'id',
          }
        )
        .select(
          'game_nickname, server, rank, position, joined_at, equipped_frame'
        )
        .single()

      if (error) throw error

      setProfile(data)
      setEditProfile(false)
      setMessage('Данные профиля успешно обновлены!')

      if (onProfileSaved) onProfileSaved(data)
    } catch (error) {
      console.error('Ошибка сохранения профиля:', error)
      setMessage('Ошибка сохранения профиля: ' + error.message)
    } finally {
      setSavingProfile(false)
    }
  }

  // =========================================
  // ВЫХОД ИЗ АККАУНТА
  // =========================================

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
      setShowAllTransactions(false)
      setFrames([])
      setOwnedFrames([])
      setEditProfile(false)
      setMessage('')
      onClose()
    }

    setLoading(false)
  }

  // =========================================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // =========================================

  function formatDate(date) {
    if (!date) return 'Не указана'

    return new Date(date).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

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

  function getRarityName(rarity) {
    const names = {
      common: 'Обычная',
      rare: 'Редкая',
      epic: 'Эпическая',
      legendary: 'Легендарная',
    }

    return names[rarity] || 'Особая'
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

  const equippedFrame = profile?.equipped_frame || 'none'

  const authProvider =
    user?.app_metadata?.provider ||
    user?.identities?.[0]?.provider ||
    ''

  const discordName =
    user?.user_metadata?.global_name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.user_name

  const visibleTransactions = showAllTransactions
    ? coinTransactions
    : coinTransactions.slice(0, 1)

  // =========================================
  // ИНТЕРФЕЙС
  // =========================================

  return (
    <div
      className="auth-overlay"
      onClick={forceProfileEdit ? undefined : onClose}
    >
      <div
        className="auth-modal glass corza-profile-modal"
        onClick={(event) => event.stopPropagation()}
      >
        {(!forceProfileEdit || !user) && (
          <button
            className="auth-close"
            onClick={onClose}
            type="button"
            aria-label="Закрыть"
          >
            ×
          </button>
        )}

        <div className="auth-logo">C</div>

        <span className="section-label">CORZA FAMILY PORTAL</span>

        {user ? (
          <div className="auth-content corza-profile-content">
            {profileLoading ? (
              <>
                <h2>Загрузка аккаунта</h2>
                <p className="auth-description">
                  Подготавливаем твой личный кабинет CORZA...
                </p>
              </>
            ) : (
              <>
                {/* ШАПКА ПРОФИЛЯ */}

                <div className="corza-profile-header">
                  <div
                    className={`corza-profile-avatar frame-${equippedFrame}`}
                  >
                    {accountInitial}
                  </div>

                  <div className="corza-profile-heading">
                    <h2>{accountName}</h2>

                    <span>
                      {profile?.server
                        ? `Majestic RP · Сервер ${profile.server}`
                        : 'Игрок CORZA'}
                    </span>

                    {isAdmin && (
                      <div className="admin-profile-badge">
                        <span className="admin-profile-icon">♛</span>
                        АДМИНИСТРАТОР
                      </div>
                    )}
                  </div>

                  {!editProfile && (
                    <button
                      className="corza-edit-icon"
                      type="button"
                      onClick={openProfileEdit}
                      title="Изменить профиль"
                    >
                      ✎
                    </button>
                  )}
                </div>

                {/* РЕДАКТИРОВАНИЕ */}

                {editProfile && (
                  <div className="corza-edit-panel">
                    <h3>
                      {forceProfileEdit
                        ? 'Заполнение профиля'
                        : 'Редактирование профиля'}
                    </h3>

                    <label>Игровой никнейм</label>

                    <input
                      type="text"
                      value={editNickname}
                      onChange={(event) =>
                        setEditNickname(event.target.value)
                      }
                      placeholder="Например: Atlantica_Corza"
                      maxLength={40}
                      required
                    />

                    <label>Сервер Majestic RP</label>

                    <input
                      type="text"
                      value={editServer}
                      onChange={(event) =>
                        setEditServer(event.target.value)
                      }
                      placeholder="Например: 1"
                      maxLength={50}
                      required
                    />

                    <button
                      className="auth-submit"
                      type="button"
                      onClick={saveProfile}
                      disabled={savingProfile}
                    >
                      {savingProfile
                        ? 'Сохраняем...'
                        : 'Сохранить изменения'}
                    </button>

                    {!forceProfileEdit && (
                      <button
                        className="auth-submit auth-logout"
                        type="button"
                        onClick={() => {
                          setEditProfile(false)
                          setMessage('')
                        }}
                        disabled={savingProfile}
                      >
                        Отмена
                      </button>
                    )}
                  </div>
                )}

                {/* ИНФОРМАЦИЯ О ПРОФИЛЕ */}

                <div className="corza-profile-grid">
                  <div className="corza-info-card">
                    <span>ИГРОВОЙ РАНГ</span>
                    <strong>{profile?.rank || 'Новичок'}</strong>
                  </div>

                  <div className="corza-info-card">
                    <span>ДОЛЖНОСТЬ</span>
                    <strong>{profile?.position || 'Участник'}</strong>
                  </div>

                  <div className="corza-info-card">
                    <span>СЕРВЕР</span>
                    <strong>{profile?.server || 'Не указан'}</strong>
                  </div>

                  <div className="corza-info-card">
                    <span>В СЕМЬЕ С</span>
                    <strong>{formatDate(profile?.joined_at)}</strong>
                  </div>
                </div>

                {/* ДАННЫЕ АККАУНТА */}

                <div className="corza-account-details">
                  <div>
                    <span>Электронная почта</span>
                    <strong>{user.email || 'Не указана'}</strong>
                  </div>

                  <div>
                    <span>Способ авторизации</span>
                    <strong>
                      {authProvider === 'discord'
                        ? 'Discord'
                        : authProvider === 'google'
                          ? 'Google'
                          : authProvider || 'Не определён'}
                    </strong>
                  </div>

                  {authProvider === 'discord' && (
                    <div>
                      <span>Discord</span>
                      <strong>{discordName || 'Подключён'}</strong>
                    </div>
                  )}
                </div>

                {/* CORZA COIN */}

                <div className="corza-wallet-card">
                  <div className="corza-wallet-top">
                    <div>
                      <span>ТВОЙ БАЛАНС</span>

                      <strong>
                        {coinBalance === null
                          ? 'Загрузка...'
                          : `${coinBalance.toLocaleString('ru-RU')} CC`}
                      </strong>
                    </div>

                    <div className="corza-wallet-icon">◈</div>
                  </div>

                  <div className="corza-wallet-bottom">
                    <span>CORZA COIN</span>
                    <span>ЛИЧНЫЙ КОШЕЛЁК</span>
                  </div>
                </div>

                {/* МАГАЗИН РАМОК */}

                <div className="corza-frames-shop">
                  <div className="corza-frames-heading">
                    <div>
                      <span className="corza-frames-eyebrow">
                        ПЕРСОНАЛИЗАЦИЯ
                      </span>
                      <h3>Магазин рамок</h3>
                    </div>

                    <div className="corza-frames-counter">
                      {ownedFrames.length} / {frames.length}
                    </div>
                  </div>

                  <p className="corza-frames-description">
                    Выбирай оформление аватара. Купленные рамки останутся
                    у тебя навсегда.
                  </p>

                  {framesLoading ? (
                    <div className="corza-frames-loading">
                      Загружаем коллекцию рамок...
                    </div>
                  ) : frames.length === 0 ? (
                    <div className="corza-frames-loading">
                      Рамки пока не найдены.
                    </div>
                  ) : (
                    <div className="corza-frames-grid">
                      {frames.map((frame) => {
                        const isOwned = ownedFrames.includes(frame.id)
                        const isEquipped = equippedFrame === frame.id
                        const isBusy = frameAction === frame.id

                        return (
                          <div
                            className={`corza-frame-card rarity-${frame.rarity}`}
                            key={frame.id}
                          >
                            <div className="corza-frame-preview-wrap">
                              <div
                                className={`corza-frame-preview frame-${frame.id}`}
                              >
                                {accountInitial}
                              </div>

                              {isEquipped && (
                                <span className="corza-frame-equipped">
                                  НАДЕТА
                                </span>
                              )}
                            </div>

                            <div className="corza-frame-info">
                              <strong>{frame.name}</strong>
                              <span>
                                {getRarityName(frame.rarity)}
                              </span>
                            </div>

                            {!isOwned ? (
                              <button
                                className="corza-frame-button"
                                type="button"
                                disabled={
                                  isBusy ||
                                  coinBalance === null ||
                                  coinBalance < Number(frame.price)
                                }
                                onClick={() => buyFrame(frame)}
                              >
                                {isBusy
                                  ? 'Покупаем...'
                                  : `${Number(frame.price).toLocaleString('ru-RU')} CC`}
                              </button>
                            ) : isEquipped ? (
                              <button
                                className="corza-frame-button frame-button-muted"
                                type="button"
                                disabled={isBusy}
                                onClick={() => equipFrame('')}
                              >
                                {frameAction === 'none'
                                  ? 'Снимаем...'
                                  : 'Снять рамку'}
                              </button>
                            ) : (
                              <button
                                className="corza-frame-button frame-button-owned"
                                type="button"
                                disabled={isBusy}
                                onClick={() => equipFrame(frame.id)}
                              >
                                {isBusy ? 'Надеваем...' : 'Надеть'}
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <div className="corza-frames-note">
                    <span>◈</span>
                    Покупка рамки списывает CC с твоего личного кошелька.
                  </div>
                </div>

                {/* ИСТОРИЯ ОПЕРАЦИЙ */}

                <div className="corza-history">
                  <div className="corza-history-heading">
                    <h3>История операций</h3>

                    {coinTransactions.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setShowAllTransactions((previous) => !previous)
                        }
                      >
                        {showAllTransactions
                          ? 'Свернуть ↑'
                          : 'Все операции ↓'}
                      </button>
                    )}
                  </div>

                  {coinBalance === null ? (
                    <p className="auth-description">
                      Загружаем историю операций...
                    </p>
                  ) : coinTransactions.length === 0 ? (
                    <p className="auth-description">
                      Операций пока нет.
                    </p>
                  ) : (
                    <div
                      className={
                        showAllTransactions
                          ? 'corza-history-list expanded'
                          : 'corza-history-list'
                      }
                    >
                      {visibleTransactions.map((transaction) => {
                        const amount = Number(transaction.amount)
                        const isCredit = amount > 0

                        return (
                          <div
                            key={transaction.id}
                            className="corza-transaction"
                          >
                            <div className="corza-transaction-main">
                              <div className="corza-transaction-info">
                                <strong>
                                  {getOperationName(transaction.operation)}
                                </strong>

                                <span>
                                  {transaction.description ||
                                    'Без описания'}
                                </span>
                              </div>

                              <strong
                                className={
                                  isCredit
                                    ? 'corza-transaction-credit'
                                    : 'corza-transaction-debit'
                                }
                              >
                                {isCredit ? '+' : ''}
                                {amount.toLocaleString('ru-RU')} CC
                              </strong>
                            </div>

                            <small>
                              {formatDateTime(transaction.created_at)}
                            </small>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* СООБЩЕНИЯ */}

                {message && (
                  <div className="auth-message">{message}</div>
                )}

                {/* ВЫХОД */}

                {!forceProfileEdit && (
                  <button
                    className="auth-submit auth-logout corza-logout"
                    onClick={handleLogout}
                    type="button"
                    disabled={loading}
                  >
                    {loading ? 'Подожди...' : 'Выйти из аккаунта'}
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          /* АВТОРИЗАЦИЯ */

          <div className="auth-content">
            <h2>Добро пожаловать</h2>

            <p className="auth-description">
              Войди в государственную семью CORZA.
              Выбери удобный способ авторизации.
            </p>

            <div className="corza-login-buttons">
              <button
                className="auth-submit corza-google-button"
                type="button"
                onClick={() => handleOAuthLogin('google')}
                disabled={loading}
              >
                <span>G</span>

                {loading && loadingProvider === 'google'
                  ? 'Подключаем Google...'
                  : 'Продолжить с Google'}
              </button>

              <button
                className="auth-submit corza-discord-button"
                type="button"
                onClick={() => handleOAuthLogin('discord')}
                disabled={loading}
              >
                <span>🎮</span>

                {loading && loadingProvider === 'discord'
                  ? 'Подключаем Discord...'
                  : 'Продолжить с Discord'}
              </button>
            </div>

            <p className="corza-login-note">
              Авторизуясь, ты получаешь доступ к личному кабинету CORZA.
            </p>

            {message && (
              <div className="auth-message">{message}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default AuthModal
