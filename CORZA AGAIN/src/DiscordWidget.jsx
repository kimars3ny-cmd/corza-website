
import './DiscordWidget.css'

function DiscordWidget() {
  return (
    <div className="discord-widget">
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
  )
}

export default DiscordWidget
