import type { Icon, IconProps } from '@phosphor-icons/react'
import {
  BookOpen,
  CircleDashed,
  Flag,
  Flame,
  GlobeHemisphereWest,
  PlayCircle,
  Rocket,
  SealCheck,
  Sparkle,
  Sword,
} from '@phosphor-icons/react'
import type {
  ChallengeDifficulty,
  ChallengeScope,
  CourseProgress,
  MissionStatus,
} from '../../lib/worldsTypes'

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

export function courseProgressIcon(progress: CourseProgress | string): Icon {
  if (progress === 'empty') return CircleDashed
  return missionStatusIcon(progress)
}

export function challengeScopeIcon(scope: ChallengeScope | string): Icon {
  switch (scope) {
    case 'world':
      return GlobeHemisphereWest
    case 'course':
      return BookOpen
    default:
      return Rocket
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

export type PhosphorIcon = Icon
export type PhosphorIconProps = IconProps
