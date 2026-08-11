import type { ClientSex, Json } from "@/lib/database.types";

export type ExerciseSession = {
  mets: number | null;
  durationMin: number | null;
  daysPerWeek: number | null;
};

export type EnergySettings = {
  method: "cunningham" | "harris";
  leanMassKg: number | null;
  activityFactor: number;
  thermalEffect: number;
  exerciseSessions: ExerciseSession[];
  calorieTarget: number | null;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
};

export type MealDistribution = {
  name: string;
  pct: number;
};

export const DEFAULT_MEAL_DISTRIBUTION: MealDistribution[] = [
  { name: "Desayuno", pct: 20 },
  { name: "Media manana", pct: 10 },
  { name: "Comida", pct: 30 },
  { name: "Merienda", pct: 15 },
  { name: "Cena", pct: 20 },
  { name: "Recena", pct: 5 },
];

export const DEFAULT_ENERGY_SETTINGS: EnergySettings = {
  method: "cunningham",
  leanMassKg: null,
  activityFactor: 1.55,
  thermalEffect: 0.1,
  exerciseSessions: [{ mets: null, durationMin: null, daysPerWeek: 1 }],
  calorieTarget: null,
  proteinPct: 30,
  carbsPct: 45,
  fatPct: 25,
};

function objectValue(value: Json | null | undefined): { [key: string]: Json | undefined } {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function numberFromJson(value: Json | undefined, fallback: number | null) {
  const parsed = typeof value === "number" ? value : Number(value ?? "");
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeThermalEffect(value: number | null | undefined) {
  if (!value || !Number.isFinite(value) || value <= 0) {
    return DEFAULT_ENERGY_SETTINGS.thermalEffect;
  }

  return value > 1 ? value / 100 : value;
}

function exerciseSessionsFromJson(source: { [key: string]: Json | undefined }) {
  if (Array.isArray(source.exerciseSessions)) {
    const sessions = source.exerciseSessions
      .map((row) => {
        if (!row || typeof row !== "object" || Array.isArray(row)) return null;

        return {
          mets: numberFromJson(row.mets, null),
          durationMin: numberFromJson(row.durationMin, null),
          daysPerWeek: numberFromJson(row.daysPerWeek, 1),
        };
      })
      .filter((row): row is ExerciseSession => Boolean(row));

    if (sessions.length) return sessions;
  }

  return [
    {
      mets: numberFromJson(source.exerciseMets, null),
      durationMin: numberFromJson(source.exerciseDurationMin, null),
      daysPerWeek: numberFromJson(source.exerciseDaysPerWeek, 1),
    },
  ];
}

export function energySettingsFromJson(value: Json | null | undefined): EnergySettings {
  const source = objectValue(value);
  const method = source.method === "harris" ? "harris" : "cunningham";

  return {
    method,
    leanMassKg: numberFromJson(source.leanMassKg, DEFAULT_ENERGY_SETTINGS.leanMassKg),
    activityFactor:
      numberFromJson(source.activityFactor, DEFAULT_ENERGY_SETTINGS.activityFactor) ??
      DEFAULT_ENERGY_SETTINGS.activityFactor,
    thermalEffect: normalizeThermalEffect(
      numberFromJson(source.thermalEffect, DEFAULT_ENERGY_SETTINGS.thermalEffect),
    ),
    exerciseSessions: exerciseSessionsFromJson(source),
    calorieTarget: numberFromJson(source.calorieTarget, DEFAULT_ENERGY_SETTINGS.calorieTarget),
    proteinPct:
      numberFromJson(source.proteinPct, DEFAULT_ENERGY_SETTINGS.proteinPct) ??
      DEFAULT_ENERGY_SETTINGS.proteinPct,
    carbsPct:
      numberFromJson(source.carbsPct, DEFAULT_ENERGY_SETTINGS.carbsPct) ??
      DEFAULT_ENERGY_SETTINGS.carbsPct,
    fatPct:
      numberFromJson(source.fatPct, DEFAULT_ENERGY_SETTINGS.fatPct) ??
      DEFAULT_ENERGY_SETTINGS.fatPct,
  };
}

export function mealDistributionFromJson(value: Json | null | undefined) {
  if (!Array.isArray(value)) return DEFAULT_MEAL_DISTRIBUTION;

  const rows = value
    .map((row) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) return null;
      const name = typeof row.name === "string" ? row.name : "";
      const pct = numberFromJson(row.pct, 0) ?? 0;
      return name ? { name, pct } : null;
    })
    .filter((row): row is MealDistribution => Boolean(row));

  return rows.length ? rows : DEFAULT_MEAL_DISTRIBUTION;
}

export function calculateEnergyPlan({
  settings,
  weightKg,
  heightCm,
  age,
  sex,
}: {
  settings: EnergySettings;
  weightKg: number | null | undefined;
  heightCm: number | null | undefined;
  age: number | null | undefined;
  sex: ClientSex | null | undefined;
}) {
  const weight = weightKg && weightKg > 0 ? weightKg : 70;
  const height = heightCm && heightCm > 0 ? heightCm : 170;
  const years = age && age > 0 ? age : 25;
  const leanMass = settings.leanMassKg && settings.leanMassKg > 0 ? settings.leanMassKg : weight * 0.75;
  const baseMetabolicRate =
    settings.method === "cunningham"
      ? 500 + 22 * leanMass
      : sex === "female"
        ? 447.593 + 9.247 * weight + 3.098 * height - 4.33 * years
        : 88.362 + 13.397 * weight + 4.799 * height - 5.677 * years;
  const exercise = settings.exerciseSessions.reduce((total, session) => {
    const mets = session.mets ?? 0;
    const durationMin = session.durationMin ?? 0;
    const daysPerWeek = session.daysPerWeek ?? 0;

    return mets > 0 && durationMin > 0 && daysPerWeek > 0
      ? total + (mets * weight * (durationMin / 60) * daysPerWeek) / 7
      : total;
  }, 0);
  const activity = baseMetabolicRate * settings.activityFactor;
  const thermalEffect = normalizeThermalEffect(settings.thermalEffect);
  const thermal = (activity + exercise) * thermalEffect;
  const total = activity + exercise + thermal;
  const calories = Math.round(settings.calorieTarget && settings.calorieTarget > 0 ? settings.calorieTarget : total);
  const proteinG = Math.round((calories * settings.proteinPct) / 100 / 4);
  const carbsG = Math.round((calories * settings.carbsPct) / 100 / 4);
  const fatG = Math.round((calories * settings.fatPct) / 100 / 9);

  return {
    weight,
    height,
    leanMass,
    baseMetabolicRate,
    activity,
    exercise,
    thermal,
    total,
    calories,
    proteinG,
    carbsG,
    fatG,
  };
}
