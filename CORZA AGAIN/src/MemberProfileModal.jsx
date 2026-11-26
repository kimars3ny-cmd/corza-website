import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import './MemberProfileModal.css'

function MemberProfileModal({ member, onClose }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadPublicProfile() {
      setLoading(true)
      setError('')
      setProfile(null)

      const { data, error: requestError } = await supabase.rpc(
        'get_corza_public_profile',
        { p_user_id: member.id }
      )

      if (!active) return

      if (requestError) {
        console.error('Ошибка загрузки публичного профиля CORZA:', requestError)
        setError(requestError.message || 'Не удалось загрузить профиль.')
      } else if (!data) {
        setError('Профиль пользователя не найден.')
      } else {
        setProfile(data)
      }

      setLoading(false)
    }

    if (member?.id) loadPublicProfile()

    return () => {
      active = false
    }
  }, [member?.id])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const nickname =
    profile?.game_nickname ||
    member?.game_nickname ||
    'Без игрового никнейма'

  const initial = nickname.charAt(0).toUpperCase()
  const frame = profile?.equipped_frame || 'none'
  const balance = Number(profile?.coin_balance || 0)

  return (
    <div className="member-profile-overlay" onClick={onClose}>
      <section
        className="member-profile-modal glass"
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-profile-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="member-profile-close"
          onClick={onClose}
          aria-label="Закрыть профиль"
        >
          ×
        </button>

        <div className="member-profile-topline">
          <span className="section-label">CORZA / PLAYER PROFILE</span>
          <span className="member-profile-mark">C</span>
        </div>

        {loading ? (
          <div className="member-profile-state">
            <div className="member-profile-loader" />
            <p>Загружаем профиль...</p>
          </div>
        ) : error ? (
          <div className="member-profile-state">
            <h2>Не удалось открыть профиль</h2>
            <p>{error}</p>
            <button className="secondary-button" type="button" onClick={onClose}>
              Закрыть
            </button>
          </div>
        ) : (
          <>
            <div className="member-profile-identity">
              <div className={`member-profile-avatar frame-${frame}`}>
                <span>{initial}</span>
              </div>

              <div className="member-profile-name">
                <span className={profile.is_member ? 'member-profile-status is-member' : 'member-profile-status'}>
                  <i />
                  {profile.is_member ? 'Участник CORZA' : 'Пользователь сайта'}
                </span>
                <h2 id="member-profile-title">{nickname}</h2>
                <p>{profile.server || 'Сервер не указан'}</p>
              </div>
            </div>

            <div className="member-profile-coin-card">
              <div>
                <span className="member-profile-caption">CORZA ECONOMY</span>
                <strong>{balance.toLocaleString('ru-RU')} <small>CC</small></strong>
                <p>Баланс Corza Coin</p>
              </div>
              <div className="member-profile-coin-icon">✦</div>
            </div>

            <div className="member-profile-details">
              <div className="member-profile-detail">
                <span>Ранг</span>
                <strong>{profile.rank || 'Не указан'}</strong>
              </div>
              <div className="member-profile-detail">
                <span>Должность</span>
                <strong>{profile.position || (profile.is_member ? 'Участник семьи' : '—')}</strong>
              </div>
              <div className="member-profile-detail">
                <span>Статус</span>
                <strong>{profile.is_member ? 'В составе семьи' : 'Не состоит в семье'}</strong>
              </div>
              <div className="member-profile-detail">
                <span>Рамка профиля</span>
                <strong>
                  {frame === 'none' ? 'Стандартная' :
                    frame === 'neon' ? 'Неоновая' :
                      frame === 'gold' ? 'Золотая' :
                        frame === 'ice' ? 'Ледяная' :
                          frame === 'royal' ? 'Королевская' : 'Установлена'}
                </strong>
              </div>
            </div>

            <p className="member-profile-footer">
              Публичный профиль участника государственной семьи CORZA
            </p>
          </>
        )}
      </section>
    </div>
  )
}

export default MemberProfileModal
