
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export default function TasksPage() {
  const [tasks, setTasks] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(null)
  const [reports, setReports] = useState({})
  const [message, setMessage] = useState('')

  async function loadTasks() {
    setLoading(true)
    setMessage('')

    const { data: sessionData } = await supabase.auth.getSession()
    const currentUser = sessionData.session?.user

    if (!currentUser) {
      setUser(null)
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
    setMessage('')

    const { error } = await supabase
      .from('corza_task_submissions')
      .insert({
        task_id: taskId,
        user_id: user.id,
        report
      })

    if (error) {
      setMessage(
        error.code === '23505'
          ? 'Ты уже отправлял отчёт по этому заданию.'
          : 'Не удалось отправить отчёт: ' + error.message
      )
    } else {
      setReports(prev => ({ ...prev, [taskId]: '' }))
      setMessage('Отчёт успешно отправлен на проверку!')
      await loadTasks()
    }

    setSending(null)
  }

  function getSubmission(taskId) {
    return submissions.find(item => item.task_id === taskId)
  }

  if (loading) {
    return <div className="tasks-page">Загружаем задания CORZA...</div>
  }

  if (!user) {
    return (
      <div className="tasks-page">
        <div className="tasks-empty">
          <h2>Задания CORZA</h2>
          <p>Чтобы выполнять задания и получать CC, необходимо авторизоваться.</p>
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
          <p>Выполняй задания, отправляй отчёты и получай Corza Coin.</p>
        </div>

        <button className="tasks-refresh" onClick={loadTasks}>
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
          <p>Следи за обновлениями. Скоро здесь появятся новые задания!</p>
        </div>
      ) : (
        <div className="tasks-grid">
          {tasks.map(task => {
            const submission = getSubmission(task.id)

            return (
              <article className="task-card" key={task.id}>
                <div className="task-card-top">
                  <span className="task-category">ЗАДАНИЕ CORZA</span>
                  <span className="task-reward">
                    +{task.reward} CC
                  </span>
                </div>

                <h2>{task.title}</h2>
                <p className="task-description">{task.description}</p>

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

                    {submission.admin_comment && (
                      <p className="task-admin-comment">
                        Ответ администрации: {submission.admin_comment}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="task-submit">
                    <textarea
                      placeholder="Напиши отчёт о выполнении задания..."
                      value={reports[task.id] || ''}
                      onChange={e =>
                        setReports(prev => ({
                          ...prev,
                          [task.id]: e.target.value
                        }))
                      }
                    />

                    <button
                      onClick={() => sendReport(task.id)}
                      disabled={sending === task.id}
                    >
                      {sending === task.id
                        ? 'Отправляем...'
                        : 'Отправить отчёт'}
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
