
function WeatherEffects({ mode = 'none' }) {
  if (mode === 'none') return null

  const particles = Array.from({ length: 36 }, (_, index) => ({
    id: index,
    left: `${(index * 37 + 11) % 100}%`,
    delay: `${-((index * 7) % 20)}s`,
    duration: `${12 + ((index * 13) % 15)}s`,
    size: `${12 + ((index * 5) % 13)}px`,
    drift: `${((index * 17) % 160) - 80}px`,
    opacity: 0.35 + ((index * 11) % 50) / 100,
  }))

  return (
    <div
      className={`corza-weather-layer corza-weather-${mode}`}
      aria-hidden="true"
    >
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="corza-weather-particle"
          style={{
            left: particle.left,
            animationDelay: particle.delay,
            animationDuration: particle.duration,
            fontSize: particle.size,
            '--weather-drift': particle.drift,
            opacity: particle.opacity,
          }}
        >
          {mode === 'leaves' && (
            ['🍂', '🍁', '🍃'][particle.id % 3]
          )}

          {mode === 'snow' && (
            ['❄', '❅', '•'][particle.id % 3]
          )}

          {mode === 'rain' && (
            <span className="corza-rain-drop" />
          )}
        </span>
      ))}
    </div>
  )
}

export default WeatherEffects
