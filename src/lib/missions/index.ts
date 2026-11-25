import { mission1 } from '@/lib/missions/mission-1';
import { mission2 } from '@/lib/missions/mission-2';
import { mission3 } from '@/lib/missions/mission-3';
import { mission4 } from '@/lib/missions/mission-4';
import { mission5 } from '@/lib/missions/mission-5';
import type { MissionDefinition } from '@/lib/types/domain';

export const MISSIONS: readonly MissionDefinition[] = [
  mission1,
  mission2,
  mission3,
  mission4,
  mission5,
];

export function getMissionById(id: number): MissionDefinition | undefined {
  return MISSIONS.find((mission) => mission.id === id);
}
