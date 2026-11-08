
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
]

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
        <span className="leader-avatar-fallback">
          {leader.initials}
        </span>
      )}
    </div>
  )
}

function App() {
  const [authOpen, setAuthOpen] = useState(false)
  const [page, setPage] = useState(getPageFromHash)

  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)

  // Проверка прав администратора
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminCheckLoading, setAdminCheckLoading] = useState(true)

  const [coinLeaderboard, setCoinLeaderboard] = useState([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(true)
  const [leaderboardError, setLeaderboardError] = useState('')

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
        return
      }

      setUser(session?.user ?? null)
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
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
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('game_nickname')
        .eq('id', user.id)
        .maybeSingle()

      if (!active) return

      if (error) {
        console.error('Ошибка загрузки профиля:', error)
        setProfile(null)
        return
      }

      setProfile(data)
    }

    loadProfile()

    return () => {
      active = false
    }
  }, [user])

  // Проверка прав администратора через Supabase RPC
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

  // Переключение страниц
  useEffect(() => {
    function handleHashChange() {
      const hash = window.location.hash.replace('#', '')
      const nextPage = getPageFromHash()

      setPage(nextPage)

      if (nextPage === 'home') {
        if (hash && hash !== 'home') {
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
  }, [])

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
        onClose={() => setAuthOpen(false)}
      />

      <div className="stars stars-one" />
      <div className="stars stars-two" />

      {/* ЛЕВАЯ КНОПКА АДМИНИСТРИРОВАНИЯ — ТОЛЬКО ДЛЯ АДМИНОВ */}
      {user && isAdmin && !adminCheckLoading && (
        <aside className="side-admin-panel">
          <a href="#admin" className="side-admin-button">
            <span className="side-admin-icon">⚙</span>
            <span>Администрирование</span>
          </a>
        </aside>
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

          {user && (
            <>
              <a href="#tasks">Задания</a>
              <a href="#join">Вступление</a>
              <a href="#promotion">Повышение</a>
            </>
          )}

          <a href="#government">Структуры</a>
        </nav>

        {user ? (
          <button
            className="account-chip"
            onClick={() => setAuthOpen(true)}
            title="Ваш аккаунт"
          >
            <div className="account-avatar">
              {accountInitial}
            </div>

            <span className="account-name">
              {accountName}
            </span>
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
            {/* ГЛАВНЫЙ ЭКРАН */}
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
                  <div>
                    <strong>01</strong>
                    <span>Единая команда</span>
                  </div>

                  <div>
                    <strong>∞</strong>
                    <span>Возможности</span>
                  </div>

                  <div>
                    <strong>24/7</strong>
                    <span>Развитие семьи</span>
                  </div>
                </div>
              </div>

              <div className="orbital">
                <div className="orbit orbit-one" />
                <div className="orbit orbit-two" />

                <div className="planet">
                  <span>C</span>
                </div>

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

            {/* О СЕМЬЕ */}
            <section className="about-section" id="about">
              <div className="section-heading">
                <span className="section-label">01 / О ПРОЕКТЕ</span>

                <h2>
                  Созданы для <span>большего.</span>
                </h2>

                <p>
                  Мы строим сильную государственную семью, где каждый участник
                  может развиваться, достигать целей и вносить вклад в общее дело.
                </p>
              </div>
            </section>

            {/* РУКОВОДСТВО */}
            <section className="leaders-section" id="leaders">
              <div className="section-top">
                <div>
                  <span className="section-label">02 / УПРАВЛЕНИЕ</span>

                  <h2>
                    Наше <span>руководство.</span>
                  </h2>
                </div>

                <p>
                  Люди, отвечающие за развитие и стабильность CORZA.
                </p>
              </div>

              <div className="leaders-grid">
                {leaders.map((leader) => (
                  <article className="leader-card glass" key={leader.name}>
                    <LeaderAvatar leader={leader} />

                    <span className="leader-role">
                      {leader.role}
                    </span>

                    <h3>{leader.name}</h3>
                    <p>{leader.description}</p>
                    <div className="leader-line" />
                  </article>
                ))}
              </div>
            </section>

            {/* РЕЙТИНГ CORZA COIN */}
            <section
              className="features-section"
              id="coins"
              style={{ scrollMarginTop: '110px' }}
            >
              <div className="section-top">
                <div>
                  <span className="section-label">
                    03 / CORZA ECONOMY
                  </span>

                  <h2>
                    TOP-100 <span>Corza Coin.</span>
                  </h2>
                </div>

                <p>
                  Самые богатые участники государственной семьи CORZA.
                </p>
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

                        if (error) {
                          setLeaderboardError(error.message)
                        } else {
                          setCoinLeaderboard(data || [])
                        }

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
                        <div
                          style={{
                            fontSize: index < 3 ? '20px' : '15px',
                            fontWeight: 900,
                            textAlign: 'center',
                            color: index === 0
                              ? '#ffd66b'
                              : index === 1
                                ? '#d6dce8'
                                : index === 2
                                  ? '#d99a70'
                                  : '#a99bd2',
                          }}
                        >
                          {index === 0
                            ? '🥇'
                            : index === 1
                              ? '🥈'
                              : index === 2
                                ? '🥉'
                                : `#${index + 1}`}
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <strong
                            style={{
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {player.player_name}
                          </strong>

                          <span
                            style={{
                              display: 'block',
                              fontSize: '12px',
                              opacity: 0.6,
                              marginTop: '4px',
                            }}
                          >
                            {player.player_server || 'Сервер не указан'}
                          </span>
                        </div>

                        <strong
                          style={{
                            color: '#b69aff',
                            whiteSpace: 'nowrap',
                            fontSize: '14px',
                          }}
                        >
                          {Number(player.coin_balance).toLocaleString('ru-RU')} CC
                        </strong>
                      </div>
                    ))}
                  </div>
                )}

                <p
                  style={{
                    textAlign: 'center',
                    opacity: 0.5,
                    fontSize: '12px',
                    marginTop: '18px',
                  }}
                >
                  Рейтинг формируется автоматически на основе баланса игроков.
                </p>
              </div>
            </section>

            {/* РАЗДЕЛЫ САЙТА */}
            <section className="features-section" id="features">
              <div className="section-heading">
                <span className="section-label">04 / ИНФРАСТРУКТУРА</span>

                <h2>
                  Всё необходимое. <span>В одном месте.</span>
                </h2>
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

            {/* ПРИГЛАШЕНИЕ В СЕМЬЮ */}
            <section className="join-section">
              <div className="join-card glass">
                <span className="section-label">
                  05 / ТВОЯ ИСТОРИЯ НАЧИНАЕТСЯ ЗДЕСЬ
                </span>

                <h2>
                  Стань частью <span>CORZA.</span>
                </h2>

                <p>
                  Твоя следующая глава начинается с одного решения.
                </p>

                <a className="primary-button" href="#join">
                  Подать заявку <span>↗</span>
                </a>
              </div>
            </section>
          </>
        )}

        {/* ЗАДАНИЯ */}
        {page === 'tasks' && <TasksPage />}

        {/* ВСТУПЛЕНИЕ */}
        {page === 'join' && (
          <JoinPage onOpenAuth={() => setAuthOpen(true)} />
        )}

        {/* ПОВЫШЕНИЕ */}
        {page === 'promotion' && (
          <PromotionPage onOpenAuth={() => setAuthOpen(true)} />
        )}

        {/* ГОСУДАРСТВЕННЫЕ СТРУКТУРЫ */}
        {page === 'government' && (
          <section className="standalone-page glass">
            <span className="section-label">CORZA / GOVERNMENT</span>

            <h1>
              Государственные <span>структуры.</span>
            </h1>

            <p>
              Здесь будет размещена информация о руководстве LSPD, LSCSD,
              FIB и GOV на серверах Majestic RP.
            </p>

            <p className="page-note">
              Состав организаций и занимаемые CORZA руководящие должности
              добавим отдельным этапом.
            </p>

            <a className="secondary-button" href="#home">
              На главную
            </a>
          </section>
        )}

        {/* ПЕРЕВОДЫ */}
        {page === 'transfers' && (
          <section className="standalone-page glass">
            <span className="section-label">CORZA / TRANSFERS</span>

            <h1>
              Заявления на <span>перевод.</span>
            </h1>

            <p>
              Раздел для переводов из другой фракции в организацию CORZA
              и из CORZA в другую фракцию будет добавлен следующим этапом.
            </p>

            <p className="page-note">
              Пока отправка заявлений на перевод не подключена к базе данных.
            </p>

            <a className="secondary-button" href="#home">
              На главную
            </a>
          </section>
        )}

        {/* АДМИН-ПАНЕЛЬ — ТОЛЬКО ДЛЯ АДМИНИСТРАТОРОВ */}
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
