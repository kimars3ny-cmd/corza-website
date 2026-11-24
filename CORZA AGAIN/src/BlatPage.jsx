
import { useState } from 'react'
import { supabase } from './supabase'

export default function BlatPage({ onBack }) {
  const [nickname, setNickname] = useState('')
  const [staticId, setStaticId] = useState('')
  const [telegramChecked, setTelegramChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function submitApplication(e) {
    e.preventDefault()
    setMessage('')

    if (!nickname.trim() || !staticId.trim()) {
      setMessage('Заполни все поля')
      return
    }

    if (!telegramChecked) {
      setMessage('Сначала подтверди подписку на Telegram')
      return
    }

    setLoading(true)

    const { error } = await supabase
      .from('blat_applications')
      .insert({
        game_nickname: nickname.trim(),
        static: staticId.trim(),
        user_id: null,
        subscription_verified: false
      })

    setLoading(false)

    if (error) {
      console.error(error)
      setMessage('Не удалось отправить заявку. Попробуй позже.')
      return
    }

    setMessage('Заявка успешно отправлена!')
    setNickname('')
    setStaticId('')
    setTelegramChecked(false)
  }

  return (
    <main className="blat-page">
      <button className="blat-back" onClick={onBack}>
        ← Назад
      </button>

      <section className="blat-card">
        <div className="blat-icon">✦</div>

        <span className="blat-label">CORZA FAMILY</span>

        <h1>День блата</h1>

        <p className="blat-description">
          Заполни форму, чтобы подать заявку на участие
          в Дне блата.
        </p>

        <form onSubmit={submitApplication}>
          <label>Игровой ник</label>
          <input
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            placeholder="Например, Nick_Name"
            maxLength={50}
          />

          <label>Статик</label>
          <input
            value={staticId}
            onChange={e => setStaticId(e.target.value)}
            placeholder="Введи свой статик"
            maxLength={30}
          />

          <div className="blat-telegram">
            <span>Подписка на Telegram</span>

            <a
              href="https://t.me/senyacorza"
              target="_blank"
              rel="noreferrer"
            >
              Перейти на канал @senyacorza ↗
            </a>

            <label className="blat-checkbox">
              <input
                type="checkbox"
                checked={telegramChecked}
                onChange={e => setTelegramChecked(e.target.checked)}
              />
              Я подписан на канал
            </label>
          </div>

          <button
            className="blat-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Отправка...' : 'Отправить заявку'}
          </button>

          {message && (
            <p className="blat-message">{message}</p>
          )}
        </form>
      </section>
    </main>
  )
}
