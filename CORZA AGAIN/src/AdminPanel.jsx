
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

function AdminPanel() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLevelOne, setIsLevelOne] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [checking, setChecking] = useState(true)

  const [profiles, setProfiles] = useState([])
  const [requests, setRequests] = useState([])
  const [joinRequests, setJoinRequests] = useState([])
  const [wallets, setWallets] = useState([])
  const [admins, setAdmins] = useState([])
  const [tasks, setTasks] = useState([])

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const [coinUserId, setCoinUserId] = useState('')
  const [coinAmount, setCoinAmount] = useState('')
  const [coinDescription, setCoinDescription] = useState('')

  const [selectedAdminUserId, setSelectedAdminUserId] = useState('')

  // Создание заданий
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskReward, setTaskReward] = useState('100')
  const [taskActive, setTaskActive] = useState(true)

  // Проверка прав пользователя
  useEffect(() => {
    let active = true

    async function checkAdmin(sessionUser) {
      if (!sessionUser) {
        if (active) {
          setUser(null)
          setIsAdmin(false)
          setIsLevelOne(false)
          setIsOwner(false)
          setChecking(false)
        }
        return
      }

      setUser(sessionUser)
      setChecking(true)

      const [adminResult, levelOneResult, ownerResult] =
        await Promise.all([
          supabase.rpc('is_corza_admin'),
          supabase.rpc('is_corza_admin_level_one'),
          supabase.rpc('is_corza_owner')
        ])

      if (!active) return

      const admin = !adminResult.error && adminResult.data === true
      const levelOne =
        !levelOneResult.error && levelOneResult.data === true
      const owner =
        !ownerResult.error && ownerResult.data === true

      setIsAdmin(admin)
      setIsLevelOne(admin && levelOne)
      setIsOwner(admin && owner)
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

  // Загрузка данных панели
  async function loadAdminData() {
    setLoading(true)
    setMessage('')

    const [
      profilesResult,
      requestsResult,
      joinResult,
      walletsResult,
      adminsResult,
      tasksResult
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

      isLevelOne
        ? supabase
            .from('corza_wallets')
            .select('user_id, balance')
        : Promise.resolve({ data: [], error: null }),

      isLevelOne
        ? supabase.rpc('get_corza_admins')
        : Promise.resolve({ data: [], error: null }),

      isOwner
        ? supabase
            .from('corza_tasks')
            .select('*')
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null })
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

    if (isLevelOne) {
      if (walletsResult.error) {
        errors.push('Кошельки CC: ' + walletsResult.error.message)
      } else {
        setWallets(walletsResult.data || [])
      }

      if (adminsResult.error) {
        errors.push('Администраторы: ' + adminsResult.error.message)
      } else {
        setAdmins(adminsResult.data || [])
      }
    }

    if (isOwner) {
      if (tasksResult.error) {
        errors.push('Задания: ' + tasksResult.error.message)
      } else {
        setTasks(tasksResult.data || [])
      }
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
  }, [isAdmin, isLevelOne, isOwner])

  // Создание задания для CORZA COIN
  async function createTask(event) {
    event.preventDefault()

    if (!isOwner) {
      setMessage('Создавать задания может только владелец сайта.')
      return
    }

    const title = taskTitle.trim()
    const description = taskDescription.trim()
    const reward = Number(taskReward)

    if (!title) {
      setMessage('Укажи название задания.')
      return
    }

    if (!description) {
      setMessage('Укажи описание задания.')
      return
    }

    if (!Number.isSafeInteger(reward) || reward <= 0) {
      setMessage('Награда должна быть целым числом больше нуля.')
      return
    }

    setLoading(true)
    setMessage('Создаём задание...')

    const { error } = await supabase
      .from('corza_tasks')
      .insert({
        title,
        description,
        reward,
        is_active: taskActive,
        created_by: user.id
      })

    if (error) {
      setMessage('Ошибка создания задания: ' + error.message)
      setLoading(false)
      return
    }

    setTaskTitle('')
    setTaskDescription('')
    setTaskReward('100')
    setTaskActive(true)

    await loadAdminData()

    setMessage('Задание успешно создано!')
  }

  // Начисление и списание CC
  async function adjustCoins(event) {
    event.preventDefault()

    if (!isLevelOne) {
      setMessage('Недостаточно прав.')
      return
    }

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

  // Назначение и снятие прав администратора
  async function manageAdmin(userId, adminLevel) {
    if (!isLevelOne) {
      setMessage('Недостаточно прав для управления администраторами.')
      return
    }

    if (!userId) {
      setMessage('Сначала выбери игрока.')
      return
    }

    const target = profiles.find((profile) => profile.id === userId)
    const targetAdmin = admins.find((admin) => admin.user_id === userId)
    const targetName = target?.game_nickname || 'Игрок'

    if (targetAdmin && Number(targetAdmin.admin_level) === 0) {
      setMessage('Нельзя изменять права владельца.')
      return
    }

    if (!isOwner && adminLevel === 1) {
      setMessage('Назначать администраторов 1 уровня может только владелец.')
      return
    }

    if (
      !isOwner &&
      adminLevel === -1 &&
      Number(targetAdmin?.admin_level) !== 2
    ) {
      setMessage('Ты можешь снимать права только у младших администраторов.')
      return
    }

    let action = ''

    if (adminLevel === 1) {
      action = `назначить ${targetName} администратором 1 уровня?`
    } else if (adminLevel === 2) {
      action = `назначить ${targetName} младшим администратором?`
    } else {
      action = `снять права администратора у ${targetName}?`
    }

    if (!window.confirm(`Ты уверен, что хочешь ${action}`)) {
      return
    }

    setLoading(true)
    setMessage('Изменяем права администратора...')

    const { error } = await supabase.rpc(
      'manage_corza_admin',
      {
        p_target_user_id: userId,
        p_admin_level: adminLevel
      }
    )

    if (error) {
      setMessage('Ошибка управления администраторами: ' + error.message)
      setLoading(false)
      return
    }

    setSelectedAdminUserId('')
    await loadAdminData()

    setMessage(
      adminLevel === -1
        ? `Права администратора у ${targetName} сняты.`
        : `${targetName} получил новые права администратора.`
    )
  }

  // Обработка заявки на повышение
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

    await loadAdminData()

    setMessage(
      status === 'approved'
        ? 'Заявка на повышение одобрена.'
        : 'Заявка на повышение отклонена.'
    )
  }

  // Обработка заявки на вступление
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

    await loadAdminData()

    setMessage(
      status === 'approved'
        ? 'Заявка на вступление одобрена!'
        : 'Заявка на вступление отклонена.'
    )
  }

  if (checking) return null
  if (!isAdmin) return null

  const pendingPromotions = requests.filter((item) =>
    ['pending', 'На рассмотрении'].includes(item.status)
  )

  const pendingJoins = joinRequests.filter((item) =>
    ['pending', 'На рассмотрении'].includes(item.status)
  )

  const availablePlayers = profiles.filter(
    (profile) => !admins.some((admin) => admin.user_id === profile.id)
  )

  function getAdminRole(level) {
    switch (Number(level)) {
      case 0:
        return 'Владелец'
      case 1:
        return 'Администратор 1 уровня'
      case 2:
        return 'Младший администратор'
      default:
        return 'Неизвестная роль'
    }
  }

  return (
    <section className="admin-section" id="admin">
      <div className="admin-heading">
        <div>
          <span className="section-label">05 / CONTROL CENTER</span>

          <h2>
            Панель <span>руководства.</span>
          </h2>

          <p>
            {isOwner
              ? 'Владелец — полный доступ ко всем функциям сайта.'
              : isLevelOne
                ? 'Администратор 1 уровня — полный доступ к управлению сайтом.'
                : 'Администратор 2 уровня — управление заявками.'}
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

      {/* Создание заданий — только владелец */}
      {isOwner && (
        <div className="admin-block glass">
          <h3>Создание заданий за CORZA COIN</h3>

          <p>
            Создавай задания для участников семьи. После публикации
            они появятся на странице заданий.
          </p>

          <form
            onSubmit={createTask}
            style={{
              display: 'grid',
              gap: '14px',
              maxWidth: '620px',
              marginTop: '20px'
            }}
          >
            <label>
              <span>Название задания</span>

              <input
                type="text"
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                placeholder="Например: Помощь семье на мероприятии"
                maxLength={120}
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

            <label>
              <span>Описание задания</span>

              <textarea
                value={taskDescription}
                onChange={(event) => setTaskDescription(event.target.value)}
                placeholder="Подробно опиши, что должен сделать участник..."
                rows={5}
                maxLength={3000}
                required
                disabled={loading}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '12px',
                  marginTop: '8px',
                  borderRadius: '10px',
                  resize: 'vertical'
                }}
              />
            </label>

            <label>
              <span>Награда в CORZA COIN</span>

              <input
                type="number"
                min="1"
                step="1"
                value={taskReward}
                onChange={(event) => setTaskReward(event.target.value)}
                placeholder="Например: 500"
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

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer'
              }}
            >
              <input
                type="checkbox"
                checked={taskActive}
                onChange={(event) => setTaskActive(event.target.checked)}
                disabled={loading}
              />

              <span>Опубликовать задание сразу</span>
            </label>

            <button type="submit" disabled={loading}>
              {loading ? 'Создание...' : 'Опубликовать задание'}
            </button>
          </form>

          <div style={{ marginTop: '30px' }}>
            <h3>Созданные задания</h3>

            {tasks.length === 0 ? (
              <p className="admin-empty">
                Пока нет созданных заданий.
              </p>
            ) : (
              <div className="admin-list">
                {tasks.map((task) => (
                  <article className="admin-request" key={task.id}>
                    <div className="admin-request-info">
                      <strong>{task.title}</strong>

                      <p>{task.description}</p>

                      <strong>
                        Награда: {Number(task.reward).toLocaleString('ru-RU')} CC
                      </strong>

                      <small>
                        Статус: {task.is_active ? 'Опубликовано' : 'Скрыто'}
                      </small>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Управление администраторами */}
      {isLevelOne && (
        <div className="admin-block glass">
          <h3>Управление администраторами</h3>

          <p>
            {isOwner
              ? 'Владелец может назначать администраторов обоих уровней и снимать их права.'
              : 'Ты можешь назначать младших администраторов и снимать их права.'}
          </p>

          <div
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
                value={selectedAdminUserId}
                onChange={(event) =>
                  setSelectedAdminUserId(event.target.value)
                }
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

                {availablePlayers.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.game_nickname || 'Без никнейма'}
                    {' — '}
                    {profile.server || 'Сервер не указан'}
                  </option>
                ))}
              </select>
            </label>

            {isOwner && (
              <button
                type="button"
                disabled={loading || !selectedAdminUserId}
                onClick={() => manageAdmin(selectedAdminUserId, 1)}
              >
                Назначить администратора 1 уровня
              </button>
            )}

            <button
              type="button"
              disabled={loading || !selectedAdminUserId}
              onClick={() => manageAdmin(selectedAdminUserId, 2)}
            >
              Назначить младшего администратора
            </button>
          </div>

          <div style={{ marginTop: '28px' }}>
            <h3>Действующие администраторы</h3>

            {admins.length === 0 ? (
              <p className="admin-empty">
                Администраторы не найдены.
              </p>
            ) : (
              <div className="admin-list">
                {admins.map((admin) => {
                  const member = profiles.find(
                    (profile) => profile.id === admin.user_id
                  )

                  const level = Number(admin.admin_level)
                  const canRemove =
                    (isOwner && level !== 0) ||
                    (!isOwner && level === 2)

                  return (
                    <article className="admin-member" key={admin.user_id}>
                      <div>
                        <strong>
                          {member?.game_nickname || 'Игрок'}
                        </strong>

                        <span>
                          {member?.server || 'Сервер не указан'}
                        </span>
                      </div>

                      <div className="admin-member-rank">
                        <strong>{getAdminRole(level)}</strong>

                        {canRemove && (
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() =>
                              manageAdmin(admin.user_id, -1)
                            }
                          >
                            Снять права
                          </button>
                        )}

                        {level === 0 && (
                          <span>Главный владелец сайта</span>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Corza Coin */}
      {isLevelOne && (
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
              Положительное число — начисление. Отрицательное — списание.
            </p>

            <label>
              <span>Причина операции</span>

              <input
                type="text"
                value={coinDescription}
                onChange={(event) =>
                  setCoinDescription(event.target.value)
                }
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
      )}

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

      {/* Участники CORZA */}
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
