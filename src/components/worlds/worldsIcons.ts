import type { Icon, IconProps } from '@phosphor-icons/react'
import {
  BookOpen,
  Flag,
  Flame,
  PencilLine,
  PlayCircle,
  Rocket,
  SealCheck,
  Sparkle,
  Sword,
  Trophy,
} from '@phosphor-icons/react'
import type { ChallengeDifficulty, MissionStatus } from '../../lib/worldsTypes'

export function missionStatusIcon(status: MissionStatus | string): Icon {
  switch (status) {
    case 'studying':
      return PlayCircle
    case 'mastered':
      return SealCheck
    default:
      return Flag
  }
}

export function challengeDifficultyIcon(difficulty: ChallengeDifficulty | string): Icon {
  switch (difficulty) {
    case 'quest':
      return Sword
    case 'boss':
      return Flame
    default:
      return Sparkle
  }
}

export const WorldsIcons = {
  book: BookOpen,
  pencil: PencilLine,
  rocket: Rocket,
  trophy: Trophy,
} as const

export type PhosphorIcon = Icon
export type PhosphorIconProps = IconProps
