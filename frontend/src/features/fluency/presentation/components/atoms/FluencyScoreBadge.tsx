interface Props {
  score: number | null
}

export function FluencyScoreBadge({ score }: Props) {
  return (
    <div className="rounded-xl bg-accent px-4 py-2 text-xl font-black text-bg">
      {score !== null ? Math.round(score) : '--'}
    </div>
  )
}
