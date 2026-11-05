import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export default function PromotionPage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)

  const [desiredRank, setDesiredRank] = useState('')
  const [reason, setReason] = useState('')

  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true

    async function loadProfile() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!active) return

      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single()

        if (!active) return

        if (error) {
          console.error('Ошибка загрузки профиля:', error)
        } else {
          setProfile(data)
        }
      }

      if (active) setLoading(false)
    }

    loadProfile()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (!currentUser) {
        setProfile(null)
        setLoading(false)
      } else {
        loadProfile()
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')

    if (!user || !profile) {
      setMessage('Не удалось загрузить профиль. Попробуйте войти заново.')
      return
    }

    if (!desiredRank.trim() || !reason.trim()) {
      setMessage('Заполните все поля.')
      return
    }

    setSending(true)

    const { error } = await supabase
      .from('promotion_requests')
      .insert({
        user_id: user.id,
        current_rank: profile.rank ?? 'Не указан',
        desired_rank: desiredRank.trim(),
        reason: reason.trim(),
        status: 'pending',
      })

    setSending(false)

    if (error) {
      console.error('Ошибка отправки заявки:', error)
      setMessage('Ошибка отправки заявки: ' + error.message)
      return
    }

    setMessage('Заявка успешно отправлена!')
    setDesiredRank('')
    setReason('')
  }

  if (loading) {
    return (
      <main className="standalone-page">
        <div className="page-panel">
          <p>Загрузка профиля...</p>
        </div>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="standalone-page">
        <div className="page-heading">
          <h1>Повышение ранга</h1>
          <p>Подача заявления на повышение в семье CORZA</p>
        </div>

        <div className="page-panel">
          <h2>Необходима авторизация</h2>
          <p>Чтобы подать заявление, войдите в свой аккаунт.</p>
          <a href="#home" className="btn-primary">
            Вернуться на главную
          </a>
        </div>
      </main>
    )
  }

  if (!profile) {
    return (
      <main className="standalone-page">
        <div className="page-panel">
          <h2>Профиль не найден</h2>
          <p>Не удалось загрузить ваши данные. Попробуйте перезагрузить страницу.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="standalone-page">
      <div className="page-heading">
        <h1>Повышение ранга</h1>
        <p>Подайте заявление на повышение в семье CORZA</p>
      </div>

      <div className="page-panel">
        <div className="promotion-profile">
          <h2>Ваш профиль</h2>

          <p>
            <strong>Игровой ник:</strong>{' '}
            {profile.game_nickname || 'Не указан'}
          </p>

          <p>
            <strong>Сервер:</strong>{' '}
            {profile.server || 'Не указан'}
          </p>

          <p>
            <strong>Текущий ранг:</strong>{' '}
            {profile.rank || 'Не указан'}
          </p>
        </div>

        <form className="standalone-form" onSubmit={handleSubmit}>
          <label htmlFor="desiredRank">Желаемый ранг</label>
          <input
            id="desiredRank"
            type="text"
            placeholder="Например: Заместитель"
            value={desiredRank}
            onChange={(event) => setDesiredRank(event.target.value)}
            required
          />

          <label htmlFor="promotionReason">Причина повышения</label>
          <textarea
            id="promotionReason"
            placeholder="Расскажите о своей активности, заслугах и причинах повышения..."
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={5}
            required
          />

          <button type="submit" disabled={sending}>
            {sending ? 'Отправка...' : 'Отправить заявление'}
          </button>

          {message && <p className="page-note">{message}</p>}
        </form>
      </div>
    </main>
  )
}