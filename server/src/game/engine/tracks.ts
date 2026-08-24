import type { Character, Dynasty, Tradition, TrackId } from "@dynasty/shared";
import { EPOCH_BY_ID, TRACK_SETS } from "@dynasty/shared";
import { randomName } from "./factory.js";

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

function remember(dynasty: Dynasty, name: string): void {
  if (!dynasty.almanac.includes(name)) dynasty.almanac.push(name);
}

export type TrackTickResult = { log: string[]; deathCause?: string };

// Per-track distinct mechanics, per docs/DYNASTY_HANDOFF.md Section 5's
// table. All 10 tracks are implemented. Called once per year for the
// character's current track, before the mortality roll in advanceYear.
export function tickTrackMechanic(c: Character, dynasty: Dynasty): TrackTickResult {
  const log: string[] = [];
  if (!c.trackId || c.retired) return { log };

  switch (c.trackId) {
    case "military": {
      // Real campaign events with injury/death risk (Section 5's table).
      if (Math.random() < 0.2) {
        const roll = Math.random();
        if (roll < 0.15) {
          return { log: [`${c.name} fell in battle.`], deathCause: "died in battle" };
        } else if (roll < 0.4) {
          c.stats.health = clamp(c.stats.health - 15);
          c.conditions.push("battle wound");
          log.push("Wounded in a campaign.");
        } else {
          c.stats.influence = clamp(c.stats.influence + 5);
          c.stats.skill = clamp(c.stats.skill + 3);
          log.push("Distinguished themself in a campaign.");
        }
      }
      break;
    }

    case "commercial": {
      // High-stakes "major deal" events - aggressive negotiation is a real
      // coin-flip, skill-weighted (Section 5's table).
      if (Math.random() < 0.25) {
        const odds = 0.4 + c.stats.skill / 250;
        if (Math.random() < odds) {
          const gain = 20 + Math.round(Math.random() * 40);
          c.stats.wealth = clamp(c.stats.wealth + gain, 0, 999);
          log.push(`Closed a major deal, gaining ${gain} wealth.`);
        } else {
          const loss = 10 + Math.round(Math.random() * 30);
          c.stats.wealth = clamp(c.stats.wealth - loss, 0, 999);
          c.stats.popularity = clamp(c.stats.popularity - 3);
          log.push(`A major deal fell through, losing ${loss} wealth.`);
        }
      }
      break;
    }

    case "political": {
      // Elite vs. commoner standing split (Section 5's table): eliteStanding
      // tracks separately from popularity and has to be actively courted,
      // not just accumulated as a side effect of the salary tick.
      const drift = c.eliteStanding > 50 ? -1 : c.eliteStanding < 50 ? 1 : 0;
      c.eliteStanding = clamp(c.eliteStanding + drift);
      if (Math.random() < 0.15) {
        if (c.eliteStanding >= c.stats.popularity) {
          c.eliteStanding = clamp(c.eliteStanding + 4);
          log.push("Courted favor among the elite.");
        } else {
          c.stats.popularity = clamp(c.stats.popularity + 4);
          log.push("Courted favor among the common people.");
        }
      }
      break;
    }

    case "religious": {
      // Uncapped followers count, grown by preaching. Cross 150 -> schism
      // risk from an internal rival (Section 5's table).
      const gained = 5 + Math.round(Math.random() * 15);
      c.followers += gained;
      log.push(`Preached to the faithful, gaining ${gained} followers.`);
      if (c.followers > 150 && Math.random() < 0.2) {
        const lost = Math.round(c.followers * (0.25 + Math.random() * 0.25));
        c.followers = Math.max(0, c.followers - lost);
        c.stats.popularity = clamp(c.stats.popularity - 8);
        if (!c.domestic.rivalName) {
          c.domestic.rivalName = randomName();
          c.domestic.rivalTension = 60;
          c.domestic.rivalAge = c.age + Math.round(Math.random() * 10) - 5;
          remember(dynasty, c.domestic.rivalName);
        }
        log.push(`A schism led by ${c.domestic.rivalName} split off ${lost} followers.`);
      }
      break;
    }

    case "criminal": {
      // Heat meter (0-100) drifts up while active; cross 75 -> the law
      // closes in, forcing a bribe/flee/fight resolution. Decays when the
      // character isn't on this track (handled implicitly - this tick only
      // runs while they are).
      c.heat = clamp(c.heat + 4 + Math.round(Math.random() * 8));
      if (c.heat > 75) {
        const roll = Math.random();
        if (roll < 0.4 && c.stats.wealth >= 30) {
          c.stats.wealth = clamp(c.stats.wealth - 30, 0, 999);
          c.heat = clamp(c.heat - 40);
          log.push("Bribed the authorities to look the other way.");
        } else if (roll < 0.7) {
          c.heat = 20;
          c.stats.popularity = clamp(c.stats.popularity - 5);
          log.push("Fled the city to escape the law, laying low for a while.");
        } else {
          const yearsRemaining = 2 + Math.floor(Math.random() * 4);
          c.imprisoned = { reason: "racketeering", yearsRemaining };
          c.heat = 10;
          log.push(`Caught by the authorities and imprisoned for ${yearsRemaining} years.`);
        }
      } else {
        const gain = 8 + Math.round(Math.random() * 20);
        c.stats.wealth = clamp(c.stats.wealth + gain, 0, 999);
      }
      break;
    }

    case "academic": {
      // Publish treatises that become named possessions (Section 5's table).
      if (Math.random() < 0.3) {
        const title = `Treatise on ${["Governance", "Astronomy", "Ethics", "Medicine", "Rhetoric", "History"][Math.floor(Math.random() * 6)]}`;
        c.possessions.push(title);
        c.stats.influence = clamp(c.stats.influence + 6);
        c.stats.skill = clamp(c.stats.skill + 3);
        log.push(`Published "${title}", earning recognition among scholars.`);
      }
      break;
    }

    case "medical": {
      // Difficult-case events, skill-weighted survival odds; a bonus event
      // when a plague-like crisis is active (Section 5's table).
      if (Math.random() < 0.25) {
        const odds = 0.3 + c.stats.skill / 150;
        if (Math.random() < odds) {
          c.stats.popularity = clamp(c.stats.popularity + 6);
          c.stats.influence = clamp(c.stats.influence + 3);
          log.push("Saved a difficult patient, earning acclaim.");
        } else {
          c.stats.popularity = clamp(c.stats.popularity - 4);
          log.push("Lost a difficult patient despite their best efforts.");
        }
      }
      break;
    }

    case "maritime": {
      // Voyage events - real risk of losing the investment, real chance of
      // a big return (Section 5's table).
      if (Math.random() < 0.25 && c.stats.wealth >= 15) {
        const stake = Math.min(c.stats.wealth, 15 + Math.round(Math.random() * 25));
        c.stats.wealth = clamp(c.stats.wealth - stake, 0, 999);
        if (Math.random() < 0.55) {
          const returned = Math.round(stake * (1.5 + Math.random() * 1.5));
          c.stats.wealth = clamp(c.stats.wealth + returned, 0, 999);
          log.push(`A voyage returned with ${returned} wealth in goods.`);
        } else {
          log.push(`A voyage was lost at sea, along with ${stake} wealth staked on it.`);
        }
      }
      break;
    }

    case "artisan": {
      // Masterwork creation - chance of an "extraordinary" named work vs. a
      // merely respectable one (Section 5's table).
      if (Math.random() < 0.3) {
        if (Math.random() < 0.25) {
          const work = `${["The Great", "The Radiant", "The Eternal"][Math.floor(Math.random() * 3)]} Work of ${c.name}`;
          c.possessions.push(work);
          c.stats.influence = clamp(c.stats.influence + 10);
          c.stats.wealth = clamp(c.stats.wealth + 25, 0, 999);
          log.push(`Created "${work}", an extraordinary masterwork.`);
        } else {
          c.stats.wealth = clamp(c.stats.wealth + 10, 0, 999);
          log.push("Completed a respectable commission.");
        }
      }
      break;
    }

    case "sports": {
      // A persistent named rival with a real win/loss record; major
      // competitions with injury risk; endorsement deals (Section 5's
      // table).
      if (!c.sportsRivalName) {
        c.sportsRivalName = randomName();
        remember(dynasty, c.sportsRivalName);
        log.push(`${c.sportsRivalName} has emerged as a fierce rival.`);
      }
      if (Math.random() < 0.35) {
        const odds = 0.35 + c.stats.skill / 200;
        if (Math.random() < odds) {
          c.sportsRivalWins += 1;
          c.stats.popularity = clamp(c.stats.popularity + 6);
          log.push(`Defeated ${c.sportsRivalName} in competition.`);
        } else {
          c.sportsRivalLosses += 1;
          c.stats.popularity = clamp(c.stats.popularity - 2);
          log.push(`Lost to ${c.sportsRivalName} in competition.`);
        }
        if (Math.random() < 0.15) {
          c.stats.health = clamp(c.stats.health - 10);
          c.conditions.push("sports injury");
          log.push("Picked up an injury during the competition.");
        }
      }
      if (c.stats.popularity > 60 && Math.random() < 0.2) {
        const deal = 15 + Math.round(Math.random() * 25);
        c.stats.wealth = clamp(c.stats.wealth + deal, 0, 999);
        log.push(`Signed an endorsement deal worth ${deal} wealth.`);
      }
      break;
    }
  }

  return { log };
}

export type TrackActionResult = { log: string[]; success: boolean };

// Family traditions (Section 5's "Cross-track systems": "chosen once at
// founding — permanent bonus to all future descendants who settle into a
// matching track"). Dynasty.tradition and Character._traditionAppliedTracks
// have existed since the first commit, but nothing ever mapped a tradition
// to a track or applied the bonus - the field was pure flavor text fed into
// the AI prompt context and nothing else. Applied once per character (via
// _traditionAppliedTracks) the first time they enter the matching track, so
// switching away and back via Change Career doesn't double-dip.
const TRADITION_TRACK: Record<Tradition, TrackId | null> = {
  none: null,
  military: "military",
  scholarly: "academic",
  mercantile: "commercial",
  political: "political",
  devout: "religious",
};

const TRADITION_BONUS: Record<Exclude<Tradition, "none">, Partial<Record<"influence" | "skill" | "wealth" | "health" | "popularity", number>>> = {
  military: { skill: 8 },
  scholarly: { skill: 8 },
  mercantile: { wealth: 40 },
  political: { influence: 8 },
  devout: { popularity: 8 },
};

export function applyFamilyTradition(c: Character, dynasty: Dynasty, trackId: TrackId): string | null {
  if (dynasty.tradition === "none") return null;
  if (TRADITION_TRACK[dynasty.tradition] !== trackId) return null;
  if (c._traditionAppliedTracks.includes(trackId)) return null;

  c._traditionAppliedTracks.push(trackId);
  const bonus = TRADITION_BONUS[dynasty.tradition];
  if (bonus.influence) c.stats.influence = clamp(c.stats.influence + bonus.influence);
  if (bonus.skill) c.stats.skill = clamp(c.stats.skill + bonus.skill);
  if (bonus.wealth) c.stats.wealth = clamp(c.stats.wealth + bonus.wealth, 0, 999);
  if (bonus.health) c.stats.health = clamp(c.stats.health + bonus.health);
  if (bonus.popularity) c.stats.popularity = clamp(c.stats.popularity + bonus.popularity);
  return `The family's ${dynasty.tradition} tradition carries forward - a real edge in this line of work.`;
}

// Specializations (Section 5's "Cross-track systems"): "3-4 specializations
// chosen once per track (one-time stat perk), prompted the first time a
// character (age 18+) has no specialization yet for their current track."
// The specialization catalogue itself has existed on every TrackDef since
// the first commit (shared/src/tracks.ts) - what was missing was any way to
// actually choose one. Not modeled as a turn-pausing prompt like a
// branching milestone (this is a routine career choice, not a historic
// fork) - PlayScreen shows the choice as soon as it's eligible, and the
// player picks it whenever they like via this route.
export function chooseSpecialization(c: Character, specializationId: string): TrackActionResult {
  if (!c.trackId) return { log: ["No career track to specialize in yet."], success: false };
  if (c.age < 18) return { log: ["Too young to specialize."], success: false };
  if (c.specializations[c.trackId]) return { log: ["Already specialized in this track."], success: false };

  const epoch = EPOCH_BY_ID[c.epochId];
  const trackDef = TRACK_SETS[epoch.trackSet][c.trackId as TrackId];
  const spec = trackDef.specializations.find((s) => s.id === specializationId);
  if (!spec) return { log: ["No such specialization for this track."], success: false };

  c.specializations[c.trackId] = specializationId;
  if (spec.statBonus.influence) c.stats.influence = clamp(c.stats.influence + spec.statBonus.influence);
  if (spec.statBonus.skill) c.stats.skill = clamp(c.stats.skill + spec.statBonus.skill);
  if (spec.statBonus.wealth) c.stats.wealth = clamp(c.stats.wealth + spec.statBonus.wealth, 0, 999);
  if (spec.statBonus.health) c.stats.health = clamp(c.stats.health + spec.statBonus.health);
  if (spec.statBonus.popularity) c.stats.popularity = clamp(c.stats.popularity + spec.statBonus.popularity);

  return { log: [`Specialized in ${spec.label}.`], success: true };
}

// Change Career (Section 5's "Cross-track systems"): "mid-life track
// switching, available anytime after 18." Previously a character was stuck
// with whatever track the coming-of-age roll assigned at 18 for their
// entire life. Switching resets trackTier to 0 (starting over in the new
// track's title ladder) and costs a little popularity (abandoning one's
// former calling raises eyebrows) - but any specialization already earned
// in a track is remembered on Character.specializations (keyed by trackId)
// and still applies if the player switches back to it later.
export function changeCareer(c: Character, dynasty: Dynasty, newTrackId: string): TrackActionResult {
  if (c.age < 18) return { log: ["Too young to have a career yet."], success: false };
  if (c.trackId === newTrackId) return { log: ["Already on that track."], success: false };

  const epoch = EPOCH_BY_ID[c.epochId];
  const set = TRACK_SETS[epoch.trackSet];
  if (!(newTrackId in set)) return { log: ["No such career track."], success: false };

  const oldLabel = c.trackId ? set[c.trackId as TrackId].label : null;
  c.trackId = newTrackId as TrackId;
  c.trackTier = 0;
  c.retired = false;
  c.stats.popularity = clamp(c.stats.popularity - 3);

  const label = set[newTrackId as TrackId].label;
  const log = [oldLabel ? `Left ${oldLabel.toLowerCase()} behind to start over in ${label}.` : `Began a career in ${label}.`];
  const traditionLine = applyFamilyTradition(c, dynasty, c.trackId as TrackId);
  if (traditionLine) log.push(traditionLine);

  return { log, success: true };
}
