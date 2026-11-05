import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import JoinRequest from './JoinRequest'

function JoinPage({ onOpenAuth }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function loadUser() {
      const { data } = await supabase.auth.getSession()
      const currentUser = data.session?.user ?? null

      if (!active) return

      setUser(currentUser)

      if (currentUser) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('game_nickname, server, rank, position, joined_at')
          .eq('id', currentUser.id)
          .maybeSingle()

        if (active) setProfile(profileData)
      }

      if (active) setLoading(false)
    }

    loadUser()

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!active) return

        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          const { data } = await supabase
            .from('profiles')
            .select('game_nickname, server, rank, position, joined_at')
            .eq('id', currentUser.id)
            .maybeSingle()

          if (active) setProfile(data)
        } else {
          setProfile(null)
        }

        if (active) setLoading(false)
      }
    )

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  return (
    <section className="standalone-page">
      <div className="page-heading">
        <span className="section-label">CORZA / RECRUITMENT</span>
        <h1>Вступление в <span>CORZA.</span></h1>
        <p>Заполни анкету, чтобы руководство могло рассмотреть твою кандидатуру.</p>
      </div>

      {loading ? (
        <div className="page-panel glass">Проверяем авторизацию...</div>
      ) : user && profile ? (
        <div className="page-panel glass">
          <JoinRequest user={user} profile={profile} />
        </div>
      ) : user ? (
        <div className="page-panel glass">
          <h3>Профиль пока не найден</h3>
          <p>Аккаунт авторизован, но профиль участника не загрузился.</p>
        </div>
      ) : (
        <div className="page-panel glass">
          <h3>Сначала войди в аккаунт</h3>
          <p>Для подачи заявки необходимо зарегистрироваться или войти.</p>
          <button className="primary-button" onClick={onOpenAuth}>
            Войти / Регистрация
          </button>
        </div>
      )}
    </section>
  )
}

export default JoinPage