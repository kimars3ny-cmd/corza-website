
import './WeatherEffects.css'

function WeatherEffects({ mode }) {
  if (!mode || mode === 'none') return null

  const particles = Array.from({ length: 42 }, (_, index) => ({
    id: index,
    left: `${(index * 37 + 11) % 100}%`,
    delay: `${(index * 0.73) % 12}s`,
    duration: `${8 + ((index * 13) % 10)}s`,
    size: `${12 + ((index * 7) % 13)}px`,
    drift: `${((index * 17) % 100) - 50}px`,
  }))

  if (mode === 'leaves') {
    const leaves = ['🍂', '🍁', '🍃']

    return (
      <div className="corza-weather-layer corza-leaves" aria-hidden="true">
        {particles.map((particle) => (
          <span
            key={particle.id}
            className="corza-weather-particle corza-leaf"
            style={{
              left: particle.left,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
              fontSize: particle.size,
              '--drift': particle.drift,
            }}
          >
            {leaves[particle.id % leaves.length]}
          </span>
        ))}
      </div>
    )
  }

  if (mode === 'snow') {
    return (
      <div className="corza-weather-layer corza-snow" aria-hidden="true">
        {particles.map((particle) => (
          <span
            key={particle.id}
            className="corza-weather-particle corza-snowflake"
            style={{
              left: particle.left,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
              fontSize: particle.size,
              '--drift': particle.drift,
            }}
          >
            {particle.id % 3 === 0 ? '❄' : '•'}
          </span>
        ))}
      </div>
    )
  }

  if (mode === 'rain') {
    return (
      <div className="corza-weather-layer corza-rain" aria-hidden="true">
        {particles.map((particle) => (
          <span
            key={particle.id}
            className="corza-weather-particle corza-raindrop"
            style={{
              left: particle.left,
              animationDelay: particle.delay,
              animationDuration: `${1.1 + (particle.id % 10) * 0.12}s`,
            }}
          />
        ))}
      </div>
    )
  }

  return null
}

export default WeatherEffects
