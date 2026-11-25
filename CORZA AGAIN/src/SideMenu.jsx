
import { useEffect, useState } from 'react'
import './SideMenu.css'

function SideMenu({ user, isAdmin, blatEnabled }) {
  const [isOpen, setIsOpen] = useState(false)

  function closeMenu() {
    setIsOpen(false)
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') closeMenu()
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const menuItems = [
    { title: 'Главная', description: 'Главная страница CORZA', link: '#home', icon: '⌂', visible: true },
    { title: 'О семье', description: 'Информация о CORZA', link: '#about', icon: '✦', visible: true },
    { title: 'Руководство', description: 'Состав руководства семьи', link: '#leaders', icon: '♛', visible: true },
    { title: 'Рейтинг CC', description: 'Топ участников', link: '#coins', icon: '◈', visible: true },
    { title: 'Задания', description: 'Задания и награды', link: '#tasks', icon: '✓', visible: Boolean(user) },
    { title: 'Вступление', description: 'Заявка в семью', link: '#join', icon: '＋', visible: Boolean(user) },
    { title: 'Повышение', description: 'Заявка на повышение', link: '#promotion', icon: '↑', visible: Boolean(user) },
    { title: 'Государственные структуры', description: 'Информация об организациях', link: '#government', icon: '⌘', visible: true },
    { title: 'Переводы', description: 'Заявления на перевод', link: '#transfers', icon: '⇄', visible: true },
    { title: 'День блата', description: 'Подача заявления', link: '#blat', icon: '✧', visible: blatEnabled === true },
  ]

  return (
    <>
      <button
        type="button"
        className={`side-menu-toggle ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen((previous) => !previous)}
        aria-label="Открыть или закрыть меню"
        aria-expanded={isOpen}
      >
        {isOpen ? '×' : '☰'}
      </button>

      {isOpen && (
        <div
          className="side-menu-overlay"
          onClick={closeMenu}
        />
      )}

      <aside className={`side-menu-panel ${isOpen ? 'open' : ''}`}>
        <div className="side-menu-header">
          <div className="side-menu-brand">
            <div className="side-menu-logo">C</div>
            <div>
              <strong>CORZA</strong>
              <span>FAMILY PORTAL</span>
            </div>
          </div>

          <button
            type="button"
            className="side-menu-close"
            onClick={closeMenu}
          >
            ×
          </button>
        </div>

        <div className="side-menu-user">
          <div className="side-menu-user-icon">
            {user ? '◉' : '◇'}
          </div>
          <div>
            <strong>{user ? 'Ты в системе CORZA' : 'Гость CORZA'}</strong>
            <span>{user ? 'Авторизованный участник' : 'Гостевой доступ'}</span>
          </div>
        </div>

        <div className="side-menu-section-label">
          НАВИГАЦИЯ
        </div>

        <nav className="side-menu-links">
          {menuItems.filter((item) => item.visible).map((item) => (
            <a
              key={item.link}
              href={item.link}
              className="side-menu-link"
              onClick={closeMenu}
            >
              <span className="side-menu-link-icon">{item.icon}</span>

              <span className="side-menu-link-text">
                <strong>{item.title}</strong>
                <small>{item.description}</small>
              </span>

              <span className="side-menu-link-arrow">↗</span>
            </a>
          ))}
        </nav>

        {isAdmin && (
          <div className="side-menu-admin">
            <div className="side-menu-section-label">
              УПРАВЛЕНИЕ
            </div>

            <a
              href="#admin"
              className="side-menu-admin-link"
              onClick={closeMenu}
            >
              <span>⚙</span>
              <div>
                <strong>Администрирование</strong>
                <small>Панель управления CORZA</small>
              </div>
              <span>↗</span>
            </a>
          </div>
        )}

        <div className="side-menu-footer">
          <span className="side-menu-footer-line" />
          <span>BEYOND THE LIMITS.</span>
          <small>© 2026 CORZA FAMILY</small>
        </div>
      </aside>
    </>
  )
}

export default SideMenu
