interface HeroStatsProps {
  total: number
  active: number
  done: number
}

export function HeroStats({ total, active, done }: HeroStatsProps) {
  return (
    <section className="hero" aria-label="Overview">
      <div className="stat clay">
        <small>Total ideas</small>
        <b>{total}</b>
      </div>
      <div className="stat clay">
        <small>In progress</small>
        <b>{active}</b>
      </div>
      <div className="stat clay">
        <small>Published</small>
        <b>{done}</b>
      </div>
    </section>
  )
}
