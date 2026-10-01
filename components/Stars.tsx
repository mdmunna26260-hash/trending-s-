export function Stars({ value, size = 14, showValue = false }: { value: number; size?: number; showValue?: boolean }) {
  const rounded = Math.round(value * 2) / 2
  return (
    <span className="stars" aria-label={`${value} out of 5 stars`} style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = rounded >= star
        const half = !filled && rounded >= star - 0.5
        return (
          <svg
            key={star}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={filled ? 'currentColor' : half ? 'url(#half)' : 'none'}
            stroke="currentColor"
            strokeWidth="1.4"
            aria-hidden
          >
            {half ? (
              <defs>
                <linearGradient id="half">
                  <stop offset="50%" stopColor="currentColor" />
                  <stop offset="50%" stopColor="transparent" />
                </linearGradient>
              </defs>
            ) : null}
            <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.9-5.2 2.9 1-5.9L3.5 9.7l5.9-.8z" />
          </svg>
        )
      })}
      {showValue ? <span className="small muted" style={{ marginLeft: '0.35rem' }}>{value.toFixed(1)}</span> : null}
    </span>
  )
}
