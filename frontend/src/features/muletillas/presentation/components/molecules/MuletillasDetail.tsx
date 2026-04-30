import type { MuletillaDetected } from '../../../domain/MuletillasSession'
import MuletillasBadge from '../atoms/MuletillasBadge'

type Props = {
  muletilla: MuletillaDetected
}

export default function MuletillasDetail({ muletilla }: Props) {
  return (
    <div className="bg-[#1C1C1E] rounded-lg p-3 sm:p-4 border border-[#334155]">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="text-[#F8FAFC] font-semibold text-sm sm:text-base">
          &ldquo;{muletilla.word}&rdquo;
        </span>
        <MuletillasBadge severity={muletilla.severity} />
        <span className="text-[#9CA3AF] text-xs ml-auto">
          {muletilla.count} {muletilla.count === 1 ? 'vez' : 'veces'}
        </span>
      </div>
      <p className="text-[#9CA3AF] text-xs sm:text-sm leading-relaxed">
        {muletilla.suggestion}
      </p>
    </div>
  )
}
