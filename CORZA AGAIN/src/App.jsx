
import { useEffect, useState } from 'react'
import './App.css'
import AuthModal from './AuthModal'
import AdminPanel from './AdminPanel'
import JoinPage from './JoinPage'
import PromotionPage from './PromotionPage'
import TasksPage from './TasksPage'
import DiscordWidget from './DiscordWidget'
import { supabase } from './supabase'
import NetworkBackground from './NetworkBackground'
import BlatPage from './BlatPage'
import SideMenu from './SideMenu'

const leaders = [
  {
    role: 'Глава семьи',
    name: 'Atlantica',
    description: 'Главное руководство CORZA. Ответственный за лидерские сроки Государственных структур. Коллер',
    initials: 'A',
    avatar: 'https://i.pinimg.com/736x/f2/d3/e1/f2d3e15af54704f10dcd81d5c576e2e5.jpg',
  },
  {
    role: 'Глава семьи',
    name: 'Entro',
    description: 'Главное руководство CORZA. Создатель семьи CORZA.',
    initials: 'E',
    avatar: 'https://i.pinimg.com/736x/f1/e3/9e/f1e39e5b37047bd564deda9ccec89d77.jpg',
  },
  {
    role: 'Заместитель главы',
    name: 'Senya',
    description: 'Ответственный за состав, за медиа семьи и техническую составляющую.',
    initials: 'S',
    avatar: 'https://i.pinimg.com/736x/2b/c4/2e/2bc42ea5266d4ab730335de5a2c36cfc.jpg',
  },
  {
    role: 'Заместитель главы',
    name: 'Yoshi',
    description: 'Ответственый за продвижение медиа семьи. Медиа лицо семьи',
    initials: 'Y',
    avatar: 'https://i.pinimg.com/736x/8c/b7/dd/8cb7dd86f301570d577dedc8bf5ca4ea.jpg',
  },
  {
    role: 'Заместитель главы',
    name: 'Artemka',
    description: 'Ответственный за лидерские сроки и контроль за составом семьи',
    initials: 'A',
    avatar: 'https://i.pinimg.com/736x/20/7a/23/207a23290eccb98a14050f453f9ffbc3.jpg',
  },
]

const features = [
  {
    number: '01',
    title: 'Вступление в семью',
    description: 'Подай заявку на вступление в CORZA и стань частью нашего сообщества.',
    link: '#join',
  },
  {
    number: '02',
    title: 'Система повышений',
    description: 'Отслеживай свой прогресс и подавай заявления на повышение ранга.',
    link: '#promotion',
  },
  {
    number: '03',
    title: 'Государственные структуры',
    description: 'Изучай состав государственных организаций на серверах Majestic RP.',
    link: '#government',
  },
  {
    number: '04',
    title: 'Переводы',
    description: 'Раздел электронных заявлений на перевод между организациями.',
    link: '#transfers',
  },
  {
    number: '05',
    title: 'Задания CORZA',
    description: 'Выполняй задания и получай Corza Coin.',
    link: '#tasks',
  },
]

const separatePages = [
  'join',
  'promotion',
  'government',
  'transfers',
  'admin',
  'tasks',
  'blat',
  'members',
]

const memberOnlyPages = ['promotion', 'tasks', 'transfers']

function getPageFromHash() {
  const hash = window.location.hash.replace('#', '')
  return separatePages.includes(hash) ? hash : 'home'
}

function LeaderAvatar({ leader }) {
  const [imageError, setImageError] = useState(false)

  return (
    <div className="leader-avatar">
      {!imageError ? (
        <img
          src={leader.avatar}
          alt={`Фотография ${leader.name}`}
          loading="eager"
          onError={() => setImageError(true)}
        />
      ) : (
        <span className="leader-avatar-fallback">{leader.initials}</span>
      )}
    </div>
  )
}

function MembersPage({
  members,
  registeredUsers,
  loading,
  error,
  onRefresh,
}) {
  function renderUser(profile, isMember) {
    return (
      <article
        className="admin-member"
        key={profile.id}
        style={{
          padding: '18px',
          borderRadius: '16px',
          background: 'rgba(130, 110, 210, 0.07)',
          border: '1px solid rgba(160, 140, 220, 0.15)',
        }}
      >
        <div>
          <strong>{profile.game_nickname || 'Без игрового никнейма'}</strong>
          <span>{profile.server || 'Сервер не указан'}</span>
          {isMember && (
            <span>{profile.position || 'Участник семьи'}</span>
          )}
        </div>

        <div className="admin-member-rank">
          <strong>{isMember ? 'CORZA' : 'Пользователь'}</strong>
          <span>{isMember ? 'Участник семьи' : 'Не состоит в семье'}</span>
        </div>
      </article>
    )
  }

  return (
    <section
      className="standalone-page glass"
      style={{
        width: 'min(1100px, calc(100% - 32px))',
        margin: '120px auto 60px',
        padding: 'clamp(22px, 4vw, 42px)',
        borderRadius: '24px',
      }}
    >
      <span className="section-label">CORZA / COMMUNITY</span>

      <h1>
        Состав <span>семьи.</span>
      </h1>

      <p>
        Здесь собраны участники CORZA и пользователи,
        зарегистрированные на нашем сайте.
      </p>

      <button
        type="button"
        className="secondary-button"
        onClick={onRefresh}
        disabled={loading}
        style={{ marginTop: '20px' }}
      >
        {loading ? 'Обновляем...' : 'Обновить список'}
      </button>

      {error && (
        <div className="admin-message" style={{ marginTop: '20px' }}>
          Не удалось загрузить пользователей: {error}
        </div>
      )}

      {loading ? (
        <p style={{ padding: '35px 0', textAlign: 'center' }}>
          Загружаем состав CORZA...
        </p>
      ) : (
        <>
          <div style={{ marginTop: '42px' }}>
            <div className="section-top">
              <div>
                <span className="section-label">CORZA FAMILY</span>
                <h2>
                  Участники <span>семьи.</span>
                </h2>
              </div>

              <strong style={{ fontSize: '22px', color: '#b69aff' }}>
                {members.length}
              </strong>
            </div>

            {members.length === 0 ? (
              <p className="admin-empty">Пока участников нет.</p>
            ) : (
              <div className="admin-list" style={{ marginTop: '20px' }}>
                {members.map((profile) => renderUser(profile, true))}
              </div>
            )}
          </div>

          <div style={{ marginTop: '50px' }}>
            <div className="section-top">
              <div>
                <span className="section-label">REGISTERED USERS</span>
                <h2>
                  Зарегистрированные <span>пользователи.</span>
                </h2>
              </div>

              <strong style={{ fontSize: '22px', color: '#9ca3af' }}>
                {registeredUsers.length}
              </strong>
            </div>

            {registeredUsers.length === 0 ? (
              <p className="admin-empty" style={{ marginTop: '20px' }}>
                Других зарегистрированных пользователей пока нет.
              </p>
            ) : (
              <div className="admin-list" style={{ marginTop: '20px' }}>
                {registeredUsers.map((profile) => renderUser(profile, false))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}

function App() {
  const [authOpen, setAuthOpen] = useState(false)
  const [page, setPage] = useState(getPageFromHash)

  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [sessionLoading, setSessionLoading] = useState(true)

  // Членство определяется полем is_member
  const isMember = Boolean(
    user && profile?.is_member === true && !profileLoading
  )

  const [pendingProfilePage, setPendingProfilePage] = useState(null)
  const [forceProfileEdit, setForceProfileEdit] = useState(false)

  const [isAdmin, setIsAdmin] = useState(false)
  const [adminCheckLoading, setAdminCheckLoading] = useState(true)

  const [coinLeaderboard, setCoinLeaderboard] = useState([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(true)
  const [leaderboardError, setLeaderboardError] = useState('')

  const [blatEnabled, setBlatEnabled] = useState(true)
  const [blatSettingsLoading, setBlatSettingsLoading] = useState(true)

  // Списки участников и зарегистрированных пользователей
  const [members, setMembers] = useState([])
  const [registeredUsers, setRegisteredUsers] = useState([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [membersError, setMembersError] = useState('')

  // Получение пользователя
  useEffect(() => {
    let active = true

    async function loadSession() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (!active) return

      if (error) {
        console.error('Ошибка получения сессии:', error)
        setSessionLoading(false)
        setProfileLoading(false)
        return
      }

      const currentUser = session?.user ?? null
      setProfileLoading(Boolean(currentUser))
      setUser(currentUser)
      setSessionLoading(false)
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null
      setProfileLoading(Boolean(currentUser))
      setUser(currentUser)
      setSessionLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  // Загрузка профиля
  useEffect(() => {
    let active = true

    async function loadProfile() {
      if (!user) {
        setProfile(null)
        setProfileLoading(false)
        return
      }

      setProfileLoading(true)

      const { data, error } = await supabase
        .from('profiles')
        .select('game_nickname, server, joined_at, is_member, rank, position')
        .eq('id', user.id)
        .maybeSingle()

      if (!active) return

      if (error) {
        console.error('Ошибка загрузки профиля:', error)
        setProfile(null)
      } else {
        setProfile(data)
      }

      setProfileLoading(false)
    }

    loadProfile()

    return () => {
      active = false
    }
  }, [user])

  // Обязательное заполнение профиля
  useEffect(() => {
    function handleProtectedNavigation(event) {
      const target = event.target
      if (!(target instanceof Element)) return

      const link = target.closest('a[href^="#"]')
      if (!link) return

      if (!link.closest('.navbar nav, .side-menu-panel')) return
      if (!user) return

      const destination = link.getAttribute('href')
      if (!destination || destination === '#') return

      const profileIncomplete =
        !profile?.game_nickname?.trim() ||
        !profile?.server?.toString().trim()

      if (profileLoading || profileIncomplete) {
        event.preventDefault()
        event.stopPropagation()
        setPendingProfilePage(destination)
        setForceProfileEdit(true)
        setAuthOpen(true)
      }
    }

    document.addEventListener('click', handleProtectedNavigation, true)

    return () => {
      document.removeEventListener('click', handleProtectedNavigation, true)
    }
  }, [user, profile, profileLoading])

  // Проверка прав администратора
  useEffect(() => {
    let active = true

    async function checkAdmin() {
      if (!user) {
        setIsAdmin(false)
        setAdminCheckLoading(false)
        return
      }

      setAdminCheckLoading(true)
      setIsAdmin(false)

      const { data, error } = await supabase.rpc('is_corza_admin')

      if (!active) return

      if (error) {
        console.error('Ошибка проверки прав администратора:', error)
        setIsAdmin(false)
      } else {
        setIsAdmin(data === true)
      }

      setAdminCheckLoading(false)
    }

    checkAdmin()

    return () => {
      active = false
    }
  }, [user])

  // Загрузка пользователей для страницы участников
  async function loadMembers() {
    setMembersLoading(true)
    setMembersError('')

    const { data, error } = await supabase
      .from('profiles')
      .select('id, game_nickname, server, is_member, position, rank')
      .order('game_nickname', { ascending: true })

    if (error) {
      console.error('Ошибка загрузки участников:', error)
      setMembersError(error.message)
      setMembers([])
      setRegisteredUsers([])
      setMembersLoading(false)
      return
    }

    const allProfiles = data || []

    setMembers(
      allProfiles.filter((item) => item.is_member === true)
    )

    setRegisteredUsers(
      allProfiles.filter((item) => item.is_member !== true)
    )

    setMembersLoading(false)
  }

  // Загружаем список при открытии страницы
  useEffect(() => {
    if (page === 'members') {
      loadMembers()
    }
  }, [page])

  // Обновляем список, если пользователь возвращается на вкладку
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible' && page === 'members') {
        loadMembers()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [page])

  // Загрузка настройки Дня блата
  useEffect(() => {
    let active = true

    async function loadBlatSetting() {
      const { data, error } = await supabase
        .from('blat_settings')
        .select('is_enabled')
        .eq('id', true)
        .maybeSingle()

      if (!active) return

      if (error) {
        console.error('Ошибка загрузки настройки Дня блата:', error)
        setBlatEnabled(false)
      } else {
        setBlatEnabled(data?.is_enabled ?? false)
      }

      setBlatSettingsLoading(false)
    }

    loadBlatSetting()

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        loadBlatSetting()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    const channel = supabase
      .channel('blat-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'blat_settings',
        },
        (payload) => {
          if (!active) return

          if (payload.new && typeof payload.new.is_enabled === 'boolean') {
            setBlatEnabled(payload.new.is_enabled)
            setBlatSettingsLoading(false)
          } else {
            loadBlatSetting()
          }
        }
      )
      .subscribe()

    return () => {
      active = false
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      supabase.removeChannel(channel)
    }
  }, [])

  // Загрузка рейтинга Corza Coin
  useEffect(() => {
    let active = true

    async function loadCoinLeaderboard() {
      setLeaderboardLoading(true)
      setLeaderboardError('')

      const { data, error } = await supabase.rpc(
        'get_corza_coin_leaderboard'
      )

      if (!active) return

      if (error) {
        console.error('Ошибка загрузки рейтинга CC:', error)
        setLeaderboardError(error.message)
        setCoinLeaderboard([])
      } else {
        setCoinLeaderboard(data || [])
      }

      setLeaderboardLoading(false)
    }

    loadCoinLeaderboard()

    return () => {
      active = false
    }
  }, [])

  // Переключение страниц и защита закрытых разделов
  useEffect(() => {
    function handleHashChange() {
      const hash = window.location.hash.replace('#', '')
      let nextPage = getPageFromHash()

      if (
        memberOnlyPages.includes(nextPage) &&
        (sessionLoading || profileLoading)
      ) {
        setPage('home')
        return
      }

      if (memberOnlyPages.includes(nextPage) && !isMember) {
        window.location.hash = '#home'
        setPage('home')
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }

      if (nextPage === 'blat' && !blatEnabled) {
        window.location.hash = '#home'
        nextPage = 'home'
      }

      setPage(nextPage)

      if (nextPage === 'home') {
        if (hash && hash !== 'home' && hash !== 'blat') {
          requestAnimationFrame(() => {
            document.getElementById(hash)?.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            })
          })
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }

    handleHashChange()
    window.addEventListener('hashchange', handleHashChange)

    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [
    blatEnabled,
    user,
    profile,
    profileLoading,
    sessionLoading,
    isMember,
  ])

  const accountName =
    profile?.game_nickname ||
    user?.user_metadata?.game_nickname ||
    user?.user_metadata?.nickname ||
    'Мой аккаунт'

  const accountInitial = accountName.charAt(0).toUpperCase()

  return (
    <div className="app">
      <NetworkBackground />

      <AuthModal
        open={authOpen}
        forceProfileEdit={forceProfileEdit}
        onClose={() => {
          if (!forceProfileEdit) setAuthOpen(false)
        }}
        onProfileSaved={(savedProfile) => {
          setProfile((currentProfile) => ({
            ...(currentProfile || {}),
            ...savedProfile,
          }))

          setForceProfileEdit(false)
          setAuthOpen(false)

          if (pendingProfilePage) {
            window.location.hash = pendingProfilePage
            setPendingProfilePage(null)
          }
        }}
      />

      <div className="stars stars-one" />
      <div className="stars stars-two" />

      <SideMenu
        user={user}
        isMember={isMember}
        isAdmin={isAdmin && !adminCheckLoading}
        blatEnabled={blatEnabled && !blatSettingsLoading}
      />

      {blatEnabled && !blatSettingsLoading && page !== 'blat' && (
        <a href="#blat" className="blat-floating-button">
          <span className="blat-floating-icon">✦</span>
          <span className="blat-floating-text">
            <strong>День блата</strong>
            <small>Подать заявку</small>
          </span>
          <span className="blat-floating-arrow">↗</span>
        </a>
      )}

      <header className="navbar glass">
        <a className="logo" href="#home">
          <span className="logo-symbol">C</span>
          <span>CORZA</span>
        </a>

        <nav>
          <a href="#home">Главная</a>
          <a href="#about">О семье</a>
          <a href="#leaders">Руководство</a>
          <a href="#coins">Рейтинг CC</a>
        </nav>

        {user ? (
          <button
            className="account-chip"
            onClick={() => setAuthOpen(true)}
            title="Ваш аккаунт"
          >
            <div className="account-avatar">{accountInitial}</div>
            <span className="account-name">{accountName}</span>
          </button>
        ) : (
          <button
            className="nav-button"
            onClick={() => setAuthOpen(true)}
          >
            Войти / Регистрация
          </button>
        )}
      </header>

      <main>
        {page === 'home' && (
          <>
            <section className="hero" id="home">
              <div className="hero-content">
                <div className="eyebrow">
                  <span className="status-dot" />
                  MAJESTIC ROLEPLAY · GOVERNMENT FAMILY
                </div>

                <h1>
                  BEYOND
                  <span>THE LIMITS.</span>
                </h1>

                <p className="hero-description">
                  CORZA — больше, чем семья. Это единство, развитие,
                  дисциплина и стремление к вершине.
                </p>

                <div className="hero-actions">
                  <a href="#join" className="primary-button">
                    Присоединиться <span>↗</span>
                  </a>
                  <a href="#about" className="secondary-button">
                    Узнать о нас
                  </a>
                </div>

                <div className="hero-stats">
                  <div><strong>01</strong><span>Единая команда</span></div>
                  <div><strong>∞</strong><span>Возможности</span></div>
                  <div><strong>24/7</strong><span>Развитие семьи</span></div>
                </div>
              </div>

              <div className="orbital">
                <div className="orbit orbit-one" />
                <div className="orbit orbit-two" />
                <div className="planet"><span>C</span></div>
                <div className="orbit-label">C O R Z A</div>

                <div className="floating-card glass">
                  <span className="floating-icon">✦</span>
                  <div>
                    <strong>THE NEXT LEVEL</strong>
                    <small>Новая эра начинается здесь</small>
                  </div>
                </div>
              </div>
            </section>

            <section className="about-section" id="about">
              <div className="section-heading">
                <span className="section-label">01 / О ПРОЕКТЕ</span>
                <h2>Созданы для <span>большего.</span></h2>
                <p>
                  Мы строим сильную государственную семью, где каждый участник
                  может развиваться, достигать целей и вносить вклад в общее дело.
                </p>
              </div>
            </section>

            <section className="leaders-section" id="leaders">
              <div className="section-top">
                <div>
                  <span className="section-label">02 / УПРАВЛЕНИЕ</span>
                  <h2>Наше <span>руководство.</span></h2>
                </div>
                <p>Люди, отвечающие за развитие и стабильность CORZA.</p>
              </div>

              <div className="leaders-grid">
                {leaders.map((leader) => (
                  <article className="leader-card glass" key={leader.name}>
                    <LeaderAvatar leader={leader} />
                    <span className="leader-role">{leader.role}</span>
                    <h3>{leader.name}</h3>
                    <p>{leader.description}</p>
                    <div className="leader-line" />
                  </article>
                ))}
              </div>
            </section>

            <section
              className="features-section"
              id="coins"
              style={{ scrollMarginTop: '110px' }}
            >
              <div className="section-top">
                <div>
                  <span className="section-label">03 / CORZA ECONOMY</span>
                  <h2>TOP-100 <span>Corza Coin.</span></h2>
                </div>
                <p>Самые богатые участники государственной семьи CORZA.</p>
              </div>

              <div
                className="glass"
                style={{
                  padding: '24px',
                  borderRadius: '22px',
                  marginTop: '30px',
                }}
              >
                {leaderboardLoading ? (
                  <p style={{ textAlign: 'center', padding: '30px' }}>
                    Загружаем рейтинг CORZA...
                  </p>
                ) : leaderboardError ? (
                  <div style={{ textAlign: 'center', padding: '30px' }}>
                    <h3>Не удалось загрузить рейтинг</h3>
                    <p style={{ opacity: 0.7, marginTop: '10px' }}>
                      {leaderboardError}
                    </p>
                    <button
                      className="secondary-button"
                      style={{ marginTop: '18px' }}
                      onClick={async () => {
                        setLeaderboardLoading(true)
                        setLeaderboardError('')

                        const { data, error } = await supabase.rpc(
                          'get_corza_coin_leaderboard'
                        )

                        if (error) setLeaderboardError(error.message)
                        else setCoinLeaderboard(data || [])

                        setLeaderboardLoading(false)
                      }}
                    >
                      Повторить загрузку
                    </button>
                  </div>
                ) : coinLeaderboard.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '30px' }}>
                    Пока никто не попал в рейтинг.
                  </p>
                ) : (
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {coinLeaderboard.map((player, index) => (
                      <div
                        key={`${player.player_name}-${index}`}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '48px minmax(0, 1fr) auto',
                          alignItems: 'center',
                          gap: '14px',
                          padding: '15px',
                          borderRadius: '14px',
                          border: '1px solid rgba(160, 140, 220, 0.18)',
                          background: index < 3
                            ? 'linear-gradient(100deg, rgba(130, 90, 220, 0.18), rgba(40, 150, 255, 0.08))'
                            : 'rgba(120, 100, 180, 0.06)',
                        }}
                      >
                        <div style={{
                          fontSize: index < 3 ? '20px' : '15px',
                          fontWeight: 900,
                          textAlign: 'center',
                          color: index === 0 ? '#ffd66b'
                            : index === 1 ? '#d6dce8'
                              : index === 2 ? '#d99a70' : '#a99bd2',
                        }}>
                          {index === 0 ? '🥇'
                            : index === 1 ? '🥈'
                              : index === 2 ? '🥉' : `#${index + 1}`}
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <strong style={{
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>
                            {player.player_name}
                          </strong>
                          <span style={{
                            display: 'block',
                            fontSize: '12px',
                            opacity: 0.6,
                            marginTop: '4px',
                          }}>
                            {player.player_server || 'Сервер не указан'}
                          </span>
                        </div>

                        <strong style={{
                          color: '#b69aff',
                          whiteSpace: 'nowrap',
                          fontSize: '14px',
                        }}>
                          {Number(player.coin_balance).toLocaleString('ru-RU')} CC
                        </strong>
                      </div>
                    ))}
                  </div>
                )}

                <p style={{
                  textAlign: 'center',
                  opacity: 0.5,
                  fontSize: '12px',
                  marginTop: '18px',
                }}>
                  Рейтинг формируется автоматически на основе баланса игроков.
                </p>
              </div>
            </section>

            <section className="features-section" id="features">
              <div className="section-heading">
                <span className="section-label">04 / ИНФРАСТРУКТУРА</span>
                <h2>Всё необходимое. <span>В одном месте.</span></h2>
              </div>

              <div className="features-grid">
                {features.map((feature) => (
                  <a
                    className="feature-card glass"
                    key={feature.number}
                    href={feature.link}
                  >
                    <span>{feature.number}</span>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                    <div className="feature-arrow">↗</div>
                  </a>
                ))}
              </div>
            </section>

            <section className="join-section">
              <div className="join-card glass">
                <span className="section-label">
                  05 / ТВОЯ ИСТОРИЯ НАЧИНАЕТСЯ ЗДЕСЬ
                </span>
                <h2>Стань частью <span>CORZA.</span></h2>
                <p>Твоя следующая глава начинается с одного решения.</p>
                <a className="primary-button" href="#join">
                  Подать заявку <span>↗</span>
                </a>
              </div>
            </section>
          </>
        )}

        {/* СТРАНИЦА УЧАСТНИКОВ */}
        {page === 'members' && (
          <MembersPage
            members={members}
            registeredUsers={registeredUsers}
            loading={membersLoading}
            error={membersError}
            onRefresh={loadMembers}
          />
        )}

        {/* ДЕНЬ БЛАТА */}
        {page === 'blat' && (
          blatEnabled && !blatSettingsLoading ? (
            <BlatPage
              onBack={() => {
                window.location.hash = '#home'
              }}
            />
          ) : (
            <section className="standalone-page glass">
              <span className="section-label">CORZA / BLAT DAY</span>
              <h1>Приём заявок <span>закрыт.</span></h1>
              <p>В данный момент День блата выключен администрацией CORZA.</p>
              <a className="secondary-button" href="#home">На главную</a>
            </section>
          )
        )}

        {page === 'tasks' && isMember && <TasksPage />}

        {page === 'join' && (
          <JoinPage onOpenAuth={() => setAuthOpen(true)} />
        )}

        {page === 'promotion' && isMember && (
          <PromotionPage onOpenAuth={() => setAuthOpen(true)} />
        )}

        {page === 'government' && (
          <section className="standalone-page glass">
            <span className="section-label">CORZA / GOVERNMENT</span>
            <h1>Государственные <span>структуры.</span></h1>
            <p>
              Здесь будет размещена информация о руководстве LSPD, LSCSD,
              FIB и GOV на серверах Majestic RP.
            </p>
            <p className="page-note">
              Состав организаций и занимаемые CORZA руководящие должности
              добавим отдельным этапом.
            </p>
            <a className="secondary-button" href="#home">На главную</a>
          </section>
        )}

        {page === 'transfers' && isMember && (
          <section className="standalone-page glass">
            <span className="section-label">CORZA / TRANSFERS</span>
            <h1>Заявления на <span>перевод.</span></h1>
            <p>
              Раздел для переводов из другой фракции в организацию CORZA
              и из CORZA в другую фракцию будет добавлен следующим этапом.
            </p>
            <p className="page-note">
              Пока отправка заявлений на перевод не подключена к базе данных.
            </p>
            <a className="secondary-button" href="#home">На главную</a>
          </section>
        )}

        {page === 'admin' && isAdmin && !adminCheckLoading && (
          <AdminPanel />
        )}
      </main>

      <footer>
        <a className="logo" href="#home">
          <span className="logo-symbol">C</span>
          <span>CORZA</span>
        </a>
        <p>© 2026 CORZA FAMILY. ALL RIGHTS RESERVED.</p>
        <span>MAJESTIC ROLEPLAY</span>
      </footer>

      <DiscordWidget />
    </div>
  )
}

export default App
