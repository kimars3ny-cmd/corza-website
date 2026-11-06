
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

function AdminPanel() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [checking, setChecking] = useState(true)

  const [profiles, setProfiles] = useState([])
  const [requests, setRequests] = useState([])
  const [joinRequests, setJoinRequests] = useState([])
  const [wallets, setWallets] = useState([])

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Форма управления Corza Coin
  const [coinUserId, setCoinUserId] = useState('')
  const [coinAmount, setCoinAmount] = useState('')
  const [coinDescription, setCoinDescription] = useState('')

  // Проверяем права администратора
  useEffect(() => {
    let active = true

    async function checkAdmin(sessionUser) {
      if (!sessionUser) {
        if (active) {
          setUser(null)
          setIsAdmin(false)
          setChecking(false)
        }
        return
      }

      setUser(sessionUser)

      const { data, error } = await supabase
        .from('site_admins')
        .select('user_id')
        .eq('user_id', sessionUser.id)
        .maybeSingle()

      if (!active) return

      setIsAdmin(!error && !!data)
      setChecking(false)
    }

    supabase.auth.getSession().then(({ data }) => {
      checkAdmin(data.session?.user ?? null)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        checkAdmin(session?.user ?? null)
      }
    )

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  // Загружаем данные панели
  async function loadAdminData() {
    setLoading(true)
    setMessage('')

    const [
      profilesResult,
      requestsResult,
      joinResult,
      walletsResult
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, game_nickname, server, rank, position, joined_at')
        .order('created_at', { ascending: false }),

      supabase
        .from('promotion_requests')
        .select('*')
        .order('created_at', { ascending: false }),

      supabase
        .from('join_requests')
        .select('*')
        .order('created_at', { ascending: false }),

      supabase
        .from('corza_wallets')
        .select('user_id, balance')
    ])

    const errors = []

    if (profilesResult.error) {
      errors.push('Участники: ' + profilesResult.error.message)
    } else {
      setProfiles(profilesResult.data || [])
    }

    if (requestsResult.error) {
      errors.push('Повышения: ' + requestsResult.error.message)
    } else {
      setRequests(requestsResult.data || [])
    }

    if (joinResult.error) {
      errors.push('Вступление: ' + joinResult.error.message)
    } else {
      setJoinRequests(joinResult.data || [])
    }

    if (walletsResult.error) {
      errors.push('Кошельки CC: ' + walletsResult.error.message)
    } else {
      setWallets(walletsResult.data || [])
    }

    if (errors.length) {
      setMessage('Ошибки загрузки: ' + errors.join(' | '))
    }

    setLoading(false)
  }

  useEffect(() => {
    if (isAdmin) {
      loadAdminData()
    }
  }, [isAdmin])

  // Начисление и списание Corza Coin
  async function adjustCoins(event) {
    event.preventDefault()

    if (!coinUserId) {
      setMessage('Выбери игрока.')
      return
    }

    const amount = Number(coinAmount)

    if (!Number.isSafeInteger(amount) || amount === 0) {
      setMessage('Укажи целое число CC, отличное от нуля.')
      return
    }

    if (!coinDescription.trim()) {
      setMessage('Укажи причину операции.')
      return
    }

    setLoading(true)
    setMessage('Выполняем операцию...')

    const { data, error } = await supabase.rpc(
      'admin_adjust_corza_coins',
      {
        p_user_id: coinUserId,
        p_amount: amount,
        p_description: coinDescription.trim()
      }
    )

    if (error) {
      setMessage('Ошибка операции: ' + error.message)
      setLoading(false)
      return
    }

    setCoinAmount('')
    setCoinDescription('')

    await loadAdminData()

    setMessage(
      `${amount > 0 ? 'Начислено' : 'Списано'} ${Math.abs(amount)} CC. Новый баланс: ${data} CC.`
    )
  }

  // Рассматриваем заявку на повышение
  async function reviewRequest(requestId, status) {
    setLoading(true)
    setMessage('')

    const { error } = await supabase
      .from('promotion_requests')
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id
      })
      .eq('id', requestId)

    if (error) {
      setMessage('Ошибка обработки повышения: ' + error.message)
      setLoading(false)
      return
    }

    setMessage(
      status === 'approved'
        ? 'Заявка на повышение одобрена.'
        : 'Заявка на повышение отклонена.'
    )

    await loadAdminData()
  }

  // Рассматриваем заявку на вступление
  async function reviewJoinRequest(requestId, status) {
    setLoading(true)
    setMessage('')

    const { error } = await supabase
      .from('join_requests')
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id
      })
      .eq('id', requestId)

    if (error) {
      setMessage('Ошибка обработки заявки на вступление: ' + error.message)
      setLoading(false)
      return
    }

    setMessage(
      status === 'approved'
        ? 'Заявка на вступление одобрена!'
        : 'Заявка на вступление отклонена.'
    )

    await loadAdminData()
  }

  if (checking) return null
  if (!isAdmin) return null

  const pendingPromotions = requests.filter((item) =>
    ['pending', 'На рассмотрении'].includes(item.status)
  )

  const pendingJoins = joinRequests.filter((item) =>
    ['pending', 'На рассмотрении'].includes(item.status)
  )

  return (
    <section className="admin-section" id="admin">
      <div className="admin-heading">
        <div>
          <span className="section-label">05 / CONTROL CENTER</span>
          <h2>Панель <span>руководства.</span></h2>
          <p>
            Управление составом и заявками государственной семьи CORZA.
          </p>
        </div>

        <button
          className="admin-refresh"
          type="button"
          onClick={loadAdminData}
          disabled={loading}
        >
          {loading ? 'Обновление...' : 'Обновить данные'}
        </button>
      </div>

      {message && (
        <div className="admin-message">{message}</div>
      )}

      <div className="admin-stats">
        <div className="admin-stat glass">
          <span>Участников</span>
          <strong>{profiles.length}</strong>
        </div>

        <div className="admin-stat glass">
          <span>Всего заявок</span>
          <strong>{requests.length + joinRequests.length}</strong>
        </div>

        <div className="admin-stat glass">
          <span>На рассмотрении</span>
          <strong>
            {pendingPromotions.length + pendingJoins.length}
          </strong>
        </div>
      </div>

      {/* Управление Corza Coin */}
      <div className="admin-block glass">
        <h3>Управление Corza Coin</h3>

        <p>
          Начисление и списание внутренней валюты CORZA.
        </p>

        <form
          onSubmit={adjustCoins}
          style={{
            display: 'grid',
            gap: '14px',
            maxWidth: '520px',
            marginTop: '20px'
          }}
        >
          <label>
            <span>Выбери игрока</span>

            <select
              value={coinUserId}
              onChange={(event) => setCoinUserId(event.target.value)}
              required
              disabled={loading}
              style={{
                display: 'block',
                width: '100%',
                padding: '12px',
                marginTop: '8px',
                borderRadius: '10px'
              }}
            >
              <option value="">Выбрать участника...</option>

              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.game_nickname || 'Без никнейма'}
                  {' — '}
                  {profile.server || 'Сервер не указан'}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Количество CC</span>

            <input
              type="number"
              step="1"
              value={coinAmount}
              onChange={(event) => setCoinAmount(event.target.value)}
              placeholder="Например: 500 или -200"
              required
              disabled={loading}
              style={{
                display: 'block',
                width: '100%',
                padding: '12px',
                marginTop: '8px',
                borderRadius: '10px'
              }}
            />
          </label>

          <p style={{ opacity: 0.75, fontSize: '13px' }}>
            Положительное число — начисление. Отрицательное число — списание.
          </p>

          <label>
            <span>Причина операции</span>

            <input
              type="text"
              value={coinDescription}
              onChange={(event) => setCoinDescription(event.target.value)}
              placeholder="Например: награда за активность"
              required
              disabled={loading}
              style={{
                display: 'block',
                width: '100%',
                padding: '12px',
                marginTop: '8px',
                borderRadius: '10px'
              }}
            />
          </label>

          <button
            type="submit"
            disabled={loading || profiles.length === 0}
          >
            {loading ? 'Выполняется...' : 'Выполнить операцию'}
          </button>
        </form>

        <div style={{ marginTop: '28px' }}>
          <h3>Кошельки игроков</h3>

          {profiles.length === 0 ? (
            <p className="admin-empty">Участники не найдены.</p>
          ) : (
            <div className="admin-list">
              {profiles.map((profile) => {
                const wallet = wallets.find(
                  (item) => item.user_id === profile.id
                )

                return (
                  <article className="admin-member" key={profile.id}>
                    <div>
                      <strong>
                        {profile.game_nickname || 'Без никнейма'}
                      </strong>

                      <span>
                        {profile.server || 'Сервер не указан'}
                      </span>
                    </div>

                    <div className="admin-member-rank">
                      <strong>
                        {Number(wallet?.balance ?? 0).toLocaleString('ru-RU')} CC
                      </strong>
                      <span>Баланс</span>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Заявки на вступление */}
      <div className="admin-block glass">
        <h3>Заявки на вступление в CORZA</h3>

        {joinRequests.length === 0 ? (
          <p className="admin-empty">
            Заявок на вступление пока нет.
          </p>
        ) : (
          <div className="admin-list">
            {joinRequests.map((request) => {
              const pending = ['pending', 'На рассмотрении'].includes(
                request.status
              )

              return (
                <article className="admin-request" key={request.id}>
                  <div className="admin-request-info">
                    <strong>
                      {request.game_nickname || 'Без никнейма'}
                    </strong>

                    <span>
                      Сервер: {request.server || 'Не указан'}
                    </span>

                    <span>
                      Возраст персонажа: {request.character_age || 'Не указан'}
                    </span>

                    <p>
                      Опыт: {request.expirience || 'Не указан'}
                    </p>

                    <p>
                      Причина вступления: {request.reason || 'Не указана'}
                    </p>

                    <small>
                      Статус: {request.status || 'На рассмотрении'}
                    </small>

                    {pending && (
                      <div className="admin-actions">
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() =>
                            reviewJoinRequest(request.id, 'approved')
                          }
                        >
                          Одобрить
                        </button>

                        <button
                          type="button"
                          disabled={loading}
                          onClick={() =>
                            reviewJoinRequest(request.id, 'rejected')
                          }
                        >
                          Отклонить
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      {/* Заявки на повышение */}
      <div className="admin-block glass">
        <h3>Заявки на повышение</h3>

        {requests.length === 0 ? (
          <p className="admin-empty">Заявок пока нет.</p>
        ) : (
          <div className="admin-list">
            {requests.map((request) => {
              const member = profiles.find(
                (profile) => profile.id === request.user_id
              )

              const pending = ['pending', 'На рассмотрении'].includes(
                request.status
              )

              return (
                <article className="admin-request" key={request.id}>
                  <div className="admin-request-info">
                    <strong>
                      {member?.game_nickname || 'Неизвестный участник'}
                    </strong>

                    <span>
                      {request.current_rank || 'Ранг не указан'}
                      {' → '}
                      {request.desired_rank || 'Не указан'}
                    </span>

                    <p>{request.reason || 'Причина не указана.'}</p>

                    <small>
                      Статус: {request.status || 'На рассмотрении'}
                    </small>

                    {pending && (
                      <div className="admin-actions">
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() =>
                            reviewRequest(request.id, 'approved')
                          }
                        >
                          Одобрить
                        </button>

                        <button
                          type="button"
                          disabled={loading}
                          onClick={() =>
                            reviewRequest(request.id, 'rejected')
                          }
                        >
                          Отклонить
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      {/* Список участников */}
      <div className="admin-block glass">
        <h3>Участники CORZA</h3>

        {profiles.length === 0 ? (
          <p className="admin-empty">Участники не найдены.</p>
        ) : (
          <div className="admin-list">
            {profiles.map((profile) => (
              <article className="admin-member" key={profile.id}>
                <div>
                  <strong>
                    {profile.game_nickname || 'Без никнейма'}
                  </strong>

                  <span>
                    {profile.server || 'Сервер не указан'}
                  </span>
                </div>

                <div className="admin-member-rank">
                  <strong>{profile.rank || 'Новичок'}</strong>
                  <span>{profile.position || 'Участник'}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default AdminPanel
