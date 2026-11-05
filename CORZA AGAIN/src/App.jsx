
import { useEffect, useState } from 'react'
import './App.css'
import AuthModal from './AuthModal'
import AdminPanel from './AdminPanel'
import JoinPage from './JoinPage'
import PromotionPage from './PromotionPage'
import { supabase } from './supabase'

const leaders = [
  {
    role: 'Глава семьи',
    name: 'Atlantica',
    description: 'Главное руководство CORZA',
    initials: 'A',
    avatar: '/leaders/atlantica.png',
  },
  {
    role: 'Глава семьи',
    name: 'Entro',
    description: 'Главное руководство CORZA',
    initials: 'E',
    avatar: '/leaders/entro.png',
  },
  {
    role: 'Заместитель главы',
    name: 'Senya',
    description: 'Контроль состава и развития',
    initials: 'S',
    avatar: '/leaders/senya.png',
  },
  {
    role: 'Заместитель главы',
    name: 'Yoshi',
    description: 'Контроль состава и развития',
    initials: 'Y',
    avatar: '/leaders/yoshi.png',
  },
  {
    role: 'Заместитель главы',
    name: 'Artemka',
    description: 'Контроль состава и развития',
    initials: 'A',
    avatar: '/leaders/artemka.png',
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
]

const separatePages = [
  'join',
  'promotion',
  'government',
  'transfers',
  'admin',
]

function getPageFromHash() {
  const hash = window.location.hash.replace('#', '')
  return separatePages.includes(hash) ? hash : 'home'
}

function App() {
  const [authOpen, setAuthOpen] = useState(false)
  const [page, setPage] = useState(getPageFromHash)

  // Данные авторизованного пользователя
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)

  // Проверяем авторизацию
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

  // Загружаем профиль пользователя из Supabase
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

  // Навигация по страницам
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

  function goHome() {
    window.location.hash = 'home'
  }

  // Имя для отображения в шапке
  const accountName =
    profile?.game_nickname ||
    user?.user_metadata?.game_nickname ||
    user?.user_metadata?.nickname ||
    'Мой аккаунт'

  const accountInitial = accountName.charAt(0).toUpperCase()

  return (
    <div className="app">
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
      />

      <div className="stars stars-one" />
      <div className="stars stars-two" />

      <header className="navbar glass">
        <a className="logo" href="#home">
          <span className="logo-symbol">C</span>
          <span>CORZA</span>
        </a>

        <nav>
          <a href="#home">Главная</a>
          <a href="#about">О семье</a>
          <a href="#leaders">Руководство</a>
          <a href="#join">Вступление</a>
          <a href="#promotion">Повышение</a>
          <a href="#government">Структуры</a>
        </nav>

        {/* Если пользователь авторизован — показываем аккаунт */}
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

            <section className="leaders-section" id="leaders">
              <div className="section-top">
                <div>
                  <span className="section-label">02 / УПРАВЛЕНИЕ</span>
                  <h2>
                    Наше <span>руководство.</span>
                  </h2>
                </div>
                <p>Люди, отвечающие за развитие и стабильность CORZA.</p>
              </div>

              <div className="leaders-grid">
                {leaders.map((leader, index) => (
                  <article className="leader-card glass" key={index}>
                    <div className="leader-avatar">
                      <img
                        src={leader.avatar}
                        alt={leader.name}
                      />
                    </div>
                    <span className="leader-role">{leader.role}</span>
                    <h3>{leader.name}</h3>
                    <p>{leader.description}</p>
                    <div className="leader-line" />
                  </article>
                ))}
              </div>
            </section>

            <section className="features-section" id="features">
              <div className="section-heading">
                <span className="section-label">03 / ИНФРАСТРУКТУРА</span>
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

            <section className="join-section">
              <div className="join-card glass">
                <span className="section-label">
                  04 / ТВОЯ ИСТОРИЯ НАЧИНАЕТСЯ ЗДЕСЬ
                </span>
                <h2>
                  Стань частью <span>CORZA.</span>
                </h2>
                <p>Твоя следующая глава начинается с одного решения.</p>
                <a className="primary-button" href="#join">
                  Подать заявку <span>↗</span>
                </a>
              </div>
            </section>
          </>
        )}

        {page === 'join' && (
          <JoinPage onOpenAuth={() => setAuthOpen(true)} />
        )}

        {page === 'promotion' && (
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
            <a className="secondary-button" href="#home">
              На главную
            </a>
          </section>
        )}

        {page === 'transfers' && (
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
            <a className="secondary-button" href="#home">
              На главную
            </a>
          </section>
        )}

        {page === 'admin' && <AdminPanel />}

        {page === 'home' && window.location.hash === '#not-found' && (
          <section className="standalone-page glass">
            <h1>Страница не найдена</h1>
            <button className="primary-button" onClick={goHome}>
              Вернуться на главную
            </button>
          </section>
        )}
      </main>

      <footer>
        <a className="logo" href="#home">
          <span className="logo-symbol">C</span>
          <span>CORZA</span>
        </a>

        <p>© 2026 CORZA FAMILY. ALL RIGHTS RESERVED.</p>
        <span>MAJESTIC ROLEPLAY</span>
        <a href="#admin">Администрирование</a>
      </footer>
    </div>
  )
}

export default App
