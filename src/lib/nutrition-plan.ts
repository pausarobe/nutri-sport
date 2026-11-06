import type { ClientSex, Json } from "@/lib/database.types";

export type ActivityFactorLevel =
  | "sedentary"
  | "very_light"
  | "light"
  | "moderate"
  | "intense";

export type WeekDayId =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type TrainingSession = {
  id: string;
  name: string;
  mets: number | null;
  durationMin: number | null;
};

export type TrainingDay = {
  day: WeekDayId;
  sessions: TrainingSession[];
};

export type MealDistribution = {
  name: string;
  pct: number;
};

export type NutritionContextSettings = {
  key: string;
  label: string;
  calorieTarget: number | null;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
  meals: MealDistribution[];
};

export type EnergySettings = {
  version: 3;
  method: "cunningham" | "harris";
  leanMassKg: number | null;
  harrisWeightKg: number | null;
  harrisHeightCm: number | null;
  harrisAge: number | null;
  activityLevel: ActivityFactorLevel;
  activityFactor: number;
  thermalEffect: number;
  week: TrainingDay[];
  contexts: NutritionContextSettings[];
  activeContextKey: string;
  calculationDescription?: string;
  legacyFormat?: boolean;
};

export type EnergyDayResult = TrainingDay & {
  sessionResults: Array<TrainingSession & { netExercise: number }>;
  netExercise: number;
  total: number;
  increment: number;
};

export const WEEK_DAYS: ReadonlyArray<{ id: WeekDayId; label: string }> = [
  { id: "monday", label: "Lunes" },
  { id: "tuesday", label: "Martes" },
  { id: "wednesday", label: "Miércoles" },
  { id: "thursday", label: "Jueves" },
  { id: "friday", label: "Viernes" },
  { id: "saturday", label: "Sábado" },
  { id: "sunday", label: "Domingo" },
];

export const DEFAULT_MEAL_DISTRIBUTION: MealDistribution[] = [
  { name: "Desayuno", pct: 20 },
  { name: "Media mañana", pct: 10 },
  { name: "Comida", pct: 30 },
  { name: "Merienda", pct: 15 },
  { name: "Cena", pct: 20 },
  { name: "Recena", pct: 5 },
];

export const ACTIVITY_FACTOR_OPTIONS: ReadonlyArray<{
  level: ActivityFactorLevel;
  label: string;
  male: number;
  female: number;
}> = [
  { level: "sedentary", label: "Sedentario", male: 1.2, female: 1.2 },
  { level: "very_light", label: "Muy ligera", male: 1.3, female: 1.3 },
  { level: "light", label: "Ligera", male: 1.6, female: 1.5 },
  { level: "moderate", label: "Moderada", male: 1.7, female: 1.6 },
  { level: "intense", label: "Intensa", male: 2.1, female: 1.9 },
];

const DEFAULT_WEEK: TrainingDay[] = WEEK_DAYS.map(({ id }) => ({
  day: id,
  sessions: [],
}));

const DEFAULT_REST_CONTEXT: NutritionContextSettings = {
  key: "rest",
  label: "Día de descanso",
  calorieTarget: null,
  proteinPct: 30,
  carbsPct: 45,
  fatPct: 25,
  meals: DEFAULT_MEAL_DISTRIBUTION,
};

export const DEFAULT_ENERGY_SETTINGS: EnergySettings = {
  version: 3,
  method: "cunningham",
  leanMassKg: null,
  harrisWeightKg: null,
  harrisHeightCm: null,
  harrisAge: null,
  activityLevel: "light",
  activityFactor: 1.6,
  thermalEffect: 0.1,
  week: DEFAULT_WEEK,
  contexts: [DEFAULT_REST_CONTEXT],
  activeContextKey: "rest",
};

function objectValue(value: Json | null | undefined): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function numberFromJson(value: Json | undefined, fallback: number | null) {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = typeof value === "number" ? value : Number(value ?? "");
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stringFromJson(value: Json | undefined, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function parseActivityFactorLevel(value: unknown) {
  return ACTIVITY_FACTOR_OPTIONS.some((option) => option.level === value)
    ? (value as ActivityFactorLevel)
    : null;
}

export function activityFactorForSex(
  level: ActivityFactorLevel,
  sex: ClientSex | null | undefined,
) {
  const option =
    ACTIVITY_FACTOR_OPTIONS.find((candidate) => candidate.level === level) ??
    ACTIVITY_FACTOR_OPTIONS[2];

  return sex === "female" ? option.female : option.male;
}

function activityLevelFromLegacyFactor(factor: number) {
  const legacyLevels: Array<[number, ActivityFactorLevel]> = [
    [1.2, "sedentary"],
    [1.375, "very_light"],
    [1.55, "light"],
    [1.725, "moderate"],
    [1.9, "intense"],
  ];
  const legacyMatch = legacyLevels.find(
    ([legacyFactor]) => Math.abs(legacyFactor - factor) < 0.001,
  );

  if (legacyMatch) return legacyMatch[1];

  return ACTIVITY_FACTOR_OPTIONS.reduce((closest, option) => {
    const average = (option.male + option.female) / 2;
    const closestAverage = (closest.male + closest.female) / 2;
    return Math.abs(average - factor) < Math.abs(closestAverage - factor)
      ? option
      : closest;
  }).level;
}

export function normalizeThermalEffect(value: number | null | undefined) {
  if (!value || !Number.isFinite(value) || value <= 0) {
    return DEFAULT_ENERGY_SETTINGS.thermalEffect;
  }

  const normalized = value > 1 ? value / 100 : value;
  return Math.min(0.5, normalized);
}

export function trainingContextKey(name: string) {
  const normalized = name
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `training:${normalized || "entrenamiento"}`;
}

function mealsFromJson(value: Json | null | undefined) {
  if (!Array.isArray(value)) {
    return DEFAULT_MEAL_DISTRIBUTION.map((meal) => ({ ...meal }));
  }

  const rows = value
    .map((row, index) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) return null;
      const fallback = DEFAULT_MEAL_DISTRIBUTION[index];
      const name = stringFromJson(row.name, fallback?.name ?? `Comida ${index + 1}`);
      const pct = numberFromJson(row.pct, fallback?.pct ?? 0) ?? 0;
      return { name, pct: Math.max(0, Math.min(100, pct)) };
    })
    .filter((row): row is MealDistribution => Boolean(row));

  return rows.length === 6
    ? rows
    : DEFAULT_MEAL_DISTRIBUTION.map((meal) => ({ ...meal }));
}

function defaultContext(key: string, label: string): NutritionContextSettings {
  return {
    key,
    label,
    calorieTarget: null,
    proteinPct: 30,
    carbsPct: 45,
    fatPct: 25,
    meals: DEFAULT_MEAL_DISTRIBUTION.map((meal) => ({ ...meal })),
  };
}

function weekFromJson(source: Record<string, Json | undefined>): TrainingDay[] {
  if (Array.isArray(source.week)) {
    const byDay = new Map<WeekDayId, TrainingDay>();
    for (const row of source.week) {
      if (!row || typeof row !== "object" || Array.isArray(row)) continue;
      const day = WEEK_DAYS.find((candidate) => candidate.id === row.day)?.id;
      if (!day) continue;

      const sessions: TrainingSession[] = Array.isArray(row.sessions)
        ? row.sessions
            .map((session, index) => {
              if (
                !session ||
                typeof session !== "object" ||
                Array.isArray(session)
              ) {
                return null;
              }

              return {
                id: stringFromJson(session.id, `${day}-${index + 1}`),
                name: stringFromJson(session.name),
                mets: numberFromJson(session.mets, null),
                durationMin: numberFromJson(session.durationMin, null),
              };
            })
            .filter((session): session is TrainingSession => Boolean(session))
        : row.mode === "training"
          ? [
              {
                id: `${day}-1`,
                name: stringFromJson(row.name),
                mets: numberFromJson(row.mets, null),
                durationMin: numberFromJson(row.durationMin, null),
              },
            ]
          : [];

      byDay.set(day, {
        day,
        sessions,
      });
    }
    if (byDay.size) {
      return WEEK_DAYS.map(({ id }) =>
        byDay.get(id) ?? { ...DEFAULT_WEEK.find((row) => row.day === id)! },
      );
    }
  }

  // Compatibilidad: distribuye las sesiones del formato anterior entre los siete días.
  const legacy = Array.isArray(source.exerciseSessions)
    ? source.exerciseSessions
    : source.exerciseMets
      ? [
          {
            mets: source.exerciseMets,
            durationMin: source.exerciseDurationMin,
            daysPerWeek: source.exerciseDaysPerWeek,
          },
        ]
      : [];
  const week = DEFAULT_WEEK.map((day) => ({ ...day }));
  let cursor = 0;
  legacy.forEach((row, sessionIndex) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return;
    const days = Math.max(
      0,
      Math.min(7 - cursor, Math.round(numberFromJson(row.daysPerWeek, 1) ?? 1)),
    );
    for (let index = 0; index < days; index += 1) {
      week[cursor] = {
        ...week[cursor],
        sessions: [
          {
            id: `${week[cursor].day}-1`,
            name: `Entrenamiento ${sessionIndex + 1}`,
            mets: numberFromJson(row.mets, null),
            durationMin: numberFromJson(row.durationMin, null),
          },
        ],
      };
      cursor += 1;
    }
  });
  return week;
}

function contextsFromJson(
  source: Record<string, Json | undefined>,
  week: TrainingDay[],
) {
  const saved = new Map<string, NutritionContextSettings>();
  if (Array.isArray(source.contexts)) {
    for (const row of source.contexts) {
      if (!row || typeof row !== "object" || Array.isArray(row)) continue;
      const key = stringFromJson(row.key);
      if (!key) continue;
      saved.set(key, {
        key,
        label: stringFromJson(
          row.label,
          key === "rest" ? "Día de descanso" : "Entrenamiento",
        ),
        calorieTarget: numberFromJson(row.calorieTarget, null),
        proteinPct: numberFromJson(row.proteinPct, 30) ?? 30,
        carbsPct: numberFromJson(row.carbsPct, 45) ?? 45,
        fatPct: numberFromJson(row.fatPct, 25) ?? 25,
        meals: mealsFromJson(row.meals),
      });
    }
  }

  // Compatibilidad con el objetivo único anterior.
  if (!saved.size) {
    const legacy = defaultContext("rest", "Día de descanso");
    legacy.calorieTarget = numberFromJson(source.calorieTarget, null);
    legacy.proteinPct = numberFromJson(source.proteinPct, 30) ?? 30;
    legacy.carbsPct = numberFromJson(source.carbsPct, 45) ?? 45;
    legacy.fatPct = numberFromJson(source.fatPct, 25) ?? 25;
    saved.set("rest", legacy);
  }

  const required: Array<{ key: string; label: string }> = [
    { key: "rest", label: "Día de descanso" },
  ];
  for (const day of week) {
    for (const session of day.sessions) {
      const label = session.name.trim() || "Entrenamiento";
      const key = trainingContextKey(label);
      if (!required.some((row) => row.key === key)) {
        required.push({ key, label });
      }
    }
  }

  return required.map(({ key, label }) => {
    const context = saved.get(key) ?? defaultContext(key, label);
    return {
      ...context,
      label,
      meals: context.meals.map((meal) => ({ ...meal })),
    };
  });
}

export function energySettingsFromJson(value: Json | null | undefined): EnergySettings {
  const source = objectValue(value);
  const method = source.method === "harris" ? "harris" : "cunningham";
  const storedActivityFactor =
    numberFromJson(source.activityFactor, DEFAULT_ENERGY_SETTINGS.activityFactor) ??
    DEFAULT_ENERGY_SETTINGS.activityFactor;
  const activityLevel =
    parseActivityFactorLevel(source.activityLevel) ??
    activityLevelFromLegacyFactor(storedActivityFactor);
  const week = weekFromJson(source);
  const contexts = contextsFromJson(source, week);
  const requestedActive = stringFromJson(source.activeContextKey, "rest");

  return {
    version: 3,
    method,
    leanMassKg: numberFromJson(source.leanMassKg, null),
    harrisWeightKg: numberFromJson(source.harrisWeightKg, null),
    harrisHeightCm: numberFromJson(source.harrisHeightCm, null),
    harrisAge: numberFromJson(source.harrisAge, null),
    activityLevel,
    activityFactor: storedActivityFactor,
    thermalEffect: normalizeThermalEffect(numberFromJson(source.thermalEffect, 0.1)),
    week,
    contexts,
    activeContextKey: contexts.some((context) => context.key === requestedActive)
      ? requestedActive
      : "rest",
    calculationDescription: stringFromJson(source.calculationDescription) || undefined,
    legacyFormat: !Array.isArray(source.contexts),
  };
}

export function mealDistributionFromJson(value: Json | null | undefined) {
  return mealsFromJson(value);
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
  const referenceWeight = weightKg && weightKg > 0 ? weightKg : 70;
  const referenceHeight = heightCm && heightCm > 0 ? heightCm : 170;
  const referenceAge = age && age > 0 ? age : 25;
  const weight =
    settings.method === "harris" &&
    settings.harrisWeightKg &&
    settings.harrisWeightKg > 0
      ? settings.harrisWeightKg
      : referenceWeight;
  const height =
    settings.method === "harris" &&
    settings.harrisHeightCm &&
    settings.harrisHeightCm > 0
      ? settings.harrisHeightCm
      : referenceHeight;
  const years =
    settings.method === "harris" && settings.harrisAge && settings.harrisAge > 0
      ? settings.harrisAge
      : referenceAge;
  const leanMass =
    settings.leanMassKg && settings.leanMassKg > 0
      ? settings.leanMassKg
      : weight * 0.75;
  const baseMetabolicRate =
    settings.method === "cunningham"
      ? 500 + 22 * leanMass
      : sex === "female"
        ? 447.593 + 9.247 * weight + 3.098 * height - 4.33 * years
        : 88.362 + 13.397 * weight + 4.799 * height - 5.677 * years;
  const activityFactor = activityFactorForSex(settings.activityLevel, sex);
  const baseBeforeThermal = baseMetabolicRate * activityFactor;
  const thermalEffect = normalizeThermalEffect(settings.thermalEffect);
  const divisor = Math.max(0.5, 1 - thermalEffect);
  const restTotal = baseBeforeThermal / divisor;
  const days: EnergyDayResult[] = settings.week.map((day) => {
    const sessionResults = day.sessions.map((session) => {
      const mets = session.mets ?? 0;
      const durationMin = session.durationMin ?? 0;
      const netExercise =
        mets > 1 && durationMin > 0
          ? (mets - 1) * weight * (durationMin / 60)
          : 0;
      return { ...session, netExercise };
    });
    const netExercise = sessionResults.reduce(
      (total, session) => total + session.netExercise,
      0,
    );
    const total = (baseBeforeThermal + netExercise) / divisor;
    return {
      ...day,
      sessionResults,
      netExercise,
      total,
      increment: total - restTotal,
    };
  });
  const averageExercise =
    days.reduce((sum, day) => sum + day.netExercise, 0) / 7;
  const weeklyAverage = days.reduce((sum, day) => sum + day.total, 0) / 7;
  const activeContext =
    settings.contexts.find((context) => context.key === settings.activeContextKey) ??
    settings.contexts[0] ??
    DEFAULT_REST_CONTEXT;
  const activeReference =
    activeContext.key === "rest"
      ? restTotal
      : (() => {
          const matching = days.filter(
            (day) =>
              day.sessions.some(
                (session) =>
                  trainingContextKey(session.name || "Entrenamiento") ===
                  activeContext.key,
              ),
          );
          return matching.length
            ? matching.reduce((sum, day) => sum + day.total, 0) / matching.length
            : restTotal;
        })();
  const calories = Math.round(
    activeContext.calorieTarget && activeContext.calorieTarget > 0
      ? activeContext.calorieTarget
      : activeReference,
  );
  const proteinG = Math.round((calories * activeContext.proteinPct) / 100 / 4);
  const carbsG = Math.round((calories * activeContext.carbsPct) / 100 / 4);
  const fatG = Math.round((calories * activeContext.fatPct) / 100 / 9);

  return {
    weight,
    height,
    leanMass,
    baseMetabolicRate,
    activityFactor,
    baseBeforeThermal,
    restTotal,
    days,
    weeklyAverage,
    averageExercise,
    activeReference,
    // Alias conservados para consumidores antiguos.
    activity: baseBeforeThermal,
    exercise: averageExercise,
    thermal: weeklyAverage - baseBeforeThermal - averageExercise,
    total: weeklyAverage,
    calories,
    proteinG,
    carbsG,
    fatG,
  };
}

export function contextReference(
  key: string,
  energy: ReturnType<typeof calculateEnergyPlan>,
) {
  if (key === "rest") return energy.restTotal;
  const matching = energy.days.filter(
    (day) =>
      day.sessions.some(
        (session) =>
          trainingContextKey(session.name || "Entrenamiento") === key,
      ),
  );
  return matching.length
    ? matching.reduce((sum, day) => sum + day.total, 0) / matching.length
    : energy.restTotal;
}
