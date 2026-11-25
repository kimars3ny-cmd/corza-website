
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
  const [taskSubmissions, setTaskSubmissions] = useState([])
  const [blatApplications, setBlatApplications] = useState([])
  const [blatEnabled, setBlatEnabled] = useState(true)

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const [coinUserId, setCoinUserId] = useState('')
  const [coinAmount, setCoinAmount] = useState('')
  const [coinDescription, setCoinDescription] = useState('')

  const [selectedAdminUserId, setSelectedAdminUserId] = useState('')

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
      const levelOne = !levelOneResult.error && levelOneResult.data === true
      const owner = !ownerResult.error && ownerResult.data === true

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
      tasksResult,
      submissionsResult,
      blatResult,
      blatSettingsResult
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, game_nickname, server, rank, position, joined_at, is_member')
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
        ? supabase.from('corza_wallets').select('user_id, balance')
        : Promise.resolve({ data: [], error: null }),

      isLevelOne
        ? supabase.rpc('get_corza_admins')
        : Promise.resolve({ data: [], error: null }),

      supabase
        .from('corza_tasks')
        .select('*')
        .order('created_at', { ascending: false }),

      supabase
        .from('corza_task_submissions')
        .select('*')
        .order('created_at', { ascending: false }),

      supabase
        .from('blat_applications')
        .select('*')
        .order('created_at', { ascending: false }),

      supabase
        .from('blat_settings')
        .select('is_enabled')
        .eq('id', true)
        .single()
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

    if (tasksResult.error) {
      errors.push('Задания: ' + tasksResult.error.message)
    } else {
      setTasks(tasksResult.data || [])
    }

    if (submissionsResult.error) {
      errors.push('Заявки на выполнение заданий: ' + submissionsResult.error.message)
    } else {
      setTaskSubmissions(submissionsResult.data || [])
    }

    if (blatResult.error) {
      errors.push('Заявки на День блата: ' + blatResult.error.message)
    } else {
      setBlatApplications(blatResult.data || [])
    }

    if (blatSettingsResult.error) {
      errors.push('Настройки Дня блата: ' + blatSettingsResult.error.message)
    } else {
      setBlatEnabled(blatSettingsResult.data.is_enabled)
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

  // Включение и выключение Дня блата
  async function toggleBlatPanel() {
    if (!isAdmin || !user) {
      setMessage('У тебя нет прав для изменения этой настройки.')
      return
    }

    const nextValue = !blatEnabled

    setLoading(true)
    setMessage(nextValue
      ? 'Включаем День блата...'
      : 'Выключаем День блата...')

    const { error } = await supabase
      .from('blat_settings')
      .update({
        is_enabled: nextValue,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', true)

    if (error) {
      setMessage('Ошибка изменения Дня блата: ' + error.message)
      setLoading(false)
      return
    }

    setBlatEnabled(nextValue)
    setMessage(nextValue
      ? 'День блата успешно включён!'
      : 'День блата успешно выключен!')

    setLoading(false)
  }

  // Создание задания — только владелец
  async function createTask(event) {
    event.preventDefault()

    if (!isOwner) {
      setMessage('Создавать задания может только владелец сайта.')
      return
    }

    const title = taskTitle.trim()
    const description = taskDescription.trim()
    const reward = Number(taskReward)

    if (!title || !description) {
      setMessage('Заполни название и описание задания.')
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

  // Проверка выполненного задания и начисление CC
  async function reviewTaskSubmission(submissionId, status) {
    if (!isAdmin) {
      setMessage('У тебя нет прав для проверки заданий.')
      return
    }

    const submission = taskSubmissions.find(
      (item) => item.id === submissionId
    )

    if (!submission || submission.status !== 'pending') {
      setMessage('Эта заявка уже была проверена.')
      return
    }

    const task = tasks.find((item) => item.id === submission.task_id)
    const player = profiles.find((item) => item.id === submission.user_id)

    const playerName = player?.game_nickname || 'Игрок'
    const taskName = task?.title || 'Задание'

    if (status === 'approved') {
      const comment = window.prompt(
        `Одобрить выполнение задания «${taskName}» игроку ${playerName}?\n\nНаграда: ${Number(task?.reward || 0)} CC\n\nМожешь оставить комментарий или нажать «Отмена» для пустого комментария.`,
        'Выполнение подтверждено!'
      )

      if (comment === null) return

      setLoading(true)
      setMessage('Проверяем задание и начисляем CC...')

      const { data, error } = await supabase.rpc(
        'approve_corza_task_submission',
        {
          p_submission_id: submissionId,
          p_admin_comment: comment.trim()
        }
      )

      if (error) {
        setMessage('Ошибка одобрения задания: ' + error.message)
        setLoading(false)
        return
      }

      await loadAdminData()

      setMessage(
        `Задание одобрено! Игроку ${playerName} начислена награда. Новый баланс: ${data} CC.`
      )
      return
    }

    if (status === 'rejected') {
      const comment = window.prompt(
        `Укажи причину отклонения задания «${taskName}» для игрока ${playerName}:`,
        'Необходимо предоставить более подробный отчёт.'
      )

      if (comment === null) return

      if (!comment.trim()) {
        setMessage('Укажи причину отклонения.')
        return
      }

      setLoading(true)
      setMessage('Отклоняем выполнение задания...')

      const { error } = await supabase
        .from('corza_task_submissions')
        .update({
          status: 'rejected',
          admin_comment: comment.trim(),
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', submissionId)
        .eq('status', 'pending')

      if (error) {
        setMessage('Ошибка отклонения задания: ' + error.message)
        setLoading(false)
        return
      }

      await loadAdminData()
      setMessage(`Заявка игрока ${playerName} отклонена.`)
    }
  }

  // Исключение участника из семьи CORZA
  async function kickMember(profile) {
    if (!isLevelOne) {
      setMessage('Недостаточно прав для исключения участника.')
      return
    }

    if (!profile?.id || !profile.is_member) {
      setMessage('Этот пользователь уже не является участником семьи.')
      return
    }

    const nickname = profile.game_nickname || 'Без никнейма'

    const confirmed = window.confirm(
      `Ты действительно хочешь исключить ${nickname} из семьи CORZA?\n\n` +
      'Его аккаунт и баланс Corza Coin сохранятся, но доступ к закрытым страницам будет отключён.'
    )

    if (!confirmed) return

    setLoading(true)
    setMessage('Исключаем участника...')

    const { error } = await supabase.rpc('kick_corza_member', {
      p_user_id: profile.id
    })

    if (error) {
      setMessage('Ошибка исключения: ' + error.message)
      setLoading(false)
      return
    }

    await loadAdminData()
    setMessage(`${nickname} исключён из семьи CORZA.`)
  }

  // Начисление и списание CC вручную
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

  // Управление администраторами
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

    if (!window.confirm(`Ты уверен, что хочешь ${action}`)) return

    setLoading(true)
    setMessage('Изменяем права администратора...')

    const { error } = await supabase.rpc('manage_corza_admin', {
      p_target_user_id: userId,
      p_admin_level: adminLevel
    })

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
    setMessage(status === 'approved'
      ? 'Заявка на повышение одобрена.'
      : 'Заявка на повышение отклонена.')
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
    setMessage(status === 'approved'
      ? 'Заявка на вступление одобрена!'
      : 'Заявка на вступление отклонена.')
  }

  // Обработка заявки на День блата
  async function reviewBlatApplication(applicationId, status) {
    if (!isAdmin) {
      setMessage('У тебя нет прав для проверки заявок.')
      return
    }

    const application = blatApplications.find(
      (item) => item.id === applicationId
    )

    if (!application || application.status !== 'pending') {
      setMessage('Эта заявка уже была проверена.')
      return
    }

    let comment = ''

    if (status === 'rejected') {
      const answer = window.prompt(
        'Укажи причину отклонения заявки:',
        'Заявка не соответствует требованиям.'
      )

      if (answer === null) return

      comment = answer.trim()

      if (!comment) {
        setMessage('Укажи причину отклонения.')
        return
      }
    }

    setLoading(true)
    setMessage('Обрабатываем заявку на День блата...')

    const { error } = await supabase
      .from('blat_applications')
      .update({
        status,
        admin_comment: comment || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id
      })
      .eq('id', applicationId)
      .eq('status', 'pending')

    if (error) {
      setMessage('Ошибка обработки заявки на День блата: ' + error.message)
      setLoading(false)
      return
    }

    await loadAdminData()

    setMessage(status === 'approved'
      ? 'Заявка на День блата одобрена.'
      : 'Заявка на День блата отклонена.')
  }

  if (checking) return null
  if (!isAdmin) return null

  const pendingPromotions = requests.filter((item) =>
    ['pending', 'На рассмотрении'].includes(item.status)
  )

  const pendingJoins = joinRequests.filter((item) =>
    ['pending', 'На рассмотрении'].includes(item.status)
  )

  const pendingTaskSubmissions = taskSubmissions.filter(
    (item) => item.status === 'pending'
  )

  const pendingBlatApplications = blatApplications.filter(
    (item) => item.status === 'pending'
  )

  const availablePlayers = profiles.filter(
    (profile) => !admins.some((admin) => admin.user_id === profile.id)
  )

  function getAdminRole(level) {
    switch (Number(level)) {
      case 0: return 'Владелец'
      case 1: return 'Администратор 1 уровня'
      case 2: return 'Младший администратор'
      default: return 'Неизвестная роль'
    }
  }

  function getTaskStatus(status) {
    switch (status) {
      case 'approved': return 'Одобрено'
      case 'rejected': return 'Отклонено'
      default: return 'На проверке'
    }
  }

  return (
    <section className="admin-section" id="admin">
      <div className="admin-heading">
        <div>
          <span className="section-label">05 / CONTROL CENTER</span>
          <h2>Панель <span>руководства.</span></h2>
          <p>
            {isOwner
              ? 'Владелец — полный доступ ко всем функциям сайта.'
              : isLevelOne
                ? 'Администратор 1 уровня — полный доступ к управлению сайтом.'
                : 'Администратор 2 уровня — управление заявками и проверка заданий.'}
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

      {message && <div className="admin-message">{message}</div>}

      <div className="admin-stats">
        <div className="admin-stat glass">
          <span>Участников</span>
          <strong>{profiles.filter((profile) => profile.is_member).length}</strong>
        </div>

        <div className="admin-stat glass">
          <span>Всего заявок</span>
          <strong>
            {requests.length + joinRequests.length + blatApplications.length}
          </strong>
        </div>

        <div className="admin-stat glass">
          <span>На рассмотрении</span>
          <strong>
            {pendingPromotions.length +
              pendingJoins.length +
              pendingTaskSubmissions.length +
              pendingBlatApplications.length}
          </strong>
        </div>
      </div>

      {/* Управление Днём блата */}
      <div className="admin-block glass">
        <div className="task-review-heading">
          <div>
            <span className="section-label">CORZA / BLAT DAY CONTROL</span>
            <h3>Управление Днём блата</h3>
            <p>
              Здесь можно включить или выключить панель Дня блата
              и приём новых заявок.
            </p>
          </div>

          <div className="task-review-counter">
            <strong>{blatEnabled ? 'ВКЛ' : 'ВЫКЛ'}</strong>
            <span>{blatEnabled ? 'День блата активен' : 'День блата отключён'}</span>
          </div>
        </div>

        <button
          type="button"
          className={blatEnabled ? 'task-review-reject' : 'task-review-approve'}
          onClick={toggleBlatPanel}
          disabled={loading}
        >
          {loading
            ? 'Сохранение...'
            : blatEnabled
              ? 'Выключить День блата'
              : 'Включить День блата'}
        </button>
      </div>

      {/* Проверка выполненных заданий — все администраторы */}
      <div className="admin-block glass task-review-block">
        <div className="task-review-heading">
          <div>
            <span className="section-label">CORZA COIN / TASK CONTROL</span>
            <h3>Проверка выполненных заданий</h3>
            <p>
              Проверяй отчёты участников. При одобрении награда автоматически
              поступит на баланс игрока.
            </p>
          </div>

          <div className="task-review-counter">
            <strong>{pendingTaskSubmissions.length}</strong>
            <span>Ожидают проверки</span>
          </div>
        </div>

        {taskSubmissions.length === 0 ? (
          <p className="admin-empty">
            Пока никто не отправил выполненные задания.
          </p>
        ) : (
          <div className="task-review-list">
            {taskSubmissions.map((submission) => {
              const task = tasks.find(
                (item) => item.id === submission.task_id
              )

              const player = profiles.find(
                (item) => item.id === submission.user_id
              )

              const pending = submission.status === 'pending'

              return (
                <article className="task-review-card" key={submission.id}>
                  <div className="task-review-card-top">
                    <div>
                      <span className="task-review-label">УЧАСТНИК</span>
                      <h4>{player?.game_nickname || 'Неизвестный игрок'}</h4>
                      <span className="task-review-server">
                        {player?.server || 'Сервер не указан'}
                      </span>
                    </div>

                    <span className={`task-review-status ${submission.status}`}>
                      {getTaskStatus(submission.status)}
                    </span>
                  </div>

                  <div className="task-review-task-info">
                    <div>
                      <span className="task-review-label">ЗАДАНИЕ</span>
                      <strong>{task?.title || 'Задание не найдено'}</strong>
                    </div>

                    <div className="task-review-reward">
                      <span className="task-review-label">НАГРАДА</span>
                      <strong>
                        {Number(task?.reward || 0).toLocaleString('ru-RU')} CC
                      </strong>
                    </div>
                  </div>

                  <div className="task-review-report">
                    <span className="task-review-label">ОТЧЁТ ИГРОКА</span>
                    <p>{submission.report || 'Отчёт не указан.'}</p>
                  </div>

                  <div className="task-review-date">
                    Отправлено: {submission.created_at
                      ? new Date(submission.created_at).toLocaleString('ru-RU')
                      : 'Дата неизвестна'}
                  </div>

                  {submission.admin_comment && (
                    <div className="task-review-comment">
                      <strong>Комментарий администратора:</strong>
                      <p>{submission.admin_comment}</p>
                    </div>
                  )}

                  {pending && (
                    <div className="task-review-actions">
                      <button
                        type="button"
                        className="task-review-approve"
                        disabled={loading}
                        onClick={() =>
                          reviewTaskSubmission(submission.id, 'approved')
                        }
                      >
                        Одобрить и начислить CC
                      </button>

                      <button
                        type="button"
                        className="task-review-reject"
                        disabled={loading}
                        onClick={() =>
                          reviewTaskSubmission(submission.id, 'rejected')
                        }
                      >
                        Отклонить
                      </button>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </div>

      {/* Создание заданий — только владелец */}
      {isOwner && (
        <div className="admin-block glass">
          <h3>Создание заданий за CORZA COIN</h3>
          <p>
            Создавай задания для участников семьи. После публикации
            они появятся на странице заданий.
          </p>

          <form className="admin-task-form" onSubmit={createTask}>
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
                required
                disabled={loading}
              />
            </label>

            <label className="admin-task-checkbox">
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
              <p className="admin-empty">Пока нет созданных заданий.</p>
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

          <div className="admin-task-form">
            <label>
              <span>Выбери игрока</span>
              <select
                value={selectedAdminUserId}
                onChange={(event) => setSelectedAdminUserId(event.target.value)}
                disabled={loading}
              >
                <option value="">Выбрать участника...</option>
                {availablePlayers.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.game_nickname || 'Без никнейма'} — {profile.server || 'Сервер не указан'}
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
              <p className="admin-empty">Администраторы не найдены.</p>
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
                        <strong>{member?.game_nickname || 'Игрок'}</strong>
                        <span>{member?.server || 'Сервер не указан'}</span>
                      </div>

                      <div className="admin-member-rank">
                        <strong>{getAdminRole(level)}</strong>

                        {canRemove && (
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => manageAdmin(admin.user_id, -1)}
                          >
                            Снять права
                          </button>
                        )}

                        {level === 0 && <span>Главный владелец сайта</span>}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Управление Corza Coin */}
      {isLevelOne && (
        <div className="admin-block glass">
          <h3>Управление Corza Coin</h3>
          <p>Начисление и списание внутренней валюты CORZA.</p>

          <form className="admin-task-form" onSubmit={adjustCoins}>
            <label>
              <span>Выбери игрока</span>
              <select
                value={coinUserId}
                onChange={(event) => setCoinUserId(event.target.value)}
                required
                disabled={loading}
              >
                <option value="">Выбрать участника...</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.game_nickname || 'Без никнейма'} — {profile.server || 'Сервер не указан'}
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
              />
            </label>

            <p className="admin-form-hint">
              Положительное число — начисление. Отрицательное — списание.
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
              />
            </label>

            <button type="submit" disabled={loading || profiles.length === 0}>
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
                        <strong>{profile.game_nickname || 'Без никнейма'}</strong>
                        <span>{profile.server || 'Сервер не указан'}</span>
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

      {/* Заявки на День блата */}
      <div className="admin-block glass">
        <div className="task-review-heading">
          <div>
            <span className="section-label">CORZA / BLAT DAY</span>
            <h3>Заявки на День блата</h3>
            <p>Заявки, отправленные через публичную форму сайта.</p>
          </div>

          <div className="task-review-counter">
            <strong>{pendingBlatApplications.length}</strong>
            <span>Ожидают проверки</span>
          </div>
        </div>

        {blatApplications.length === 0 ? (
          <p className="admin-empty">Заявок на День блата пока нет.</p>
        ) : (
          <div className="admin-list">
            {blatApplications.map((application) => {
              const pending = application.status === 'pending'

              const statusLabel =
                application.status === 'approved'
                  ? 'Одобрено'
                  : application.status === 'rejected'
                    ? 'Отклонено'
                    : 'На рассмотрении'

              return (
                <article className="admin-request" key={application.id}>
                  <div className="admin-request-info">
                    <strong>
                      {application.game_nickname || 'Без никнейма'}
                    </strong>

                    <span>
                      Статик: {application.static || 'Не указан'}
                    </span>

                    <span>
                      Подписка на Telegram: {application.subscription_verified
                        ? 'Подтверждена'
                        : 'Не подтверждена автоматически'}
                    </span>

                    {application.telegram_id && (
                      <span>Telegram ID: {application.telegram_id}</span>
                    )}

                    <small>
                      Отправлено: {application.created_at
                        ? new Date(application.created_at).toLocaleString('ru-RU')
                        : 'Дата неизвестна'}
                    </small>

                    <small>Статус: {statusLabel}</small>

                    {application.admin_comment && (
                      <p>Комментарий: {application.admin_comment}</p>
                    )}

                    {pending && (
                      <div className="admin-actions">
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() =>
                            reviewBlatApplication(application.id, 'approved')
                          }
                        >
                          Одобрить
                        </button>

                        <button
                          type="button"
                          disabled={loading}
                          onClick={() =>
                            reviewBlatApplication(application.id, 'rejected')
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

      {/* Заявки на вступление */}
      <div className="admin-block glass">
        <h3>Заявки на вступление в CORZA</h3>

        {joinRequests.length === 0 ? (
          <p className="admin-empty">Заявок на вступление пока нет.</p>
        ) : (
          <div className="admin-list">
            {joinRequests.map((request) => {
              const pending = ['pending', 'На рассмотрении'].includes(request.status)

              return (
                <article className="admin-request" key={request.id}>
                  <div className="admin-request-info">
                    <strong>{request.game_nickname || 'Без никнейма'}</strong>
                    <span>Сервер: {request.server || 'Не указан'}</span>
                    <span>Возраст персонажа: {request.character_age || 'Не указан'}</span>
                    <p>Опыт: {request.expirience || 'Не указан'}</p>
                    <p>Причина вступления: {request.reason || 'Не указана'}</p>
                    <small>Статус: {request.status || 'На рассмотрении'}</small>

                    {pending && (
                      <div className="admin-actions">
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => reviewJoinRequest(request.id, 'approved')}
                        >
                          Одобрить
                        </button>

                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => reviewJoinRequest(request.id, 'rejected')}
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

              const pending = ['pending', 'На рассмотрении'].includes(request.status)

              return (
                <article className="admin-request" key={request.id}>
                  <div className="admin-request-info">
                    <strong>{member?.game_nickname || 'Неизвестный участник'}</strong>

                    <span>
                      {request.current_rank || 'Ранг не указан'} → {request.desired_rank || 'Не указан'}
                    </span>

                    <p>{request.reason || 'Причина не указана.'}</p>
                    <small>Статус: {request.status || 'На рассмотрении'}</small>

                    {pending && (
                      <div className="admin-actions">
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => reviewRequest(request.id, 'approved')}
                        >
                          Одобрить
                        </button>

                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => reviewRequest(request.id, 'rejected')}
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
                  <strong>{profile.game_nickname || 'Без никнейма'}</strong>
                  <span>{profile.server || 'Сервер не указан'}</span>
                  <span>
                    {profile.is_member ? 'Участник семьи' : 'Не состоит в семье'}
                  </span>
                </div>

                <div className="admin-member-rank">
                  <strong>{profile.rank || 'Новичок'}</strong>
                  <span>{profile.position || 'Участник'}</span>

                  {isLevelOne && profile.is_member && (
                    <button
                      type="button"
                      className="task-review-reject"
                      disabled={loading || profile.id === user?.id}
                      onClick={() => kickMember(profile)}
                    >
                      Исключить из семьи
                    </button>
                  )}
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
