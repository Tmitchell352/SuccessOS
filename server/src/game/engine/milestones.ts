import type { Character, Dynasty } from "@dynasty/shared";
import { MILESTONE_BY_ID, MILESTONES } from "@dynasty/shared";

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

export type MilestoneTickResult = { log: string[]; paused: boolean };

// Historical milestones (Section 6's last bullet). Flat milestones apply
// immediately and need no player input beyond the log entry itself
// standing in for the spec's "acknowledgment click". Branching milestones
// set character.pendingMilestone and pause the turn - advanceYear stops
// processing for that call, and /turn/:slotIndex/advance refuses to run
// again until resolveMilestone (below) clears it via the
// /turn/:slotIndex/resolve-milestone route.
export function tickMilestones(c: Character, dynasty: Dynasty): MilestoneTickResult {
  const milestone = MILESTONES.find((m) => m.year === c.year && !dynasty.firedMilestones.includes(m.id));
  if (!milestone) return { log: [], paused: false };

  if (!milestone.branching) {
    dynasty.firedMilestones.push(milestone.id);
    dynasty.nationPower = clamp(dynasty.nationPower + milestone.nationPowerDelta, 0, 100);
    dynasty.eventTicker.push({ year: c.year, text: `${milestone.label}: ${milestone.description}` });
    if (dynasty.eventTicker.length > 150) dynasty.eventTicker.shift();
    return { log: [`${milestone.label}. ${milestone.description}`], paused: false };
  }

  c.pendingMilestone = {
    id: milestone.id,
    label: milestone.label,
    description: milestone.description,
    choices: milestone.choices.map((ch) => ({ id: ch.id, label: ch.label, description: ch.description })),
  };
  return { log: [`${milestone.label}. ${milestone.description}`], paused: true };
}

export type ResolveResult = { log: string[]; success: boolean };

export function resolveMilestone(c: Character, dynasty: Dynasty, choiceId: string): ResolveResult {
  if (!c.pendingMilestone) return { log: ["No pending milestone to resolve."], success: false };
  const milestone = MILESTONE_BY_ID[c.pendingMilestone.id];
  if (!milestone || !milestone.branching) return { log: ["Invalid pending milestone."], success: false };
  const choice = milestone.choices.find((ch) => ch.id === choiceId);
  if (!choice) return { log: ["No such choice."], success: false };

  dynasty.firedMilestones.push(milestone.id);
  dynasty.nationPower = clamp(dynasty.nationPower + choice.nationPowerDelta, 0, 100);
  if (choice.statDelta.influence) c.stats.influence = clamp(c.stats.influence + choice.statDelta.influence);
  if (choice.statDelta.skill) c.stats.skill = clamp(c.stats.skill + choice.statDelta.skill);
  if (choice.statDelta.wealth) c.stats.wealth = clamp(c.stats.wealth + choice.statDelta.wealth, 0, 999);
  if (choice.statDelta.health) c.stats.health = clamp(c.stats.health + choice.statDelta.health);
  if (choice.statDelta.popularity) c.stats.popularity = clamp(c.stats.popularity + choice.statDelta.popularity);

  dynasty.eventTicker.push({ year: c.year, text: `${milestone.label}: chose to "${choice.label}".` });
  if (dynasty.eventTicker.length > 150) dynasty.eventTicker.shift();
  c.pendingMilestone = null;
  c.log.push({ age: c.age, year: c.year, text: `${milestone.label}: chose to ${choice.label.toLowerCase()}.` });

  return { log: [`Chose to ${choice.label.toLowerCase()}.`], success: true };
}
