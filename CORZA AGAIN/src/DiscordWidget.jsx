
import { useState } from 'react'
import './DiscordWidget.css'

function DiscordWidget() {
  const [isHidden, setIsHidden] = useState(false)

  return (
    <div className={`discord-widget ${isHidden ? 'discord-widget-hidden' : ''}`}>
      <button
        className="discord-widget-toggle"
        onClick={() => setIsHidden(!isHidden)}
        aria-label={isHidden ? 'Показать Discord' : 'Скрыть Discord'}
        title={isHidden ? 'Показать Discord' : 'Скрыть Discord'}
      >
        {isHidden ? '❮' : '❯'}
      </button>

      <div className="discord-widget-content">
        <div className="discord-widget-info">
          <div className="discord-widget-icon">🎮</div>

          <div>
            <div className="discord-widget-title">CORZA</div>
            <div className="discord-widget-subtitle">
              Наше сообщество в Discord
            </div>
          </div>

          <div className="discord-widget-status">
            <span></span>
            Discord
          </div>
        </div>

        <a
          className="discord-widget-button"
          href="https://discord.gg/zSzk8xubRX"
          target="_blank"
          rel="noopener noreferrer"
        >
          Присоединиться к Discord
        </a>
      </div>
    </div>
  )
}

export default DiscordWidget
