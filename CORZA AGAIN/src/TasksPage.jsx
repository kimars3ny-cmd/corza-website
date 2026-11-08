
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export default function TasksPage() {
  const [tasks, setTasks] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(null)
  const [reports, setReports] = useState({})
  const [editingTasks, setEditingTasks] = useState({})
  const [message, setMessage] = useState('')

  async function loadTasks() {
    setLoading(true)
    setMessage('')

    const { data: sessionData } = await supabase.auth.getSession()
    const currentUser = sessionData.session?.user

    if (!currentUser) {
      setUser(null)
      setTasks([])
      setSubmissions([])
      setLoading(false)
      return
    }

    setUser(currentUser)

    const [tasksResult, submissionsResult] = await Promise.all([
      supabase
        .from('corza_tasks')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false }),

      supabase
        .from('corza_task_submissions')
        .select('*')
        .eq('user_id', currentUser.id)
    ])

    if (tasksResult.error) {
      setMessage('Ошибка загрузки заданий: ' + tasksResult.error.message)
    } else {
      setTasks(tasksResult.data || [])
    }

    if (submissionsResult.error) {
      setMessage('Ошибка загрузки отчётов: ' + submissionsResult.error.message)
    } else {
      setSubmissions(submissionsResult.data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadTasks()
  }, [])

  // Первичная отправка отчёта
  async function sendReport(taskId) {
    const report = (reports[taskId] || '').trim()

    if (!report) {
      setMessage('Напиши отчёт перед отправкой.')
      return
    }

    if (!user) {
      setMessage('Сначала авторизуйся на сайте.')
      return
    }

    setSending(taskId)
    setMessage('Отправляем отчёт...')

    const { error } = await supabase
      .from('corza_task_submissions')
      .insert({
        task_id: taskId,
        user_id: user.id,
        report,
        status: 'pending'
      })

    if (error) {
      setMessage(
        error.code === '23505'
          ? 'Ты уже отправлял отчёт по этому заданию.'
          : 'Не удалось отправить отчёт: ' + error.message
      )
      setSending(null)
      return
    }

    setReports(prev => ({ ...prev, [taskId]: '' }))

    await loadTasks()
    setMessage('Отчёт успешно отправлен на проверку!')
    setSending(null)
  }

  // Повторная отправка отклонённого задания
  async function resubmitReport(taskId, submissionId) {
    const report = (reports[taskId] || '').trim()

    if (!report) {
      setMessage('Напиши исправленный отчёт перед отправкой.')
      return
    }

    if (!user) {
      setMessage('Сначала авторизуйся на сайте.')
      return
    }

    setSending(taskId)
    setMessage('Отправляем исправленный отчёт...')

    const { error } = await supabase.rpc(
      'resubmit_corza_task_submission',
      {
        p_submission_id: submissionId,
        p_report: report
      }
    )

    if (error) {
      setMessage('Не удалось отправить исправленный отчёт: ' + error.message)
      setSending(null)
      return
    }

    setReports(prev => ({ ...prev, [taskId]: '' }))
    setEditingTasks(prev => ({ ...prev, [taskId]: false }))

    await loadTasks()

    setMessage('Исправленный отчёт отправлен! Ожидай повторной проверки администрации.')
    setSending(null)
  }

  function getSubmission(taskId) {
    return submissions.find(item => item.task_id === taskId)
  }

  function startEditing(taskId, oldReport) {
    setReports(prev => ({
      ...prev,
      [taskId]: oldReport || ''
    }))

    setEditingTasks(prev => ({
      ...prev,
      [taskId]: true
    }))
  }

  function cancelEditing(taskId) {
    setEditingTasks(prev => ({
      ...prev,
      [taskId]: false
    }))

    setReports(prev => ({
      ...prev,
      [taskId]: ''
    }))
  }

  if (loading) {
    return <div className="tasks-page">Загружаем задания CORZA...</div>
  }

  if (!user) {
    return (
      <div className="tasks-page">
        <div className="tasks-empty">
          <h2>Задания CORZA</h2>
          <p>
            Чтобы выполнять задания и получать CC,
            необходимо авторизоваться.
          </p>
        </div>
      </div>
    )
  }

  return (
    <section className="tasks-page">
      <div className="tasks-heading">
        <div>
          <div className="tasks-label">CORZA REWARDS</div>
          <h1>Задания CORZA</h1>
          <p>
            Выполняй задания, отправляй отчёты и получай Corza Coin.
          </p>
        </div>

        <button
          className="tasks-refresh"
          onClick={loadTasks}
          disabled={!!sending}
        >
          ↻ Обновить
        </button>
      </div>

      {message && (
        <div className="tasks-message">
          {message}
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="tasks-empty">
          <div className="tasks-empty-icon">✦</div>
          <h2>Пока нет доступных заданий</h2>
          <p>
            Следи за обновлениями. Скоро здесь появятся новые задания!
          </p>
        </div>
      ) : (
        <div className="tasks-grid">
          {tasks.map(task => {
            const submission = getSubmission(task.id)
            const isEditing = editingTasks[task.id]
            const isSending = sending === task.id

            return (
              <article className="task-card" key={task.id}>
                <div className="task-card-top">
                  <span className="task-category">ЗАДАНИЕ CORZA</span>
                  <span className="task-reward">
                    +{task.reward} CC
                  </span>
                </div>

                <h2>{task.title}</h2>

                <p className="task-description">
                  {task.description}
                </p>

                {/* Если заявка уже существует */}
                {submission ? (
                  <div className="task-submission">
                    <div className="task-status">
                      {submission.status === 'pending' && '⏳ На проверке'}
                      {submission.status === 'approved' && '✓ Одобрено'}
                      {submission.status === 'rejected' && '✕ Отклонено'}
                    </div>

                    <p className="task-report-text">
                      Твой отчёт: {submission.report}
                    </p>

                    {/* Комментарий администрации */}
                    {submission.admin_comment && (
                      <p className="task-admin-comment">
                        Ответ администрации: {submission.admin_comment}
                      </p>
                    )}

                    {/* Повторное выполнение после отказа */}
                    {submission.status === 'rejected' && (
                      <div className="task-resubmit">
                        {!isEditing ? (
                          <>
                            <p className="task-resubmit-note">
                              Твоё задание отклонено. Исправь ошибки
                              согласно комментарию администрации и отправь
                              отчёт повторно.
                            </p>

                            <button
                              type="button"
                              className="task-resubmit-button"
                              onClick={() =>
                                startEditing(task.id, submission.report)
                              }
                            >
                              ↻ Переделать задание
                            </button>
                          </>
                        ) : (
                          <div className="task-submit task-resubmit-form">
                            <label>
                              Исправленный отчёт
                            </label>

                            <textarea
                              placeholder="Опиши, как ты исправил задание..."
                              value={reports[task.id] || ''}
                              onChange={event =>
                                setReports(prev => ({
                                  ...prev,
                                  [task.id]: event.target.value
                                }))
                              }
                              disabled={isSending}
                            />

                            <button
                              type="button"
                              onClick={() =>
                                resubmitReport(task.id, submission.id)
                              }
                              disabled={isSending}
                            >
                              {isSending
                                ? 'Отправляем...'
                                : 'Отправить исправленный отчёт'}
                            </button>

                            <button
                              type="button"
                              className="task-cancel-edit"
                              onClick={() => cancelEditing(task.id)}
                              disabled={isSending}
                            >
                              Отмена
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  // Первичная отправка задания
                  <div className="task-submit">
                    <textarea
                      placeholder="Напиши отчёт о выполнении задания..."
                      value={reports[task.id] || ''}
                      onChange={event =>
                        setReports(prev => ({
                          ...prev,
                          [task.id]: event.target.value
                        }))
                      }
                      disabled={isSending}
                    />

                    <button
                      type="button"
                      onClick={() => sendReport(task.id)}
                      disabled={isSending}
                    >
                      {isSending ? 'Отправляем...' : 'Отправить отчёт'}
                    </button>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
