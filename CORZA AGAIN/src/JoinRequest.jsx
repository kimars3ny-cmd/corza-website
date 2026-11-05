
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

function JoinRequest({ user, profile }) {
  const [nickname, setNickname] = useState(profile?.game_nickname || '')
  const [server, setServer] = useState(profile?.server || '')
  const [characterAge, setCharacterAge] = useState('')
  const [experience, setExperience] = useState('')
  const [reason, setReason] = useState('')

  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Загружаем историю заявок пользователя
  async function loadRequests() {
    if (!user?.id) return

    const { data, error } = await supabase
      .from('join_requests')
      .select('id, game_nickname, server, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      setMessage('Не удалось загрузить заявки: ' + error.message)
      return
    }

    setRequests(data || [])
  }

  useEffect(() => {
    setNickname(profile?.game_nickname || '')
    setServer(profile?.server || '')
  }, [profile])

  useEffect(() => {
    loadRequests()
  }, [user?.id])

  // Отправляем заявку
  async function handleSubmit(event) {
    event.preventDefault()

    if (!user?.id) {
      setMessage('Сначала войди в аккаунт.')
      return
    }

    setLoading(true)
    setMessage('')

    const { error } = await supabase
      .from('join_requests')
      .insert({
        user_id: user.id,
        game_nickname: nickname.trim(),
        server: server.trim(),
        character_age: characterAge.trim(),
        experience: experience.trim(),
        reason: reason.trim(),
        status: 'pending',
      })

    if (error) {
      setMessage('Ошибка отправки заявки: ' + error.message)
    } else {
      setMessage('Заявка успешно отправлена руководству CORZA!')

      setCharacterAge('')
      setExperience('')
      setReason('')

      await loadRequests()
    }

    setLoading(false)
  }

  return (
    <section className="join-request-section">
      <div className="join-request-heading">
        <span className="section-label">CORZA / RECRUITMENT</span>
        <h3>Вступление в <span>CORZA.</span></h3>
        <p>
          Заполни анкету. Руководство рассмотрит твою заявку
          и примет решение.
        </p>
      </div>

      <form className="join-request-form" onSubmit={handleSubmit}>
        <label>Игровой никнейм</label>
        <input
          type="text"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          placeholder="Например, Ivan_Corza"
          required
          minLength={2}
        />

        <label>Сервер Majestic RP</label>
        <input
          type="text"
          value={server}
          onChange={(event) => setServer(event.target.value)}
          placeholder="Например, Memphis"
          required
        />

        <label>Возраст персонажа</label>
        <input
          type="text"
          value={characterAge}
          onChange={(event) => setCharacterAge(event.target.value)}
          placeholder="Например, 25 лет"
          required
        />

        <label>Опыт игры на Majestic RP</label>
        <textarea
          value={experience}
          onChange={(event) => setExperience(event.target.value)}
          placeholder="Расскажи о своём опыте, организациях и достижениях..."
          rows={4}
          required
        />

        <label>Почему ты хочешь вступить в CORZA?</label>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Расскажи о себе и объясни, почему мы должны принять тебя..."
          rows={4}
          required
        />

        <button
          className="join-request-submit"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Отправка...' : 'Отправить заявку'}
        </button>
      </form>

      {message && (
        <div className="auth-message">{message}</div>
      )}

      <div className="join-request-history">
        <h3>Мои заявки</h3>

        {requests.length === 0 ? (
          <p>Ты ещё не отправлял заявки.</p>
        ) : (
          requests.map((request) => (
            <article className="join-request-item" key={request.id}>
              <strong>{request.game_nickname}</strong>
              <span>Сервер: {request.server}</span>
              <span>
                Статус: {request.status === 'pending'
                  ? 'На рассмотрении'
                  : request.status === 'approved'
                    ? 'Одобрена'
                    : request.status === 'rejected'
                      ? 'Отклонена'
                      : request.status}
              </span>
              <small>
                {new Date(request.created_at).toLocaleDateString('ru-RU')}
              </small>
            </article>
          ))
        )}
      </div>
    </section>
  )
}

export default JoinRequest
