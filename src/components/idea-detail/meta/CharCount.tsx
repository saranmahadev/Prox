interface CharCountProps {
  value: string
  max: number
}

export function CharCount({ value, max }: CharCountProps) {
  const n = value.length
  return (
    <span className={`cnt${n > max ? ' over' : ''}`}>
      {n}/{max}
    </span>
  )
}
