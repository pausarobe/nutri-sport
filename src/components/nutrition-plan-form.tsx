"use client";

import { RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { savePlan } from "@/app/(app)/clients/actions";
import { SubmitButton } from "@/components/submit-button";
import type { ClientSex } from "@/lib/database.types";
import {
  ACTIVITY_FACTOR_OPTIONS,
  activityFactorForSex,
  calculateEnergyPlan,
  contextReference,
  DEFAULT_MEAL_DISTRIBUTION,
  normalizeThermalEffect,
  trainingContextKey,
  WEEK_DAYS,
  type EnergySettings,
  type MealDistribution,
  type NutritionContextSettings,
  type TrainingDay,
} from "@/lib/nutrition-plan";

type NutritionPlanFormProps = {
  clientId: string;
  content: string;
  settings: EnergySettings;
  meals: MealDistribution[];
  activePlan: {
    calories: number | null;
    proteinG: number | null;
    carbsG: number | null;
    fatG: number | null;
  };
  reference: {
    weightKg: number | null;
    heightCm: number | null;
    age: number | null;
    sex: ClientSex | null;
  };
};

const inputClass = "clinical-input";
const labelClass = "clinical-label";
const panelClass =
  "rounded-2xl border border-slate-200 bg-[#f7f8ff] p-4 sm:p-5";

const thermalOptions = [
  ["0.08", "8% · Rica en grasas"],
  ["0.10", "10% · Dieta mixta"],
  ["0.12", "12% · Alta en proteína"],
  ["0.15", "15% · Muy alta en proteína"],
];

function numberValue(value: number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

function parsePositive(value: string | number | null | undefined) {
  const parsed =
    typeof value === "number"
      ? value
      : Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatNumber(value: number, decimals = 0) {
  return value
    .toFixed(decimals)
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "");
}

function contextDefaults(key: string, label: string): NutritionContextSettings {
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

function contextsForWeek(
  week: TrainingDay[],
  saved: NutritionContextSettings[],
) {
  const required: Array<{ key: string; label: string }> = [
    { key: "rest", label: "Día de descanso" },
  ];
  week.forEach((day) => {
    if (day.mode !== "training") return;
    const label = day.name.trim() || "Entrenamiento";
    const key = trainingContextKey(label);
    if (!required.some((row) => row.key === key)) required.push({ key, label });
  });
  return required.map(({ key, label }) => {
    const stored = saved.find((context) => context.key === key);
    return stored
      ? { ...stored, label, meals: stored.meals.map((meal) => ({ ...meal })) }
      : contextDefaults(key, label);
  });
}

function MacroField({
  label,
  value,
  grams,
  gramsPerKg,
  onChange,
}: {
  label: string;
  value: number;
  grams: number;
  gramsPerKg: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="rounded-lg border border-slate-200 bg-white p-3">
      <span className={labelClass}>{label}</span>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          min="0"
          max="100"
          step="1"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className={inputClass}
        />
        <span className="text-sm text-slate-500">%</span>
      </div>
      <div className="mt-2 text-xs text-slate-500">
        {grams} g · {formatNumber(gramsPerKg, 2)} g/kg
      </div>
    </label>
  );
}

export function NutritionPlanForm({
  clientId,
  content,
  settings,
  meals,
  activePlan,
  reference,
}: NutritionPlanFormProps) {
  const [method, setMethod] = useState(settings.method);
  const [leanMassKg, setLeanMassKg] = useState(
    numberValue(settings.leanMassKg),
  );
  const [harrisWeightKg, setHarrisWeightKg] = useState(
    numberValue(settings.harrisWeightKg ?? reference.weightKg),
  );
  const [harrisHeightCm, setHarrisHeightCm] = useState(
    numberValue(settings.harrisHeightCm ?? reference.heightCm),
  );
  const [harrisAge, setHarrisAge] = useState(
    numberValue(settings.harrisAge ?? reference.age),
  );
  const [activityLevel, setActivityLevel] = useState(settings.activityLevel);
  const [thermalEffect, setThermalEffect] = useState(
    normalizeThermalEffect(settings.thermalEffect).toFixed(2),
  );
  const [week, setWeek] = useState<TrainingDay[]>(settings.week);
  const [storedContexts, setStoredContexts] = useState<
    NutritionContextSettings[]
  >(() =>
    settings.contexts.map((context) =>
      settings.legacyFormat && context.key === "rest"
        ? { ...context, meals: meals.map((meal) => ({ ...meal })) }
        : context,
    ),
  );
  const contexts = useMemo(
    () => contextsForWeek(week, storedContexts),
    [week, storedContexts],
  );
  const activityFactor = activityFactorForSex(activityLevel, reference.sex);
  const currentSettings: EnergySettings = useMemo(
    () => ({
      version: 2,
      method,
      leanMassKg: parsePositive(leanMassKg),
      harrisWeightKg: parsePositive(harrisWeightKg),
      harrisHeightCm: parsePositive(harrisHeightCm),
      harrisAge: parsePositive(harrisAge),
      activityLevel,
      activityFactor,
      thermalEffect: normalizeThermalEffect(Number(thermalEffect)),
      week,
      contexts,
      activeContextKey: contexts.some(
        (context) => context.key === settings.activeContextKey,
      )
        ? settings.activeContextKey
        : "rest",
    }),
    [
      method,
      leanMassKg,
      harrisWeightKg,
      harrisHeightCm,
      harrisAge,
      activityLevel,
      activityFactor,
      thermalEffect,
      week,
      contexts,
      settings.activeContextKey,
    ],
  );
  const energy = useMemo(
    () => calculateEnergyPlan({ settings: currentSettings, ...reference }),
    [currentSettings, reference],
  );

  function updateDay(index: number, patch: Partial<TrainingDay>) {
    setWeek((current) =>
      current.map((day, dayIndex) => {
        if (dayIndex !== index) return day;
        if (patch.mode === "rest") {
          return { ...day, ...patch, name: "", mets: null, durationMin: null };
        }
        if (patch.mode === "training" && day.mode === "rest") {
          return {
            ...day,
            ...patch,
            name: "Entrenamiento",
            mets: null,
            durationMin: null,
          };
        }
        return { ...day, ...patch };
      }),
    );
  }

  function updateContext(
    key: string,
    patch: Partial<NutritionContextSettings>,
  ) {
    setStoredContexts((current) => {
      const visible = contextsForWeek(week, current);
      return visible.map((context) =>
        context.key === key ? { ...context, ...patch } : context,
      );
    });
  }

  function updateMeal(key: string, index: number, value: number) {
    const context = contexts.find((row) => row.key === key);
    if (!context) return;
    const pct = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
    updateContext(key, {
      meals: context.meals.map((meal, mealIndex) =>
        mealIndex === index ? { ...meal, pct } : meal,
      ),
    });
  }

  const serializedSettings = JSON.stringify(currentSettings);
  const sexLabel = reference.sex === "female" ? "mujer" : "hombre";
  const hasHarrisData =
    parsePositive(harrisWeightKg) !== null &&
    parsePositive(harrisHeightCm) !== null &&
    parsePositive(harrisAge) !== null;

  if (!reference.sex) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Selecciona hombre o mujer en la ficha del cliente antes de calcular el
        plan nutricional.
        <a
          href={`/clients/${clientId}/edit`}
          className="ml-2 font-semibold underline"
        >
          Editar cliente
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form action={savePlan} className="space-y-6">
        <input type="hidden" name="client_id" value={clientId} />
        <input type="hidden" name="content" value={content} />
        <input
          type="hidden"
          name="energy_settings_payload"
          value={serializedSettings}
        />
        <input
          type="hidden"
          name="reference_weight_kg"
          value={reference.weightKg ?? ""}
        />
        <input
          type="hidden"
          name="reference_height_cm"
          value={reference.heightCm ?? ""}
        />
        <input type="hidden" name="reference_age" value={reference.age ?? ""} />
        <input type="hidden" name="reference_sex" value={reference.sex ?? ""} />

        <div className="grid gap-4 xl:grid-cols-2">
          <div className={panelClass}>
            <h3 className="text-sm font-semibold text-slate-900">
              1. Metabolismo basal
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className={labelClass}>Método</span>
                <select
                  value={method}
                  onChange={(event) =>
                    setMethod(
                      event.target.value === "harris" ? "harris" : "cunningham",
                    )
                  }
                  className={inputClass}
                >
                  <option value="cunningham">Cunningham (1980)</option>
                  <option value="harris">Harris-Benedict (1984)</option>
                </select>
              </label>
              {method === "cunningham" ? (
                <label className="space-y-1.5">
                  <span className={labelClass}>Masa libre de grasa (kg)</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={leanMassKg}
                    onChange={(event) => setLeanMassKg(event.target.value)}
                    className={inputClass}
                  />
                </label>
              ) : (
                <>
                  <label className="space-y-1.5">
                    <span className={labelClass}>Peso (kg)</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={harrisWeightKg}
                      onChange={(event) =>
                        setHarrisWeightKg(event.target.value)
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className={labelClass}>Altura (cm)</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={harrisHeightCm}
                      onChange={(event) =>
                        setHarrisHeightCm(event.target.value)
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className={labelClass}>Edad (años)</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={harrisAge}
                      onChange={(event) => setHarrisAge(event.target.value)}
                      className={inputClass}
                    />
                  </label>
                </>
              )}
            </div>
            <div className="mt-3 rounded-lg bg-white p-3 text-sm text-slate-600">
              {method === "harris" && !hasHarrisData ? (
                "Completa peso, altura y edad para calcular el GEB."
              ) : (
                <>
                  GEB estimado:{" "}
                  <strong className="text-emerald-800">
                    {Math.round(energy.baseMetabolicRate)} kcal/día
                  </strong>
                </>
              )}
            </div>
          </div>

          <div className={`flex h-full flex-col gap-3 ${panelClass}`}>
            <h3 className="text-sm font-semibold text-slate-900">
              2. Actividad diaria y TEF
            </h3>
            <p className="text-xs text-slate-500">
              Valores para {sexLabel}. El ejercicio se calcula aparte mediante
              MET.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {ACTIVITY_FACTOR_OPTIONS.map((option) => {
                const value =
                  reference.sex === "female" ? option.female : option.male;
                const selected = activityLevel === option.level;
                return (
                  <button
                    key={option.level}
                    type="button"
                    onClick={() => setActivityLevel(option.level)}
                    className={`rounded-lg border p-2 text-left transition ${
                      selected
                        ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <span className="block text-xs font-semibold">
                      {option.label}
                    </span>
                    <span className="mt-1 block text-lg font-semibold">
                      {value}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-auto grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className={labelClass}>
                  Efecto térmico de los alimentos
                </span>
                <select
                  value={thermalEffect}
                  onChange={(event) => setThermalEffect(event.target.value)}
                  className={inputClass}
                >
                  {thermalOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-lg bg-white p-3 text-sm text-slate-600 text-center content-center">
                GET sin ejercicio: <br />
                <strong className="text-emerald-800 text-3xl">
                  {Math.round(energy.restTotal)} kcal
                </strong>
              </div>
            </div>
          </div>
        </div>

        <div className={panelClass}>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                3. Semana de entrenamiento
              </h3>
            </div>
            <div className="text-sm text-slate-500">
              GET medio semanal:{" "}
              <strong className="text-emerald-800">
                {Math.round(energy.weeklyAverage)} kcal/día
              </strong>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {week.map((day, index) => {
              const result = energy.days[index];
              const dayLabel =
                WEEK_DAYS.find((candidate) => candidate.id === day.day)
                  ?.label ?? day.day;
              return (
                <div
                  key={day.day}
                  className="rounded-lg border border-slate-200 bg-white p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-slate-900">
                      {dayLabel}
                    </h4>
                    <select
                      value={day.mode}
                      onChange={(event) =>
                        updateDay(index, {
                          mode:
                            event.target.value === "training"
                              ? "training"
                              : "rest",
                        })
                      }
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                    >
                      <option value="rest">Descanso</option>
                      <option value="training">Entrenamiento</option>
                    </select>
                  </div>
                  {day.mode === "training" ? (
                    <div className="mt-3 space-y-2">
                      <input
                        value={day.name}
                        onChange={(event) =>
                          updateDay(index, { name: event.target.value })
                        }
                        placeholder="Nombre de la sesión"
                        className={inputClass}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={numberValue(day.mets)}
                          onChange={(event) =>
                            updateDay(index, {
                              mets: parsePositive(event.target.value),
                            })
                          }
                          placeholder="MET"
                          className={inputClass}
                        />
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={numberValue(day.durationMin)}
                          onChange={(event) =>
                            updateDay(index, {
                              durationMin: parsePositive(event.target.value),
                            })
                          }
                          placeholder="Minutos"
                          className={inputClass}
                        />
                      </div>
                      <div className="text-xs leading-5 text-slate-500">
                        GET:{" "}
                        <strong className="text-emerald-800">
                          {Math.round(result.total)} kcal
                        </strong>
                        <span className="ml-1 text-emerald-700">
                          (+{Math.round(result.increment)})
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 text-xs text-slate-500">
                      GET:{" "}
                      <strong className="text-emerald-800">
                        {Math.round(result.total)} kcal
                      </strong>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              4. Objetivos por contexto
            </h3>
          </div>
          {contexts.map((context) => {
            const referenceCalories = Math.round(
              contextReference(context.key, energy),
            );
            const calories = Math.round(
              context.calorieTarget && context.calorieTarget > 0
                ? context.calorieTarget
                : referenceCalories,
            );
            const proteinG = Math.round(
              (calories * context.proteinPct) / 100 / 4,
            );
            const carbsG = Math.round((calories * context.carbsPct) / 100 / 4);
            const fatG = Math.round((calories * context.fatPct) / 100 / 9);
            const macroTotal =
              context.proteinPct + context.carbsPct + context.fatPct;
            const mealTotal = context.meals.reduce(
              (total, meal) => total + meal.pct,
              0,
            );
            const mealDistributionValid = Math.abs(mealTotal - 100) <= 0.1;
            const mealDifference = Math.abs(100 - mealTotal);
            const mealErrorId = `meal-distribution-error-${context.key}`;
            return (
              <article
                key={context.key}
                className={`rounded-lg border p-4 ${
                  settings.activeContextKey === context.key
                    ? "border-emerald-300 bg-emerald-50/40"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-slate-900">
                      {context.label}
                    </h4>
                    <p className="mt-1 text-xs text-slate-500">
                      GET de referencia: {referenceCalories} kcal/día
                    </p>
                  </div>
                  {settings.activeContextKey === context.key ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
                      Plan activo
                    </span>
                  ) : null}
                </div>
                <div className="mt-4 grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
                  <div>
                    <label className="space-y-1.5">
                      <span className={labelClass}>Objetivo calórico</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={numberValue(
                          context.calorieTarget ?? referenceCalories,
                        )}
                        onChange={(event) =>
                          updateContext(context.key, {
                            calorieTarget: parsePositive(event.target.value),
                          })
                        }
                        className={inputClass}
                      />
                    </label>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {[
                        [0, "Mantenimiento"],
                        [-250, "−250"],
                        [-500, "−500"],
                        [250, "+250"],
                        [500, "+500"],
                      ].map(([delta, label]) => (
                        <button
                          key={String(label)}
                          type="button"
                          onClick={() =>
                            updateContext(context.key, {
                              calorieTarget: Math.max(
                                1,
                                referenceCalories + Number(delta),
                              ),
                            })
                          }
                          className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <MacroField
                      label="Proteína"
                      value={context.proteinPct}
                      grams={proteinG}
                      gramsPerKg={proteinG / energy.weight}
                      onChange={(value) =>
                        updateContext(context.key, { proteinPct: value })
                      }
                    />
                    <MacroField
                      label="Hidratos"
                      value={context.carbsPct}
                      grams={carbsG}
                      gramsPerKg={carbsG / energy.weight}
                      onChange={(value) =>
                        updateContext(context.key, { carbsPct: value })
                      }
                    />
                    <MacroField
                      label="Grasa"
                      value={context.fatPct}
                      grams={fatG}
                      gramsPerKg={fatG / energy.weight}
                      onChange={(value) =>
                        updateContext(context.key, { fatPct: value })
                      }
                    />
                  </div>
                </div>
                <div className="mt-4 rounded-lg bg-slate-50 p-3">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className={labelClass}>Distribución de comidas</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateContext(context.key, {
                          meals: DEFAULT_MEAL_DISTRIBUTION.map((meal) => ({
                            ...meal,
                          })),
                        })
                      }
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Restablecer
                    </button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
                    {context.meals.map((meal, index) => {
                      const mealRatio = meal.pct / 100;
                      const mealProteinG = Math.round(proteinG * mealRatio);
                      const mealCarbsG = Math.round(carbsG * mealRatio);
                      const mealFatG = Math.round(fatG * mealRatio);

                      return (
                        <label
                          key={`${context.key}-${meal.name}`}
                          className="rounded-md border border-slate-200 bg-white p-2"
                        >
                          <span className="text-xs font-medium text-slate-600">
                            {meal.name}
                          </span>
                          <div className="mt-1 flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={meal.pct}
                              onChange={(event) =>
                                updateMeal(
                                  context.key,
                                  index,
                                  Number(event.target.value),
                                )
                              }
                              aria-invalid={!mealDistributionValid}
                              aria-describedby={
                                mealDistributionValid ? undefined : mealErrorId
                              }
                              className={`w-full rounded border px-2 py-1 text-sm ${
                                mealDistributionValid
                                  ? "border-slate-200"
                                  : "border-red-300 bg-red-50"
                              }`}
                            />
                            <span className="text-xs text-slate-400">%</span>
                          </div>
                          <dl className="mt-2 space-y-1 border-t border-slate-100 pt-2 text-[11px]">
                            <div className="flex items-center justify-between gap-1">
                              <dt className="text-slate-500">Proteínas</dt>
                              <dd className="font-semibold text-blue-700">
                                {mealProteinG} g
                              </dd>
                            </div>
                            <div className="flex items-center justify-between gap-1">
                              <dt className="text-slate-500">Hidratos</dt>
                              <dd className="font-semibold text-orange-700">
                                {mealCarbsG} g
                              </dd>
                            </div>
                            <div className="flex items-center justify-between gap-1">
                              <dt className="text-slate-500">Grasas</dt>
                              <dd className="font-semibold text-pink-700">
                                {mealFatG} g
                              </dd>
                            </div>
                          </dl>
                        </label>
                      );
                    })}
                  </div>
                  {!mealDistributionValid ? (
                    <p
                      id={mealErrorId}
                      role="alert"
                      className="mt-3 text-xs font-semibold text-red-600"
                    >
                      {mealTotal > 100
                        ? `La distribución supera el 100%. Reduce ${formatNumber(mealDifference, 1)}%.`
                        : `La distribución no llega al 100%. Faltan ${formatNumber(mealDifference, 1)}%.`}
                    </p>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div
                    className={`text-xs font-semibold ${Math.abs(macroTotal - 100) <= 0.1 ? "text-emerald-700" : "text-red-600"}`}
                  >
                    Macronutrientes: {formatNumber(macroTotal, 1)}%
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="flex justify-end">
          <SubmitButton
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            pendingLabel="Guardando..."
            icon="save"
          >
            Guardar plan nutricional
          </SubmitButton>
        </div>
      </form>

      <div className="border-t border-slate-200 pt-4"></div>

      <form action={savePlan}>
        <input type="hidden" name="client_id" value={clientId} />
        <input type="hidden" name="save_mode" value="manual" />
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-semibold text-amber-950">
            Ajustes manuales del plan
          </h3>
          <p className="mt-1 text-xs text-amber-800">
            Sobrescriben el plan activo sin recalcular metabolismo, actividad,
            TEF ni entrenamientos.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["manual_calories", "Calorías", activePlan.calories],
              ["manual_protein_g", "Proteína (g)", activePlan.proteinG],
              ["manual_carbs_g", "Hidratos (g)", activePlan.carbsG],
              ["manual_fat_g", "Grasa (g)", activePlan.fatG],
            ].map(([name, label, value]) => (
              <label key={String(name)} className="space-y-1.5">
                <span className={labelClass}>{label}</span>
                <input
                  name={String(name)}
                  type="number"
                  required
                  min="0"
                  step="1"
                  defaultValue={value ?? ""}
                  className={inputClass}
                />
              </label>
            ))}
          </div>
          <label className="mt-4 block space-y-1.5">
            <span className={labelClass}>Notas del plan</span>
            <textarea
              name="content"
              rows={4}
              defaultValue={content}
              className={`${inputClass} min-h-24 leading-6`}
              placeholder="Indicaciones, observaciones y ajustes del plan..."
            />
          </label>
          <div className="mt-4 flex justify-end">
            <SubmitButton
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-amber-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
              pendingLabel="Guardando..."
              icon="save"
            >
              Guardar ajustes manuales
            </SubmitButton>
          </div>
        </div>
      </form>
    </div>
  );
}
