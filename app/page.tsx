"use client";

import { useEffect, useMemo, useState } from "react";

type Team = "ally" | "enemy";
type BuiltinEffectType = "speed" | "damageTaken" | "damageDealt" | "stun";
type EffectType = BuiltinEffectType | keyof Stats | string;
type SkillKind = "damage" | "heal" | "buff" | "penetration";
type SkillTarget = "enemy" | "ally" | "self" | "any" | "enemyAll";

type Stats = {
  str: number;
  int: number;
  wis: number;
  dex: number;
  acc: number;
  con: number;
};

type Effect = {
  id: string;
  name: string;
  type: EffectType;
  value: number;
  flatValue: number;
  remainingTurns: number;
};

type Skill = {
  id: string;
  name: string;
  target: SkillTarget;
  kind: SkillKind;
  formula: string;
  cooldown: number;
  currentCooldown: number;
  effectType: EffectType | "none";
  description: string;
  weaponId: string;
};

type JobPassive = {
  id: string;
  description: string;
  target: keyof Stats | "speed";
  formula: string;
};

type Weapon = {
  id: string;
  name: string;
  bonusStats: Partial<Stats> & { speed?: number };
  skillIds: string[];
};

type Job = {
  id: string;
  name: string;
  bonusStats: Stats;
  passives: JobPassive[];
  skillIds: string[];
};

type Unit = {
  id: string;
  name: string;
  team: Team;
  hp: number;
  maxHp: number;
  speed: number;
  baseStats: Stats;
  jobId: string;
  skillIds: string[];
  equippedWeaponId: string;
  effects: Effect[];
  actionDone: boolean;
};

const statKeys: Array<keyof Stats> = ["str", "int", "wis", "dex", "acc", "con"];
const statLabels: Record<keyof Stats, string> = {
  str: "근력",
  int: "지력",
  wis: "지혜",
  dex: "민첩",
  acc: "정밀",
  con: "건강",
};

const effectTypeLabels: Record<string, string> = {
  speed: "속도",
  damageDealt: "입히는 피해",
  damageTaken: "받는 피해",
  stun: "스턴",
  str: "근력",
  int: "지력",
  wis: "지혜",
  dex: "민첩",
  acc: "정밀",
  con: "건강",
};

const skillKindLabels: Record<SkillKind, string> = {
  damage: "피해",
  penetration: "관통 피해",
  heal: "회복",
  buff: "버프",
};

const formulaTokenMap: Record<string, keyof Stats | "hp" | "maxHp" | "targethp" | "targetmaxhp"> = {
  str: "str",
  int: "int",
  wis: "wis",
  dex: "dex",
  acc: "acc",
  con: "con",
  근력: "str",
  지력: "int",
  지혜: "wis",
  민첩: "dex",
  정밀: "acc",
  건강: "con",
  hp: "hp",
  maxHp: "maxHp",
  targethp: "targethp",
  targetmaxhp: "targetmaxhp",
};

const makeId = () => crypto.randomUUID();

const defaultWeapons: Weapon[] = [
  {
    id: makeId(),
    name: "기본 검",
    bonusStats: { str: 2, dex: 1 },
    skillIds: [],
  },
];

const defaultJobs: Job[] = [
  {
    id: makeId(),
    name: "Warrior",
    bonusStats: { str: 3, int: 0, wis: 0, dex: 1, acc: 1, con: 2 },
    passives: [
      { id: makeId(), description: "근력 증가", target: "str", formula: "2" },
      { id: makeId(), description: "건강 증가", target: "con", formula: "1" },
    ],
    skillIds: [],
  },
  {
    id: makeId(),
    name: "Mage",
    bonusStats: { str: 0, int: 2, wis: 3, dex: 0, acc: 1, con: 0 },
    passives: [
      { id: makeId(), description: "지력 증가", target: "int", formula: "1" },
      { id: makeId(), description: "지혜 증가", target: "wis", formula: "1" },
    ],
    skillIds: [],
  },
  {
    id: makeId(),
    name: "Rogue",
    bonusStats: { str: 1, int: 0, wis: 0, dex: 3, acc: 2, con: 0 },
    passives: [
      { id: makeId(), description: "민첩 증가", target: "dex", formula: "1" },
    ],
    skillIds: [],
  },
  {
    id: makeId(),
    name: "몬스터",
    bonusStats: { str: 1, int: 0, wis: 0, dex: 0, acc: 0, con: 1 },
    passives: [],
    skillIds: [],
  },
];

const defaultSkills: Skill[] = [
  {
    id: makeId(),
    name: "천상검격",
    target: "enemy",
    kind: "damage",
    formula: "[str] * 3 + 5",
    cooldown: 0,
    currentCooldown: 0,
    effectType: "none",
    description: "근력 기반 피해 스킬",
    weaponId: "",
  },
  {
    id: makeId(),
    name: "관통의 일격",
    target: "enemy",
    kind: "penetration",
    formula: "[str] * 2 + 10",
    cooldown: 2,
    currentCooldown: 0,
    effectType: "none",
    description: "버프/디버프 영향을 받지 않는 고정 피해",
    weaponId: "",
  },
  {
    id: makeId(),
    name: "붕괴의 파동",
    target: "enemyAll",
    kind: "damage",
    formula: "[str] * 2 + 6",
    cooldown: 3,
    currentCooldown: 0,
    effectType: "none",
    description: "적 전체에게 피해를 나눠 입힙니다",
    weaponId: "",
  },
  {
    id: makeId(),
    name: "회복의 손길",
    target: "ally",
    kind: "heal",
    formula: "[wis] * 2 + 8",
    cooldown: 1,
    currentCooldown: 0,
    effectType: "none",
    description: "지혜 기반 회복 스킬",
    weaponId: "",
  },
  {
    id: makeId(),
    name: "전속력 돌진",
    target: "self",
    kind: "buff",
    formula: "2",
    cooldown: 3,
    currentCooldown: 0,
    effectType: "speed",
    description: "자신의 행동속도 증가",
    weaponId: "",
  },
];

const defaultUnits: Unit[] = [
  {
    id: makeId(),
    name: "아군1",
    team: "ally",
    hp: 45,
    maxHp: 60,
    speed: 12,
    baseStats: { str: 8, int: 4, wis: 5, dex: 7, acc: 6, con: 5 },
    jobId: defaultJobs[0].id,
    skillIds: [defaultSkills[0].id, defaultSkills[1].id],
    equippedWeaponId: defaultWeapons[0].id,
    effects: [],
    actionDone: false,
  },
  {
    id: makeId(),
    name: "적1",
    team: "enemy",
    hp: 50,
    maxHp: 50,
    speed: 9,
    baseStats: { str: 7, int: 0, wis: 2, dex: 5, acc: 5, con: 4 },
    jobId: defaultJobs[2].id,
    skillIds: [defaultSkills[0].id],
    equippedWeaponId: "",
    effects: [],
    actionDone: false,
  },
];

const initialActionState = {
  selectedSkillId: defaultSkills[0].id,
  selectedTargetId: defaultUnits[1].id,
};

const defaultNewSkill = {
  name: "",
  target: "enemy" as SkillTarget,
  kind: "damage" as SkillKind,
  formula: "[str] * 2 + 5",
  cooldown: 0,
  effectType: "none" as EffectType | "none",
  description: "",
  weaponId: "",
};

const defaultNewWeapon = {
  name: "",
  bonusStats: { str: 0, int: 0, wis: 0, dex: 0, acc: 0, con: 0, speed: 0 },
  skillIds: [] as string[],
};

const defaultNewPassive: JobPassive = {
  id: "",
  description: "",
  target: "str",
  formula: "0",
};

const defaultNewJob = {
  name: "",
  bonusStats: { str: 0, int: 0, wis: 0, dex: 0, acc: 0, con: 0 },
  passives: [] as JobPassive[],
};

const defaultNewEffect = {
  name: "",
  type: "speed" as EffectType,
  value: 1,
  flatValue: 0,
  remainingTurns: 2,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function evaluateFormula(
  formula: string,
  source: { [key: string]: number },
  target: { [key: string]: number }
) {
  const sanitized = formula.replace(/\[([^\]]+)\]/g, (_, token) => {
    const lookup = formulaTokenMap[token] ?? formulaTokenMap[token.toLowerCase()];
    if (!lookup) return "0";
    const value = lookup in source ? source[lookup] : target[lookup as string] ?? 0;
    return String(value);
  });

  try {
    // eslint-disable-next-line no-new-func
    const result = new Function(`return (${sanitized})`)();
    return Number.isFinite(result) ? Math.max(0, Math.floor(result)) : 0;
  } catch {
    return 0;
  }
}

export default function Page() {
  const STORAGE_KEY = "my-trpg-state-v1";

  const [units, setUnits] = useState<Unit[]>(defaultUnits);
  const [skills, setSkills] = useState<Skill[]>(defaultSkills);
  const [jobs, setJobs] = useState<Job[]>(defaultJobs);
  const [weapons, setWeapons] = useState<Weapon[]>(defaultWeapons);
  const [turnCount, setTurnCount] = useState(1);
  const [actionState, setActionState] = useState(initialActionState);
  const [newSkill, setNewSkill] = useState(defaultNewSkill);
  const [newWeapon, setNewWeapon] = useState(defaultNewWeapon);
  const [newSkillCustomEffectType, setNewSkillCustomEffectType] = useState("");
  const [newJob, setNewJob] = useState(defaultNewJob);
  const [newJobPassive, setNewJobPassive] = useState<JobPassive>(defaultNewPassive);
  const [selectedJobPassive, setSelectedJobPassive] = useState<JobPassive>(defaultNewPassive);
  const [newEffect, setNewEffect] = useState(defaultNewEffect);
  const [newEffectTypeChoice, setNewEffectTypeChoice] = useState<EffectType | "custom">("speed");
  const [newEffectCustomType, setNewEffectCustomType] = useState("");
  const [selectedEffectUnitId, setSelectedEffectUnitId] = useState<string>(defaultUnits[0]?.id ?? "");
  const [selectedEffectId, setSelectedEffectId] = useState<string>("new");
  const [selectedEditableUnitId, setSelectedEditableUnitId] = useState<string>(defaultUnits[0]?.id ?? "");
  const [selectedJobId, setSelectedJobId] = useState<string>(defaultJobs[0]?.id ?? "");
  const [jobSkillToAddId, setJobSkillToAddId] = useState<string>(defaultSkills[0]?.id ?? "");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const stored = JSON.parse(raw) as { units: Unit[]; skills: Skill[]; jobs: Job[]; weapons: Weapon[]; turnCount: number };
      if (stored.units) setUnits(stored.units);
      if (stored.skills) setSkills(stored.skills);
      if (stored.jobs) setJobs(stored.jobs);
      if (stored.weapons) setWeapons(stored.weapons);
      if (typeof stored.turnCount === "number") setTurnCount(stored.turnCount);
    } catch {
      // ignore invalid stored data
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const data = JSON.stringify({ units, skills, jobs, weapons, turnCount });
    window.localStorage.setItem(STORAGE_KEY, data);
  }, [units, skills, jobs, weapons, turnCount]);

  useEffect(() => {
    if (actionState.selectedSkillId && !skills.some((skill) => skill.id === actionState.selectedSkillId)) {
      setActionState((prev) => ({ ...prev, selectedSkillId: skills[0]?.id ?? "" }));
    }
    if (actionState.selectedTargetId && !units.some((unit) => unit.id === actionState.selectedTargetId)) {
      setActionState((prev) => ({ ...prev, selectedTargetId: units[0]?.id ?? "" }));
    }
  }, [skills, units, actionState.selectedSkillId, actionState.selectedTargetId]);

  useEffect(() => {
    if (!units.some((unit) => unit.id === selectedEditableUnitId && unit.team === "ally")) {
      setSelectedEditableUnitId(units.find((unit) => unit.team === "ally")?.id ?? units[0]?.id ?? "");
    }
  }, [units, selectedEditableUnitId]);

  useEffect(() => {
    if (!jobs.some((job) => job.id === selectedJobId)) {
      setSelectedJobId(jobs[0]?.id ?? "");
    }
  }, [jobs, selectedJobId]);

  useEffect(() => {
    if (!skills.some((skill) => skill.id === jobSkillToAddId)) {
      setJobSkillToAddId(skills[0]?.id ?? "");
    }
  }, [skills, jobSkillToAddId]);

  const effectiveUnits = useMemo(() => {
    return units.map((unit) => {
      const job = jobs.find((jobItem) => jobItem.id === unit.jobId);
      const weapon = weapons.find((weaponItem) => weaponItem.id === unit.equippedWeaponId);
      const bonusStats = job?.bonusStats ?? { str: 0, int: 0, wis: 0, dex: 0, acc: 0, con: 0 };
      const weaponBonusStats = weapon?.bonusStats ?? {};
      const sourceValues = {
        ...unit.baseStats,
        ...bonusStats,
        ...weaponBonusStats,
        hp: unit.hp,
        maxHp: unit.maxHp,
        speed: unit.speed + (weaponBonusStats.speed ?? 0),
      };
      const passiveTotals = (job?.passives ?? []).reduce(
        (totals, passive) => {
          const value = evaluateFormula(passive.formula || "0", sourceValues, {});
          if (passive.target === "speed") {
            return { ...totals, speed: totals.speed + value };
          }
          return { ...totals, [passive.target]: (totals[passive.target] ?? 0) + value };
        },
        { speed: 0 } as Record<string, number>
      );
      const speedPercent = unit.effects.reduce(
        (sum, effect) => (effect.type === "speed" ? sum + effect.value : sum),
        0
      );
      const speedFlat = unit.effects.reduce(
        (sum, effect) => (effect.type === "speed" ? sum + (effect.flatValue ?? 0) : sum),
        0
      );
      const statEffects = unit.effects.reduce(
        (acc, effect) => {
          if (statKeys.includes(effect.type as keyof Stats)) {
            const key = effect.type as keyof Stats;
            return {
              ...acc,
              [key]: (acc[key] ?? 0) + effect.value + (effect.flatValue ?? 0),
            };
          }
          return acc;
        },
        {} as Record<keyof Stats, number>
      );
      const stats: Stats = {
        str: unit.baseStats.str + bonusStats.str + (weaponBonusStats.str ?? 0) + (statEffects.str ?? 0),
        int: unit.baseStats.int + bonusStats.int + (weaponBonusStats.int ?? 0) + (statEffects.int ?? 0),
        wis: unit.baseStats.wis + bonusStats.wis + (weaponBonusStats.wis ?? 0) + (statEffects.wis ?? 0),
        dex: unit.baseStats.dex + bonusStats.dex + (weaponBonusStats.dex ?? 0) + (statEffects.dex ?? 0),
        acc: unit.baseStats.acc + bonusStats.acc + (weaponBonusStats.acc ?? 0) + (statEffects.acc ?? 0),
        con: unit.baseStats.con + bonusStats.con + (weaponBonusStats.con ?? 0) + (statEffects.con ?? 0),
      };
      const effectiveStats: Stats = {
        ...stats,
        str: stats.str + (passiveTotals.str ?? 0),
        int: stats.int + (passiveTotals.int ?? 0),
        wis: stats.wis + (passiveTotals.wis ?? 0),
        dex: stats.dex + (passiveTotals.dex ?? 0),
        acc: stats.acc + (passiveTotals.acc ?? 0),
        con: stats.con + (passiveTotals.con ?? 0),
      };
      const effectiveSpeed = Math.max(
        0,
        Math.floor(
          (unit.speed + (passiveTotals.speed ?? 0) + (weaponBonusStats.speed ?? 0)) * (1 + speedPercent / 100)
        )
      );
      const isStunned = unit.effects.some((effect) => effect.type === "stun");
      return {
        ...unit,
        effectiveSpeed,
        effectiveStats,
        job: job,
        isStunned,
        effectiveSkillIds: Array.from(
          new Set([
            ...(unit.skillIds ?? []),
            ...(job?.skillIds ?? []),
            ...(weapon?.skillIds ?? []),
          ])
        ),
      };
    });
  }, [units, jobs, weapons]);

  const initiativeOrder = useMemo(() => {
    return [...effectiveUnits]
      .filter((unit) => unit.hp > 0)
      .sort((a, b) => {
        if (b.effectiveSpeed !== a.effectiveSpeed) return b.effectiveSpeed - a.effectiveSpeed;
        if (a.team !== b.team) return a.team === "ally" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [effectiveUnits]);

  const currentUnit = useMemo(() => {
    return initiativeOrder.find((unit) => !unit.actionDone && !unit.isStunned) ?? initiativeOrder.find((unit) => !unit.actionDone) ?? initiativeOrder[0];
  }, [initiativeOrder]);

  const activeUnitId = currentUnit?.id;

  const updateUnit = (id: string, patch: Partial<Unit>) => {
    setUnits((prev) => prev.map((unit) => (unit.id === id ? { ...unit, ...patch } : unit)));
  };

  const updateEffect = (unitId: string, effectId: string, patch: Partial<Effect>) => {
    setUnits((prev) =>
      prev.map((unit) => {
        if (unit.id !== unitId) return unit;
        return {
          ...unit,
          effects: unit.effects.map((effect) =>
            effect.id === effectId ? { ...effect, ...patch } : effect
          ),
        };
      })
    );
  };

  const addEffectToUnit = (unitId: string, effect: Omit<Effect, "id">) => {
    setUnits((prev) =>
      prev.map((unit) =>
        unit.id === unitId
          ? { ...unit, effects: [...unit.effects, { ...effect, id: makeId() }] }
          : unit
      )
    );
  };

  const removeEffectFromUnit = (unitId: string, effectId: string) => {
    setUnits((prev) =>
      prev.map((unit) =>
        unit.id === unitId
          ? { ...unit, effects: unit.effects.filter((effect) => effect.id !== effectId) }
          : unit
      )
    );
  };

  const selectedEffectUnit = useMemo(
    () => units.find((unit) => unit.id === selectedEffectUnitId),
    [units, selectedEffectUnitId]
  );

  const selectedEffect = useMemo(
    () => selectedEffectUnit?.effects.find((effect) => effect.id === selectedEffectId),
    [selectedEffectUnit, selectedEffectId]
  );

  useEffect(() => {
    if (selectedEffect) {
      setNewEffect({
        name: selectedEffect.name,
        type: selectedEffect.type,
        value: selectedEffect.value,
        flatValue: selectedEffect.flatValue,
        remainingTurns: selectedEffect.remainingTurns,
      });
      if (["speed", "damageDealt", "damageTaken", "stun", "str", "int", "wis", "dex", "acc", "con"].includes(selectedEffect.type as string)) {
        setNewEffectTypeChoice(selectedEffect.type as EffectType);
        setNewEffectCustomType("");
      } else {
        setNewEffectTypeChoice("custom");
        setNewEffectCustomType(selectedEffect.type as string);
      }
    } else {
      setNewEffect(defaultNewEffect);
      setNewEffectTypeChoice("speed");
      setNewEffectCustomType("");
    }
  }, [selectedEffect]);

  useEffect(() => {
    if (!selectedEffectUnit) {
      setSelectedEffectId("new");
    } else if (selectedEffectId !== "new" && !selectedEffectUnit.effects.some((effect) => effect.id === selectedEffectId)) {
      setSelectedEffectId("new");
    }
  }, [selectedEffectUnit, selectedEffectId]);

  const addUnit = (team: Team) => {
    const nextName = `${team === "ally" ? "아군" : "적"}${units.filter((unit) => unit.team === team).length + 1}`;
    const monsterJob = jobs.find((job) => job.name === "몬스터");
    const selectedJobId = team === "enemy" ? monsterJob?.id ?? jobs[0]?.id ?? "" : jobs[0]?.id ?? "";
    setUnits((prev) => [
      ...prev,
      {
        id: makeId(),
        name: nextName,
        team,
        hp: 40,
        maxHp: 50,
        speed: 8,
        baseStats: { str: 5, int: 5, wis: 5, dex: 5, acc: 5, con: 5 },
        jobId: selectedJobId,
        skillIds: skills.slice(0, 2).map((skill) => skill.id),
        equippedWeaponId: "",
        effects: [],
        actionDone: false,
      },
    ]);
  };

  const addSkill = () => {
    const created: Skill = {
      id: makeId(),
      name: newSkill.name || `스킬 ${skills.length + 1}`,
      target: newSkill.target,
      kind: newSkill.kind,
      formula: newSkill.formula,
      cooldown: clamp(newSkill.cooldown, 0, 10),
      currentCooldown: 0,
      effectType: newSkill.effectType,
      description: newSkill.description,
      weaponId: newSkill.weaponId,
    };
    setSkills((prev) => [...prev, created]);
    if (created.weaponId) {
      setWeapons((prev) =>
        prev.map((weapon) =>
          weapon.id === created.weaponId
            ? { ...weapon, skillIds: [...weapon.skillIds, created.id] }
            : weapon
        )
      );
    }
    setNewSkill(defaultNewSkill);
  };

  const addWeapon = () => {
    const created: Weapon = {
      id: makeId(),
      name: newWeapon.name || `무기 ${weapons.length + 1}`,
      bonusStats: { ...newWeapon.bonusStats },
      skillIds: [],
    };
    setWeapons((prev) => [...prev, created]);
    setNewWeapon(defaultNewWeapon);
  };

  const addJobPassive = () => {
    setNewJob((prev) => ({
      ...prev,
      passives: [...prev.passives, { ...newJobPassive, id: makeId() }],
    }));
    setNewJobPassive(defaultNewPassive);
  };

  const removeNewJobPassive = (passiveId: string) => {
    setNewJob((prev) => ({
      ...prev,
      passives: prev.passives.filter((passive) => passive.id !== passiveId),
    }));
  };

  const addJob = () => {
    const created: Job = {
      id: makeId(),
      name: newJob.name || `직업 ${jobs.length + 1}`,
      bonusStats: { ...newJob.bonusStats },
      passives: newJob.passives.map((passive) => ({ ...passive, id: makeId() })),
      skillIds: [],
    };
    setJobs((prev) => [...prev, created]);
    setSelectedJobId(created.id);
    setNewJob(defaultNewJob);
    setNewJobPassive(defaultNewPassive);
  };

  const addPassiveToJob = (jobId: string) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? { ...job, passives: [...job.passives, { ...selectedJobPassive, id: makeId() }] }
          : job
      )
    );
    setSelectedJobPassive(defaultNewPassive);
  };

  const removePassiveFromJob = (jobId: string, passiveId: string) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? { ...job, passives: job.passives.filter((passive) => passive.id !== passiveId) }
          : job
      )
    );
  };

  const assignSkillToUnit = (unitId: string, skillId: string) => {
    updateUnit(unitId, {
      skillIds: [...new Set([...(units.find((unit) => unit.id === unitId)?.skillIds ?? []), skillId])],
    });
  };

  const assignSkillToJob = (jobId: string, skillId: string) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? { ...job, skillIds: [...new Set([...job.skillIds, skillId])] }
          : job
      )
    );
  };

  const removeSkillFromJob = (jobId: string, skillId: string) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? { ...job, skillIds: job.skillIds.filter((id) => id !== skillId) }
          : job
      )
    );
  };

  const removeUnit = (unitId: string) => {
    setUnits((prev) => prev.filter((unit) => unit.id !== unitId));
  };

  const removeSkill = (skillId: string) => {
    setSkills((prevSkills) => {
      const nextSkills = prevSkills.filter((skill) => skill.id !== skillId);
      setActionState((prev) => ({
        ...prev,
        selectedSkillId: prev.selectedSkillId === skillId ? nextSkills[0]?.id ?? "" : prev.selectedSkillId,
      }));
      return nextSkills;
    });
    setUnits((prev) =>
      prev.map((unit) => ({
        ...unit,
        skillIds: unit.skillIds.filter((id) => id !== skillId),
      }))
    );
    setJobs((prev) =>
      prev.map((job) => ({
        ...job,
        skillIds: job.skillIds.filter((id) => id !== skillId),
      }))
    );
  };

  const removeWeapon = (weaponId: string) => {
    setWeapons((prevWeapons) => prevWeapons.filter((weapon) => weapon.id !== weaponId));
    setUnits((prevUnits) =>
      prevUnits.map((unit) =>
        unit.equippedWeaponId === weaponId ? { ...unit, equippedWeaponId: "" } : unit
      )
    );
  };

  const removeJob = (jobId: string) => {
    setJobs((prevJobs) => {
      const remaining = prevJobs.filter((job) => job.id !== jobId);
      setUnits((prevUnits) =>
        prevUnits.map((unit) => ({
          ...unit,
          jobId: unit.jobId === jobId ? remaining[0]?.id ?? "" : unit.jobId,
        }))
      );
      if (selectedJobId === jobId) {
        setSelectedJobId(remaining[0]?.id ?? "");
      }
      return remaining;
    });
  };

  const handleAction = () => {
    if (!activeUnitId) return;
    const source = effectiveUnits.find((unit) => unit.id === activeUnitId);
    if (!source) return;
    const skill = skills.find((item) => item.id === actionState.selectedSkillId);
    if (!skill) return;
    const target = units.find((unit) => unit.id === actionState.selectedTargetId);
    if (!target) return;
    if (skill.currentCooldown > 0) return;
    if (skill.target === "enemy" && source.team === target.team) return;
    if (skill.target === "ally" && source.team !== target.team) return;
    if (skill.target === "self" && target.id !== source.id) return;

    const sourceStats = source.effectiveStats;
    const targetStats = {
      ...target.baseStats,
      hp: target.hp,
      maxHp: target.maxHp,
    };
    const rawValue = evaluateFormula(skill.formula, {
      str: sourceStats.str,
      int: sourceStats.int,
      wis: sourceStats.wis,
      dex: sourceStats.dex,
      acc: sourceStats.acc,
      con: sourceStats.con,
      hp: source.hp,
      maxHp: source.maxHp,
      targethp: target.hp,
      targetmaxhp: target.maxHp,
    }, targetStats);

    const outgoingMultiplier = 1 + source.effects.reduce(
      (sum, effect) => (effect.type === "damageDealt" ? sum + effect.value : sum),
      0
    ) / 100;
    const incomingMultiplier = 1 + target.effects.reduce(
      (sum, effect) => (effect.type === "damageTaken" ? sum + effect.value : sum),
      0
    ) / 100;
    const outgoingFlat = source.effects.reduce(
      (sum, effect) => (effect.type === "damageDealt" ? sum + (effect.flatValue ?? 0) : sum),
      0
    );
    const incomingFlat = target.effects.reduce(
      (sum, effect) => (effect.type === "damageTaken" ? sum + (effect.flatValue ?? 0) : sum),
      0
    );
    const baseAmount = Math.max(
      0,
      Math.floor((rawValue + outgoingFlat + incomingFlat) * outgoingMultiplier * incomingMultiplier)
    );
    const amount = skill.kind === "penetration"
      ? Math.max(0, Math.floor(rawValue))
      : baseAmount;

    const enemyTargetIds = skill.target === "enemyAll"
      ? units.filter((unit) => unit.hp > 0 && unit.team !== source.team).map((unit) => unit.id)
      : [];
    const splitAmount = skill.target === "enemyAll" && enemyTargetIds.length > 0
      ? Math.floor(amount / enemyTargetIds.length)
      : amount;
    const remainder = skill.target === "enemyAll"
      ? amount - splitAmount * enemyTargetIds.length
      : 0;

    setUnits((currentUnits) =>
      currentUnits.map((unit) => {
        if (unit.id === source.id && (skill.kind === "damage" || skill.kind === "penetration")) {
          return unit;
        }

        if (skill.target === "enemyAll" && enemyTargetIds.includes(unit.id)) {
          const index = enemyTargetIds.indexOf(unit.id);
          const appliedAmount = splitAmount + (index < remainder ? 1 : 0);
          if (skill.kind === "damage" || skill.kind === "penetration") {
            return { ...unit, hp: clamp(unit.hp - appliedAmount, 0, unit.maxHp) };
          }
        }

        if (unit.id === target.id) {
          if (skill.kind === "damage") {
            return { ...unit, hp: clamp(unit.hp - amount, 0, unit.maxHp) };
          }
          if (skill.kind === "penetration") {
            return { ...unit, hp: clamp(unit.hp - amount, 0, unit.maxHp) };
          }
          if (skill.kind === "heal") {
            return { ...unit, hp: clamp(unit.hp + amount, 0, unit.maxHp) };
          }
          if (skill.kind === "buff") {
            return {
              ...unit,
              effects: [
                ...unit.effects,
                {
                  id: makeId(),
                  name: `${skill.name} 효과`,
                  type: skill.effectType === "none" ? "speed" : skill.effectType,
                  value: amount,
                  flatValue: 0,
                  remainingTurns: 2,
                },
              ],
            };
          }
        }
        return unit;
      })
    );

    setUnits((currentUnits) =>
      currentUnits.map((unit) =>
        unit.id === source.id
          ? {
              ...unit,
              actionDone: true,
              skillIds: unit.skillIds,
            }
          : unit
      )
    );

    setSkills((currentSkills) =>
      currentSkills.map((item) =>
        item.id === skill.id ? { ...item, currentCooldown: item.cooldown } : item
      )
    );
  };

  const passTurn = () => {
    if (!activeUnitId) return;
    setUnits((prev) =>
      prev.map((unit) =>
        unit.id === activeUnitId ? { ...unit, actionDone: true } : unit
      )
    );
  };

  const resetTurn = () => {
    setUnits((currentUnits) =>
      currentUnits.map((unit) => ({
        ...unit,
        actionDone: false,
        effects: unit.effects
          .map((effect) => ({ ...effect, remainingTurns: effect.remainingTurns - 1 }))
          .filter((effect) => effect.remainingTurns > 0),
      }))
    );
    setSkills((currentSkills) =>
      currentSkills.map((skill) => ({
        ...skill,
        currentCooldown: Math.max(0, skill.currentCooldown - 1),
      }))
    );
    setTurnCount((count) => count + 1);
  };

  const hasActiveAction = effectiveUnits.some((unit) => !unit.actionDone && unit.hp > 0 && !unit.isStunned);

  useEffect(() => {
    if (!hasActiveAction && initiativeOrder.length > 0) {
      resetTurn();
    }
  }, [hasActiveAction, initiativeOrder]);

  const selectedUnit = effectiveUnits.find((unit) => unit.id === activeUnitId);
  const editableUnit = effectiveUnits.find((unit) => unit.id === selectedEditableUnitId && unit.team === "ally");
  const selectedSkillObj = skills.find((s) => s.id === actionState.selectedSkillId);
  const validTargets = (() => {
    if (!selectedSkillObj || !selectedUnit) return units.filter((unit) => unit.hp > 0);
    const isDamageType = selectedSkillObj.kind === "damage" || selectedSkillObj.kind === "penetration";
    const baseTargets = (() => {
      if (selectedSkillObj.target === "self") return units.filter((unit) => unit.hp > 0 && unit.id === selectedUnit.id);
      if (selectedSkillObj.target === "ally") return units.filter((unit) => unit.hp > 0 && unit.team === selectedUnit.team);
      if (selectedSkillObj.target === "enemy" || selectedSkillObj.target === "enemyAll") return units.filter((unit) => unit.hp > 0 && unit.team !== selectedUnit.team);
      return units.filter((unit) => unit.hp > 0);
    })();
    return isDamageType ? baseTargets.filter((unit) => unit.id !== selectedUnit.id) : baseTargets;
  })();
  const hasValidTarget = (() => {
    if (!selectedSkillObj || !selectedUnit) return false;
    if (selectedSkillObj.target === "enemy") return units.some((u) => u.hp > 0 && u.team !== selectedUnit.team);
    if (selectedSkillObj.target === "enemyAll") return units.some((u) => u.hp > 0 && u.team !== selectedUnit.team);
    if (selectedSkillObj.target === "ally") return units.some((u) => u.hp > 0 && u.team === selectedUnit.team);
    return true;
  })();
  const canUseSelectedSkill = Boolean(
    selectedUnit &&
      selectedSkillObj &&
      selectedUnit.id === activeUnitId &&
      selectedUnit.hp > 0 &&
      selectedSkillObj.currentCooldown === 0 &&
      hasValidTarget
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <section className="rounded-3xl border border-slate-700 bg-slate-900/80 p-6 shadow-xl shadow-slate-900/20">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-sky-300">TRPG 관리 사이트</p>
              <h1 className="mt-2 text-3xl font-semibold">전투 턴 &amp; 스킬 관리</h1>
              <p className="mt-2 max-w-2xl text-slate-400">
                유닛 추가, HP/최대 HP/속도 수정, 턴 진행, 스킬 생성, 쿨타임, 상태이상, 직업 패시브까지 지원합니다.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => addUnit("ally")}
                className="rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
              >
                아군 무한 추가
              </button>
              <button
                onClick={() => addUnit("enemy")}
                className="rounded-2xl bg-rose-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-rose-400"
              >
                적 무한 추가
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-6 shadow-xl shadow-slate-900/20">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">유닛 목록</h2>
                  <p className="text-sm text-slate-400">현재 나온 유닛을 수정하고 직업/스킬/상태를 관리합니다.</p>
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-slate-800 px-4 py-2 text-sm text-slate-300">
                  <span>턴: {turnCount}</span>
                  <button
                    onClick={() => setTurnCount(1)}
                    className="rounded-full bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:bg-slate-600"
                  >
                    초기화
                  </button>
                </div>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full border-separate border-spacing-0 text-left">
                  <thead className="bg-slate-950/90 text-slate-300">
                    <tr>
                      <th className="rounded-tl-3xl px-3 py-3">유닛</th>
                      <th className="px-3 py-3">팀</th>
                      <th className="px-3 py-3">HP / Max</th>
                      <th className="px-3 py-3">속도</th>
                      <th className="px-3 py-3">직업</th>
                      <th className="px-3 py-3">무기</th>
                      <th className="px-3 py-3">스킬</th>
                      <th className="px-3 py-3">상태</th>
                      <th className="rounded-tr-3xl px-3 py-3">턴</th>
                    </tr>
                  </thead>
                  <tbody>
                    {effectiveUnits.map((unit) => {
                      const job = jobs.find((jobItem) => jobItem.id === unit.jobId);
                      const unitSkills = skills.filter((skill) => unit.effectiveSkillIds?.includes(skill.id));
                      return (
                        <tr
                          key={unit.id}
                          className={`border-t border-slate-800 ${unit.id === activeUnitId ? "bg-slate-800/90" : "bg-slate-900/70"}`}
                        >
                          <td className="px-3 py-3 align-top">
                            <div className="flex flex-col gap-2">
                              <input
                                value={unit.name}
                                onChange={(event) => updateUnit(unit.id, { name: event.target.value })}
                                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
                              />
                              <button
                                onClick={() => removeUnit(unit.id)}
                                className="self-start rounded-2xl bg-rose-500 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-rose-400"
                              >
                                삭제
                              </button>
                            </div>
                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-700">
                              <div
                                className="h-full rounded-full bg-emerald-400"
                                style={{ width: `${(unit.hp / Math.max(unit.maxHp, 1)) * 100}%` }}
                              />
                            </div>
                            <div className="mt-2 text-xs text-slate-400">
                              {statKeys.map((stat) => (
                                <span key={stat} className="inline-flex items-center gap-1 pr-2">
                                  <strong>{statLabels[stat]}:</strong> {unit.baseStats[stat]}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-3 align-top text-sm text-slate-300">{unit.team === "ally" ? "아군" : "적"}</td>
                          <td className="px-3 py-3 align-top space-y-2">
                            <div className="flex gap-2">
                              <input
                                type="number"
                                value={unit.hp}
                                onChange={(event) => updateUnit(unit.id, { hp: clamp(Number(event.target.value), 0, unit.maxHp) })}
                                className="w-20 rounded-2xl border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100 outline-none"
                              />
                              /
                              <input
                                type="number"
                                value={unit.maxHp}
                                onChange={(event) => updateUnit(unit.id, { maxHp: clamp(Number(event.target.value), 1, 999) })}
                                className="w-20 rounded-2xl border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100 outline-none"
                              />
                            </div>
                            <div className="text-xs text-slate-400">체력바</div>
                          </td>
                          <td className="px-3 py-3 align-top">
                            <input
                              type="number"
                              value={unit.speed}
                              onChange={(event) => updateUnit(unit.id, { speed: clamp(Number(event.target.value), 0, 1000) })}
                              className="w-20 rounded-2xl border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100 outline-none"
                            />
                          </td>
                          <td className="px-3 py-3 align-top space-y-2">
                            <select
                              value={unit.jobId}
                              onChange={(event) => updateUnit(unit.id, { jobId: event.target.value })}
                              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
                            >
                              {jobs.map((jobItem) => (
                                <option key={jobItem.id} value={jobItem.id} className="text-slate-900">
                                  {jobItem.name}
                                </option>
                              ))}
                            </select>
                            <div className="text-xs text-slate-400">
                              {job?.passives.length
                                ? job.passives
                                    .map((passive) => passive.description || `${passive.target}:${passive.formula}`)
                                    .join(" / ")
                                : "패시브 없음"}
                            </div>
                          </td>
                          <td className="px-3 py-3 align-top space-y-2">
                            <select
                              value={unit.equippedWeaponId}
                              onChange={(event) => updateUnit(unit.id, { equippedWeaponId: event.target.value })}
                              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
                            >
                              <option value="">없음</option>
                              {weapons.map((weapon) => (
                                <option key={weapon.id} value={weapon.id} className="text-slate-900">
                                  {weapon.name}
                                </option>
                              ))}
                            </select>
                            <div className="text-xs text-slate-400">
                              {weapons.find((weapon) => weapon.id === unit.equippedWeaponId)?.name ?? "무기 없음"}
                            </div>
                          </td>
                          <td className="px-3 py-3 align-top space-y-2 text-sm text-slate-300">
                              {unitSkills.length === 0 ? (
                                <div className="text-slate-500">스킬 없음</div>
                              ) : (
                                unitSkills.map((skillItem) => {
                                  const skillObj = skills.find((s) => s.id === skillItem.id) || skillItem;
                                  const usable = skillObj.currentCooldown === 0 && unit.hp > 0 && (skillObj.target === "any" || skillObj.target === "self" || skillObj.target === "ally" || skillObj.target === "enemy" || skillObj.target === "enemyAll");
                                  const isSelected = actionState.selectedSkillId === skillObj.id;
                                  const validTargetsForSkill = units.filter((u) => u.hp > 0 && (
                                    skillObj.target === "any" ||
                                    (skillObj.target === "self" && u.id === unit.id) ||
                                    ((skillObj.target === "enemy" || skillObj.target === "enemyAll") && u.team !== unit.team) ||
                                    (skillObj.target === "ally" && u.team === unit.team)
                                  ));
                                  return (
                                    <button
                                      key={skillObj.id}
                                      onClick={() => setActionState((prev) => ({ ...prev, selectedSkillId: skillObj.id, selectedTargetId: validTargetsForSkill[0]?.id ?? prev.selectedTargetId }))}
                                      className={`w-full text-left rounded-2xl px-2 py-1 ${isSelected ? "ring-2 ring-sky-400" : ""} ${skillObj.currentCooldown > 0 ? "bg-slate-800 text-slate-500" : "bg-slate-950 text-slate-100"}`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div>{skillObj.name} ({skillKindLabels[skillObj.kind]})</div>
                                        <div className="text-xs text-slate-400">{skillObj.currentCooldown > 0 ? `쿨 ${skillObj.currentCooldown}` : "사용 가능"}</div>
                                      </div>
                                    </button>
                                  );
                                })
                              )}
                          </td>
                          <td className="px-3 py-3 align-top">
                            {unit.effects.length === 0 ? (
                              <span className="text-slate-500">없음</span>
                            ) : (
                              <div className="space-y-1">
                                {unit.effects.map((effect) => (
                                  <div key={effect.id} className="rounded-2xl bg-slate-950 px-2 py-1 text-xs">
                                    {effect.name} ({effect.remainingTurns}턴)
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="mt-2 text-xs text-slate-400">버프/디버프</div>
                          </td>
                          <td className="px-3 py-3 align-top text-sm">
                            <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${unit.actionDone ? "bg-emerald-500 text-slate-950" : "bg-slate-700 text-slate-200"}`}>
                              {unit.hp <= 0 ? "사망" : unit.actionDone ? "행동완료" : unit.id === activeUnitId ? "현재차례" : "대기"}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-6 shadow-xl shadow-slate-900/20">
                <h2 className="text-xl font-semibold">액티브 유닛 행동</h2>
                {selectedUnit ? (
                  <div className="mt-4 space-y-4">
                    <div className="rounded-3xl bg-slate-950 p-4">
                      <p className="text-sm text-slate-400">아군 스탯 편집</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <label className="space-y-2 text-sm text-slate-200">
                          편집할 아군
                          <select
                            value={selectedEditableUnitId}
                            onChange={(event) => setSelectedEditableUnitId(event.target.value)}
                            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
                          >
                            {units.filter((unit) => unit.team === "ally").map((unit) => (
                              <option key={unit.id} value={unit.id}>
                                {unit.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="space-y-2 text-sm text-slate-200">
                          <p className="text-sm text-slate-400">현재 선택된 아군</p>
                          <p className="text-lg font-semibold text-slate-100">{editableUnit?.name ?? "없음"}</p>
                        </div>
                      </div>
                      {editableUnit ? (
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          {statKeys.map((stat) => (
                            <label key={stat} className="space-y-2 text-sm text-slate-200">
                              {statLabels[stat]}
                              <input
                                type="number"
                                value={editableUnit.baseStats[stat]}
                                onChange={(event) =>
                                  updateUnit(editableUnit.id, {
                                    baseStats: {
                                      ...editableUnit.baseStats,
                                      [stat]: clamp(Number(event.target.value), 0, 99),
                                    },
                                  })
                                }
                                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
                              />
                            </label>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="rounded-3xl bg-slate-950 p-4">
                      <p className="text-sm text-slate-400">현재 선택된 유닛</p>
                      <p className="mt-2 text-lg font-semibold">{selectedUnit.name} ({selectedUnit.team === "ally" ? "아군" : "적"})</p>
                      <p className="text-sm text-slate-400">직업: {selectedUnit.job?.name ?? "없음"}</p>
                    </div>
                    <div className="rounded-3xl bg-slate-950 p-4">
                      <p className="text-sm text-slate-400">기본 스탯</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        {statKeys.map((stat) => (
                          <label key={stat} className="space-y-2 text-sm text-slate-200">
                            {statLabels[stat]}
                            <input
                              type="number"
                              value={selectedUnit.baseStats[stat]}
                              onChange={(event) =>
                                updateUnit(selectedUnit.id, {
                                  baseStats: {
                                    ...selectedUnit.baseStats,
                                    [stat]: clamp(Number(event.target.value), 0, 99),
                                  },
                                })
                              }
                              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="space-y-2 text-sm text-slate-200">
                        스킬 선택
                        <select
                          value={actionState.selectedSkillId}
                          onChange={(event) => setActionState((prev) => ({ ...prev, selectedSkillId: event.target.value }))}
                          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
                        >
                          {skills
                            .filter((skill) =>
                              selectedUnit.effectiveSkillIds?.includes(skill.id) &&
                              (skill.target !== "ally" || selectedUnit.team === "ally")
                            )
                            .map((skill) => (
                              <option key={skill.id} value={skill.id}>
                                {skill.name} ({skillKindLabels[skill.kind]})
                              </option>
                            ))}
                        </select>
                      </label>
                      <label className="space-y-2 text-sm text-slate-200">
                        대상 선택
                        <select
                          value={actionState.selectedTargetId}
                          onChange={(event) => setActionState((prev) => ({ ...prev, selectedTargetId: event.target.value }))}
                          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
                        >
                          {validTargets.map((target) => (
                            <option key={target.id} value={target.id}>
                              {target.name} ({target.team === "ally" ? "아군" : "적"})
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        onClick={handleAction}
                        disabled={!canUseSelectedSkill}
                        className={`w-full rounded-3xl px-5 py-3 text-sm font-semibold text-slate-950 transition ${canUseSelectedSkill ? "bg-sky-500 hover:bg-sky-400" : "bg-slate-700 cursor-not-allowed opacity-60"}`}
                      >
                        {canUseSelectedSkill ? "행동 실행" : "사용 불가"}
                      </button>
                      <button
                        onClick={passTurn}
                        className="w-full rounded-3xl bg-slate-700 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-600"
                      >
                        턴 넘기기
                      </button>
                    </div>
                    <div className="rounded-3xl bg-slate-950/90 p-4 text-sm text-slate-300">
                      <p>선택 스킬: {skills.find((skill) => skill.id === actionState.selectedSkillId)?.name ?? "-"}</p>
                      <p>쿨타임: {skills.find((skill) => skill.id === actionState.selectedSkillId)?.currentCooldown ?? 0} 턴</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400">사용 가능한 유닛이 없습니다.</p>
                )}
              </div>

              <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-6 shadow-xl shadow-slate-900/20">
                <h2 className="text-xl font-semibold">턴 순서</h2>
                <div className="mt-4 space-y-3">
                  {initiativeOrder.map((unit, index) => (
                    <div
                      key={unit.id}
                      className={`flex items-center justify-between gap-3 rounded-3xl border px-4 py-3 text-sm ${unit.id === activeUnitId ? "border-sky-500 bg-sky-500/10" : "border-slate-700 bg-slate-950/80"}`}
                    >
                      <div>
                        <p className="font-semibold text-slate-100">{index + 1}. {unit.name}</p>
                        <p className="text-slate-400">속도: {unit.effectiveSpeed} / 상태: {unit.actionDone ? "완료" : "대기"}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${unit.id === activeUnitId ? "bg-sky-500 text-slate-950" : "bg-slate-700 text-slate-200"}`}>
                        {unit.team === "ally" ? "아군" : "적"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-6 shadow-xl shadow-slate-900/20">
              <h2 className="text-xl font-semibold">스킬 생성</h2>
              <div className="mt-6 grid gap-4">
                <label className="space-y-2 text-sm text-slate-200">
                  스킬 이름
                  <input
                    value={newSkill.name}
                    onChange={(event) => setNewSkill((prev) => ({ ...prev, name: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-200">
                    대상 유형
                    <select
                      value={newSkill.target}
                      onChange={(event) => setNewSkill((prev) => ({ ...prev, target: event.target.value as SkillTarget }))}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
                    >
                      <option value="enemy">적</option>
                      <option value="enemyAll">적 전체</option>
                      <option value="ally">아군</option>
                      <option value="self">자기</option>
                      <option value="any">모두</option>
                    </select>
                  </label>
                  <label className="space-y-2 text-sm text-slate-200">
                    스킬 종류
                    <select
                      value={newSkill.kind}
                      onChange={(event) => setNewSkill((prev) => ({ ...prev, kind: event.target.value as SkillKind }))}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
                    >
                      <option value="damage">피해</option>
                      <option value="penetration">관통 피해</option>
                      <option value="heal">회복</option>
                      <option value="buff">버프</option>
                    </select>
                  </label>
                  <label className="space-y-2 text-sm text-slate-200">
                    무기 연결
                    <select
                      value={newSkill.weaponId}
                      onChange={(event) => setNewSkill((prev) => ({ ...prev, weaponId: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
                    >
                      <option value="">없음</option>
                      {weapons.map((weapon) => (
                        <option key={weapon.id} value={weapon.id}>{weapon.name}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="space-y-2 text-sm text-slate-200">
                  수식 (예: [근력] * 2 + 5)
                  <input
                    value={newSkill.formula}
                    onChange={(event) => setNewSkill((prev) => ({ ...prev, formula: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-200">
                    쿨타임
                    <input
                      type="number"
                      min={0}
                      value={newSkill.cooldown}
                      onChange={(event) => setNewSkill((prev) => ({ ...prev, cooldown: clamp(Number(event.target.value), 0, 10) }))}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-slate-200">
                    상태 효과
                    <select
                      value={
                        ["none", "speed", "damageDealt", "damageTaken", "stun", "str", "int", "wis", "dex", "acc", "con"].includes(newSkill.effectType)
                          ? newSkill.effectType
                          : "custom"
                      }
                      onChange={(event) => {
                        const value = event.target.value as EffectType | "none" | "custom";
                        if (value === "custom") {
                          setNewSkill((prev) => ({ ...prev, effectType: "custom" }));
                          setNewSkillCustomEffectType("");
                        } else {
                          setNewSkill((prev) => ({ ...prev, effectType: value }));
                          setNewSkillCustomEffectType("");
                        }
                      }}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
                    >
                      <option value="none">없음</option>
                      <option value="speed">속도</option>
                      <option value="damageDealt">피해 증가</option>
                      <option value="damageTaken">받는 피해</option>
                      <option value="stun">스턴</option>
                      <option value="str">근력</option>
                      <option value="int">지력</option>
                      <option value="wis">지혜</option>
                      <option value="dex">민첩</option>
                      <option value="acc">정밀</option>
                      <option value="con">건강</option>
                      <option value="custom">커스텀</option>
                    </select>
                    {newSkill.effectType === "custom" && (
                      <input
                        value={newSkillCustomEffectType}
                        onChange={(event) => {
                          const customValue = event.target.value;
                          setNewSkillCustomEffectType(customValue);
                          setNewSkill((prev) => ({ ...prev, effectType: customValue || "custom" }));
                        }}
                        placeholder="예: 침묵, 화상"
                        className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
                      />
                    )}
                  </label>
                </div>
                <label className="space-y-2 text-sm text-slate-200">
                  설명
                  <textarea
                    value={newSkill.description}
                    onChange={(event) => setNewSkill((prev) => ({ ...prev, description: event.target.value }))}
                    className="min-h-[100px] w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
                  />
                </label>
                <button
                  onClick={addSkill}
                  className="rounded-3xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                >
                  스킬 생성
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-6 shadow-xl shadow-slate-900/20">
              <h2 className="text-xl font-semibold">무기 생성</h2>
              <div className="mt-6 grid gap-4">
                <label className="space-y-2 text-sm text-slate-200">
                  무기 이름
                  <input
                    value={newWeapon.name}
                    onChange={(event) => setNewWeapon((prev) => ({ ...prev, name: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-3">
                  {statKeys.map((stat) => (
                    <label key={stat} className="space-y-2 text-sm text-slate-200">
                      {statLabels[stat]}
                      <input
                        type="number"
                        value={newWeapon.bonusStats[stat] ?? 0}
                        onChange={(event) => setNewWeapon((prev) => ({
                          ...prev,
                          bonusStats: { ...prev.bonusStats, [stat]: clamp(Number(event.target.value), -99, 99) },
                        }))}
                        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
                      />
                    </label>
                  ))}
                </div>
                <label className="space-y-2 text-sm text-slate-200">
                  속도 보너스
                  <input
                    type="number"
                    value={newWeapon.bonusStats.speed ?? 0}
                    onChange={(event) => setNewWeapon((prev) => ({
                      ...prev,
                      bonusStats: { ...prev.bonusStats, speed: Number(event.target.value) },
                    }))}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
                  />
                </label>
                <button
                  onClick={addWeapon}
                  className="rounded-3xl bg-violet-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-violet-400"
                >
                  무기 생성
                </button>
              </div>
            </div>

            <div className="mt-6 rounded-3xl bg-slate-950/80 p-4 text-slate-300">
              <p className="mb-3 text-sm font-semibold text-slate-100">전체 무기 목록</p>
              <div className="space-y-3">
                {weapons.map((weapon) => (
                  <div key={weapon.id} className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm">
                    <div>
                      <p className="font-semibold">{weapon.name}</p>
                      <p className="text-slate-400">보너스: {statKeys.map((stat) => `${statLabels[stat]} ${weapon.bonusStats[stat] ?? 0}`).join(" / ")}{weapon.bonusStats.speed ? ` / 속도 ${weapon.bonusStats.speed}` : ""}</p>
                    </div>
                    <button
                      onClick={() => removeWeapon(weapon.id)}
                      className="rounded-2xl bg-rose-500 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-rose-400"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-3xl bg-slate-950/80 p-4 text-slate-300">
              <p className="mb-3 text-sm font-semibold text-slate-100">전체 스킬 목록</p>
              <div className="space-y-3">
                {skills.map((skill) => (
                  <div key={skill.id} className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm">
                    <div>
                      <p className="font-semibold">{skill.name}</p>
                      <p className="text-slate-400">{skillKindLabels[skill.kind]} / {skill.effectType === "none" ? "효과 없음" : skill.effectType === "speed" ? "속도 효과" : skill.effectType === "damageDealt" ? "피해 증가" : skill.effectType === "damageTaken" ? "받는 피해 효과" : "스턴"}</p>
                    </div>
                    <button
                      onClick={() => removeSkill(skill.id)}
                      className="rounded-2xl bg-rose-500 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-rose-400"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-6 shadow-xl shadow-slate-900/20">
              <h2 className="text-xl font-semibold">직업 생성</h2>
              <div className="mt-6 space-y-4">
                <label className="space-y-2 text-sm text-slate-200">
                  직업 이름
                  <input
                    value={newJob.name}
                    onChange={(event) => setNewJob((prev) => ({ ...prev, name: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
                  />
                </label>
                <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                  <p className="font-semibold text-slate-100">새 패시브 추가</p>
                  <div className="mt-4 space-y-4">
                    <label className="space-y-2 text-sm text-slate-200">
                      패시브 설명
                      <input
                        value={newJobPassive.description}
                        onChange={(event) => setNewJobPassive((prev) => ({ ...prev, description: event.target.value }))}
                        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
                      />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="space-y-2 text-sm text-slate-200">
                        패시브 대상
                        <select
                          value={newJobPassive.target}
                          onChange={(event) => setNewJobPassive((prev) => ({
                            ...prev,
                            target: event.target.value as keyof Stats | "speed",
                          }))}
                          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
                        >
                          <option value="str">근력</option>
                          <option value="int">지력</option>
                          <option value="wis">지혜</option>
                          <option value="dex">민첩</option>
                          <option value="acc">정밀</option>
                          <option value="con">건강</option>
                          <option value="speed">속도</option>
                        </select>
                      </label>
                      <label className="space-y-2 text-sm text-slate-200">
                        패시브 수식
                        <input
                          value={newJobPassive.formula}
                          onChange={(event) => setNewJobPassive((prev) => ({ ...prev, formula: event.target.value }))}
                          placeholder="[str] * 0.5 + 1"
                          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
                        />
                        <p className="text-xs text-slate-500">[str], [int], [wis], [dex], [acc], [con], [hp], [maxHp], [speed] 사용 가능</p>
                      </label>
                    </div>
                    <button
                      onClick={addJobPassive}
                      className="rounded-3xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
                    >
                      패시브 추가
                    </button>
                  </div>
                </div>
                {newJob.passives.length > 0 && (
                  <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                    <p className="font-semibold text-slate-100">직업 패시브 목록</p>
                    <div className="mt-3 space-y-3">
                      {newJob.passives.map((passive) => (
                        <div key={passive.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-900 px-3 py-3">
                          <div>
                            <p className="font-semibold text-slate-100">{passive.description || "설명 없음"}</p>
                            <p className="text-xs text-slate-400">{passive.target} / {passive.formula}</p>
                          </div>
                          <button
                            onClick={() => removeNewJobPassive(passive.id)}
                            className="rounded-2xl bg-rose-500 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-rose-400"
                          >
                            삭제
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  onClick={addJob}
                  className="rounded-3xl bg-violet-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-violet-400"
                >
                  직업 생성
                </button>
                <div className="mt-6 rounded-3xl bg-slate-950/80 p-4 text-slate-300">
                  <p className="mb-3 text-sm font-semibold text-slate-100">직업 관리</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2 text-sm text-slate-200">
                      선택 직업
                      <select
                        value={selectedJobId}
                        onChange={(event) => setSelectedJobId(event.target.value)}
                        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
                      >
                        {jobs.map((job) => (
                          <option key={job.id} value={job.id}>
                            {job.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2 text-sm text-slate-200">
                      추가할 스킬
                      <select
                        value={jobSkillToAddId}
                        onChange={(event) => setJobSkillToAddId(event.target.value)}
                        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
                      >
                        {skills.map((skill) => (
                          <option key={skill.id} value={skill.id}>
                            {skill.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <button
                    onClick={() => assignSkillToJob(selectedJobId, jobSkillToAddId)}
                    className="mt-4 rounded-3xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
                  >
                    직업에 스킬 추가
                  </button>
                  <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                    <p className="font-semibold text-slate-100">선택 직업에 패시브 추가</p>
                    <div className="mt-4 space-y-4">
                      <label className="space-y-2 text-sm text-slate-200">
                        패시브 설명
                        <input
                          value={selectedJobPassive.description}
                          onChange={(event) => setSelectedJobPassive((prev) => ({ ...prev, description: event.target.value }))}
                          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
                        />
                      </label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="space-y-2 text-sm text-slate-200">
                          패시브 대상
                          <select
                            value={selectedJobPassive.target}
                            onChange={(event) => setSelectedJobPassive((prev) => ({
                              ...prev,
                              target: event.target.value as keyof Stats | "speed",
                            }))}
                            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
                          >
                            <option value="str">근력</option>
                            <option value="int">지력</option>
                            <option value="wis">지혜</option>
                            <option value="dex">민첩</option>
                            <option value="acc">정밀</option>
                            <option value="con">건강</option>
                            <option value="speed">속도</option>
                          </select>
                        </label>
                        <label className="space-y-2 text-sm text-slate-200">
                          패시브 수식
                          <input
                            value={selectedJobPassive.formula}
                            onChange={(event) => setSelectedJobPassive((prev) => ({ ...prev, formula: event.target.value }))}
                            placeholder="[str] * 0.5 + 1"
                            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
                          />
                          <p className="text-xs text-slate-500">[str], [int], [wis], [dex], [acc], [con], [hp], [maxHp], [speed] 사용 가능</p>
                        </label>
                      </div>
                      <button
                        onClick={() => addPassiveToJob(selectedJobId)}
                        className="rounded-3xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
                      >
                        패시브 추가
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 space-y-3">
                    {jobs
                      .find((job) => job.id === selectedJobId)
                      ?.skillIds.map((skillId) => {
                        const skill = skills.find((item) => item.id === skillId);
                        if (!skill) return null;
                        return (
                          <div key={skill.id} className="flex items-center justify-between gap-3 rounded-3xl border border-slate-800 bg-slate-900 px-3 py-3 text-sm">
                            <div>
                              <p className="font-semibold">{skill.name}</p>
                              <p className="text-slate-400">{skillKindLabels[skill.kind]}</p>
                            </div>
                            <button
                              onClick={() => removeSkillFromJob(selectedJobId, skill.id)}
                              className="rounded-2xl bg-rose-500 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-rose-400"
                            >
                              제거
                            </button>
                          </div>
                        );
                      })}
                  </div>
                  <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                    <p className="font-semibold text-slate-100">선택 직업 패시브 목록</p>
                    <div className="mt-3 space-y-3">
                      {jobs.find((job) => job.id === selectedJobId)?.passives.map((passive) => (
                        <div key={passive.id} className="flex items-center justify-between gap-3 rounded-3xl border border-slate-800 bg-slate-900 px-3 py-3 text-sm">
                          <div>
                            <p className="font-semibold">{passive.description || "설명 없음"}</p>
                            <p className="text-slate-400">{passive.target} / {passive.formula}</p>
                          </div>
                          <button
                            onClick={() => removePassiveFromJob(selectedJobId, passive.id)}
                            className="rounded-2xl bg-rose-500 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-rose-400"
                          >
                            삭제
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => removeJob(selectedJobId)}
                    className="mt-4 rounded-3xl bg-rose-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-rose-400"
                  >
                    직업 삭제
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-6 shadow-xl shadow-slate-900/20">
              <h2 className="text-xl font-semibold">상태 이상 에디터</h2>
              <div className="mt-4 grid gap-4 xl:grid-cols-[280px_1fr]">
                <div className="space-y-4">
                  <label className="space-y-2 text-sm text-slate-200">
                    대상 유닛 선택
                    <select
                      value={selectedEffectUnitId}
                      onChange={(event) => {
                        setSelectedEffectUnitId(event.target.value);
                        setSelectedEffectId("new");
                      }}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none"
                    >
                      {units.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.name} ({unit.team === "ally" ? "아군" : "적"})
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-100">효과 목록</p>
                      <span className="text-xs text-slate-400">{selectedEffectUnit?.effects.length ?? 0}개</span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {selectedEffectUnit?.effects.length ? (
                        selectedEffectUnit.effects.map((effect) => (
                          <button
                            key={effect.id}
                            onClick={() => setSelectedEffectId(effect.id)}
                            className={`w-full rounded-2xl border px-3 py-3 text-left text-sm transition ${selectedEffectId === effect.id ? "border-sky-500 bg-slate-900" : "border-slate-700 bg-slate-950"}`}
                          >
                            <div className="font-semibold">{effect.name}</div>
                            <div className="text-slate-400">
                              {effect.type === "stun"
                                ? "스턴"
                                : `${effectTypeLabels[effect.type] ?? effect.type} ${effect.value > 0 ? "+" : ""}${effect.value}%${effect.flatValue ? ` ${effect.flatValue > 0 ? "+" : ""}${effect.flatValue}` : ""}`}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-6 text-center text-slate-500">
                          선택된 유닛에 적용된 효과가 없습니다.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-100">
                        {selectedEffect ? "선택된 상태 효과 편집" : "새 상태 효과 추가"}
                      </p>
                      <p className="text-sm text-slate-400">
                        {selectedEffect ? "효과를 선택한 뒤 값을 수정하고 저장하세요." : "새로운 상태 효과를 추가할 수 있습니다."}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedEffectId("new")}
                      className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-100 transition hover:bg-slate-800"
                    >
                      새 효과로 초기화
                    </button>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <label className="space-y-2 text-sm text-slate-200">
                      효과 이름
                      <input
                        value={newEffect.name}
                        onChange={(event) => setNewEffect((prev) => ({ ...prev, name: event.target.value }))}
                        className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-slate-200">
                      유형
                      <select
                        value={newEffectTypeChoice}
                        onChange={(event) => {
                          const value = event.target.value as EffectType | "custom";
                          setNewEffectTypeChoice(value);
                          if (value === "custom") {
                            setNewEffect((prev) => ({ ...prev, type: newEffectCustomType || "custom" }));
                          } else {
                            setNewEffect((prev) => ({ ...prev, type: value }));
                          }
                        }}
                        className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none"
                      >
                        <option value="speed">속도</option>
                        <option value="damageDealt">입히는 피해</option>
                        <option value="damageTaken">받는 피해</option>
                        <option value="stun">스턴</option>
                        <option value="str">근력</option>
                        <option value="int">지력</option>
                        <option value="wis">지혜</option>
                        <option value="dex">민첩</option>
                        <option value="acc">정밀</option>
                        <option value="con">건강</option>
                        <option value="custom">커스텀</option>
                      </select>
                      {newEffectTypeChoice === "custom" && (
                        <input
                          value={newEffectCustomType}
                          onChange={(event) => {
                            setNewEffectCustomType(event.target.value);
                            setNewEffect((prev) => ({ ...prev, type: event.target.value || "custom" }));
                          }}
                          placeholder="예: 침묵, 화상"
                          className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none"
                        />
                      )}
                    </label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-4 mt-4">
                    <label className="space-y-2 text-sm text-slate-200">
                      백분율 값 (%)
                      <input
                        type="number"
                        value={newEffect.value}
                        onChange={(event) => setNewEffect((prev) => ({ ...prev, value: Number(event.target.value) }))}
                        className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none"
                      />
                      <p className="text-xs text-slate-500">음수 입력 시 감소 효과가 적용됩니다.</p>
                    </label>
                    <label className="space-y-2 text-sm text-slate-200">
                      일반 값
                      <input
                        type="number"
                        value={newEffect.flatValue}
                        onChange={(event) => setNewEffect((prev) => ({ ...prev, flatValue: Number(event.target.value) }))}
                        className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-slate-200">
                      지속 턴
                      <input
                        type="number"
                        min={1}
                        value={newEffect.remainingTurns}
                        onChange={(event) => setNewEffect((prev) => ({ ...prev, remainingTurns: clamp(Number(event.target.value), 1, 10) }))}
                        className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none"
                      />
                    </label>
                    <div className="flex flex-col gap-3 sm:h-full">
                      <button
                        onClick={() => {
                          if (!selectedEffectUnit) return;
                          if (selectedEffect) {
                            updateEffect(selectedEffectUnit.id, selectedEffect.id, newEffect);
                          } else {
                            addEffectToUnit(selectedEffectUnit.id, newEffect);
                          }
                          setSelectedEffectId("new");
                        }}
                        className="h-full rounded-3xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
                      >
                        {selectedEffect ? "효과 갱신" : "추가"}
                      </button>
                      {selectedEffect ? (
                        <button
                          onClick={() => {
                            if (!selectedEffectUnit || !selectedEffect) return;
                            removeEffectFromUnit(selectedEffectUnit.id, selectedEffect.id);
                            setSelectedEffectId("new");
                          }}
                          className="h-full rounded-3xl bg-rose-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-rose-400"
                        >
                          제거
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
