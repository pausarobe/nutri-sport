"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { savePlan } from "@/app/(app)/clients/actions";
import { SubmitButton } from "@/components/submit-button";
import type { ClientSex } from "@/lib/database.types";
import {
  calculateEnergyPlan,
  normalizeThermalEffect,
  type EnergySettings,
  type ExerciseSession,
  type MealDistribution,
} from "@/lib/nutrition-plan";

type NutritionPlanFormProps = {
  clientId: string;
  content: string;
  settings: EnergySettings;
  meals: MealDistribution[];
  reference: {
    weightKg: number | null;
    heightCm: number | null;
    age: number | null;
    sex: ClientSex | null;
  };
};

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";
const labelClass = "text-xs font-semibold uppercase tracking-wide text-slate-400";
const panelClass = "rounded-lg border border-slate-200 bg-slate-50 p-4";

const activityFactors = [
  ["1.20", "Sedentario"],
  ["1.375", "Ligeramente activo (1-2 d/sem)"],
  ["1.55", "Moderadamente activo (3-5 d/sem)"],
  ["1.725", "Muy activo (6-7 d/sem)"],
  ["1.90", "Extremadamente activo"],
];

const thermalOptions = [
  ["0.08", "8% - Rica en grasas"],
  ["0.10", "10% - Dieta mixta"],
  ["0.12", "12% - Alta proteina"],
  ["0.15", "15% - Muy alta proteina"],
];

function numberValue(value: number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

function parseNumber(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function thermalOptionValue(value: number | null | undefined) {
  return normalizeThermalEffect(value).toFixed(2);
}

function formatNumber(value: number, decimals = 0) {
  return value.toFixed(decimals).replace(/\.0$/, "");
}

function MiniStat({
  label,
  value,
  color = "#2d7a3a",
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
      <div className={labelClass}>{label}</div>
      <div className="mt-1 text-lg font-semibold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

export function NutritionPlanForm({
  clientId,
  content,
  settings,
  meals,
  reference,
}: NutritionPlanFormProps) {
  const [method, setMethod] = useState(settings.method);
  const [leanMassKg, setLeanMassKg] = useState(numberValue(settings.leanMassKg));
  const [activityFactor, setActivityFactor] = useState(String(settings.activityFactor));
  const [thermalEffect, setThermalEffect] = useState(thermalOptionValue(settings.thermalEffect));
  const [sessions, setSessions] = useState<ExerciseSession[]>(
    settings.exerciseSessions.length
      ? settings.exerciseSessions
      : [{ mets: null, durationMin: null, daysPerWeek: 1 }],
  );
  const [calorieTarget, setCalorieTarget] = useState(numberValue(settings.calorieTarget));
  const [proteinPct, setProteinPct] = useState(numberValue(settings.proteinPct));
  const [carbsPct, setCarbsPct] = useState(numberValue(settings.carbsPct));
  const [fatPct, setFatPct] = useState(numberValue(settings.fatPct));
  const [mealRows, setMealRows] = useState(meals);

  const currentSettings: EnergySettings = useMemo(
    () => ({
      method,
      leanMassKg: parseNumber(leanMassKg),
      activityFactor: parseNumber(activityFactor) ?? 1.55,
      thermalEffect: normalizeThermalEffect(parseNumber(thermalEffect)),
      exerciseSessions: sessions,
      calorieTarget: parseNumber(calorieTarget),
      proteinPct: parseNumber(proteinPct) ?? 30,
      carbsPct: parseNumber(carbsPct) ?? 45,
      fatPct: parseNumber(fatPct) ?? 25,
    }),
    [
      activityFactor,
      calorieTarget,
      carbsPct,
      fatPct,
      leanMassKg,
      method,
      proteinPct,
      sessions,
      thermalEffect,
    ],
  );
  const energy = calculateEnergyPlan({
    settings: currentSettings,
    weightKg: reference.weightKg,
    heightCm: reference.heightCm,
    age: reference.age,
    sex: reference.sex,
  });
  const macroTotal =
    currentSettings.proteinPct + currentSettings.carbsPct + currentSettings.fatPct;

  const updateSession = (
    index: number,
    key: keyof ExerciseSession,
    value: string,
  ) => {
    setSessions((previous) =>
      previous.map((session, sessionIndex) =>
        sessionIndex === index ? { ...session, [key]: parseNumber(value) } : session,
      ),
    );
  };
  const macroRows = [
    {
      label: "Proteinas",
      name: "protein_pct",
      pct: proteinPct,
      setPct: setProteinPct,
      grams: energy.proteinG,
      kcalPerGram: 4,
      color: "#2563eb",
    },
    {
      label: "Hidratos",
      name: "carbs_pct",
      pct: carbsPct,
      setPct: setCarbsPct,
      grams: energy.carbsG,
      kcalPerGram: 4,
      color: "#c45a00",
    },
    {
      label: "Grasas",
      name: "fat_pct",
      pct: fatPct,
      setPct: setFatPct,
      grams: energy.fatG,
      kcalPerGram: 9,
      color: "#be185d",
    },
  ];

  return (
    <form action={savePlan} className="space-y-5">
      <input type="hidden" name="client_id" value={clientId} />
      <input type="hidden" name="reference_weight_kg" value={reference.weightKg ?? ""} />
      <input type="hidden" name="reference_height_cm" value={reference.heightCm ?? ""} />
      <input type="hidden" name="reference_age" value={reference.age ?? ""} />
      <input type="hidden" name="reference_sex" value={reference.sex ?? ""} />
      <input type="hidden" name="exercise_sessions" value={JSON.stringify(sessions)} />

      <div className={panelClass}>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          Calculadora de gasto energetico
        </h3>
        <div className="mb-4 grid gap-2 sm:grid-cols-2">
          {[
            ["cunningham", "Cunningham (1980)"],
            ["harris", "Harris-Benedict (1984)"],
          ].map(([value, label]) => (
            <label key={value} className="cursor-pointer">
              <input
                className="peer sr-only"
                type="radio"
                name="energy_method"
                value={value}
                checked={method === value}
                onChange={() => setMethod(value as EnergySettings["method"])}
              />
              <span className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition peer-checked:border-emerald-700 peer-checked:bg-emerald-50 peer-checked:text-emerald-800">
                {label}
              </span>
            </label>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <div className={labelClass}>Peso actual</div>
            <div className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600">
              {formatNumber(energy.weight, 1)} kg
            </div>
          </div>
          {method === "cunningham" ? (
            <label className="space-y-1.5">
              <span className={labelClass}>Masa magra (kg)</span>
              <input
                name="lean_mass_kg"
                type="number"
                step="0.1"
                min="0"
                inputMode="decimal"
                value={leanMassKg}
                placeholder={energy.leanMass.toFixed(1)}
                className={inputClass}
                onChange={(event) => setLeanMassKg(event.target.value)}
              />
            </label>
          ) : (
            <>
              <div>
                <div className={labelClass}>Altura</div>
                <div className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600">
                  {formatNumber(energy.height, 1)} cm
                </div>
              </div>
              <div>
                <div className={labelClass}>Edad</div>
                <div className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600">
                  {reference.age ?? 25} anos
                </div>
              </div>
            </>
          )}
          <div>
            <div className={labelClass}>TMB calculada</div>
            <div className="mt-1 text-2xl font-semibold text-emerald-800">
              {Math.round(energy.baseMetabolicRate)}
              <span className="ml-1 text-sm font-normal text-slate-400">kcal/dia</span>
            </div>
          </div>
        </div>
      </div>

      <div className={panelClass}>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          Factor de actividad (FA)
        </h3>
        <div className="space-y-2">
          {activityFactors.map(([value, label]) => (
            <label key={value} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 transition has-[:checked]:border-emerald-700 has-[:checked]:bg-emerald-50">
              <input
                type="radio"
                name="activity_factor"
                value={value}
                checked={activityFactor === value}
                className="h-4 w-4 accent-emerald-800"
                onChange={() => setActivityFactor(value)}
              />
              <span className="flex-1 text-sm font-medium text-slate-700">{label}</span>
              <span className="text-sm font-semibold text-emerald-800">{value}</span>
            </label>
          ))}
        </div>
        <div className="mt-3 flex justify-between rounded-lg bg-white px-3 py-2 text-sm">
          <span className="text-slate-500">TMB x FA</span>
          <span className="font-semibold text-emerald-800">
            {Math.round(energy.baseMetabolicRate)} x {currentSettings.activityFactor} ={" "}
            {Math.round(energy.activity)} kcal/dia
          </span>
        </div>
      </div>

      <div className={panelClass}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900">
            Gasto inducido por el ejercicio (GIE)
          </h3>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            onClick={() =>
              setSessions((previous) => [
                ...previous,
                { mets: null, durationMin: null, daysPerWeek: 1 },
              ])
            }
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Sesion
          </button>
        </div>
        <div className="hidden grid-cols-[1fr_90px_110px_100px_36px] gap-2 px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 md:grid">
          <div>METs</div>
          <div>Dias/sem</div>
          <div>Duracion</div>
          <div>Kcal/dia</div>
          <div />
        </div>
        <div className="space-y-2">
          {sessions.map((session, index) => {
            const mets = session.mets ?? 0;
            const durationMin = session.durationMin ?? 0;
            const daysPerWeek = session.daysPerWeek ?? 0;
            const sessionEnergy =
              mets > 0 && durationMin > 0 && daysPerWeek > 0
                ? (mets * energy.weight * (durationMin / 60) * daysPerWeek) / 7
                : 0;

            return (
              <div key={index} className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-[1fr_90px_110px_100px_36px] md:items-center">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  inputMode="decimal"
                  value={numberValue(session.mets)}
                  placeholder="8.0"
                  className={`${inputClass} text-center`}
                  aria-label="METs"
                  onChange={(event) => updateSession(index, "mets", event.target.value)}
                />
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  inputMode="decimal"
                  value={numberValue(session.daysPerWeek)}
                  placeholder="3"
                  className={`${inputClass} text-center`}
                  aria-label="Dias por semana"
                  onChange={(event) => updateSession(index, "daysPerWeek", event.target.value)}
                />
                <input
                  type="number"
                  step="1"
                  min="0"
                  inputMode="numeric"
                  value={numberValue(session.durationMin)}
                  placeholder="60"
                  className={`${inputClass} text-center`}
                  aria-label="Duracion en minutos"
                  onChange={(event) => updateSession(index, "durationMin", event.target.value)}
                />
                <div className="rounded-lg bg-blue-50 px-3 py-2 text-center text-sm font-semibold text-blue-700">
                  {sessionEnergy > 0 ? Math.round(sessionEnergy) : "--"}
                </div>
                {sessions.length > 1 ? (
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    aria-label="Eliminar sesion"
                    onClick={() =>
                      setSessions((previous) =>
                        previous.filter((_, sessionIndex) => sessionIndex !== index),
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : (
                  <span />
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex justify-between rounded-lg bg-white px-3 py-2 text-sm">
          <span className="text-slate-500">Total GIE</span>
          <span className="font-semibold text-blue-700">
            {Math.round(energy.exercise)} kcal/dia
          </span>
        </div>
      </div>

      <div className={panelClass}>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          Efecto termico de los alimentos (ETA)
        </h3>
        <div className="flex flex-wrap gap-2">
          {thermalOptions.map(([value, label]) => (
            <label key={value} className="cursor-pointer">
              <input
                className="peer sr-only"
                type="radio"
                name="thermal_effect"
                value={value}
                checked={thermalEffect === value}
                onChange={() => setThermalEffect(value)}
              />
              <span className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition peer-checked:border-pink-700 peer-checked:bg-pink-50 peer-checked:text-pink-700">
                {label}
              </span>
            </label>
          ))}
        </div>
        <div className="mt-3 flex justify-between rounded-lg bg-white px-3 py-2 text-sm">
          <span className="text-slate-500">
            ETA ({Math.round(normalizeThermalEffect(currentSettings.thermalEffect) * 100)}%)
          </span>
          <span className="font-semibold text-pink-700">
            {Math.round(energy.activity + energy.exercise)} x{" "}
            {Math.round(normalizeThermalEffect(currentSettings.thermalEffect) * 100)}% ={" "}
            {Math.round(energy.thermal)} kcal/dia
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          Resultado - gasto energetico total (GET)
        </h3>
        <div className="grid gap-3 sm:grid-cols-5">
          <MiniStat label="TMB" value={Math.round(energy.baseMetabolicRate)} />
          <MiniStat label="x FA" value={`x${currentSettings.activityFactor}`} color="#2563eb" />
          <MiniStat label="+ GIE" value={`+${Math.round(energy.exercise)}`} color="#c45a00" />
          <MiniStat label="+ ETA" value={`+${Math.round(energy.thermal)}`} color="#be185d" />
          <MiniStat label="= GET" value={Math.round(energy.total)} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(220px,320px)_minmax(0,1fr)]">
          <div className="rounded-lg border border-emerald-200 bg-white p-4">
            <div className={labelClass}>GET total</div>
            <div className="mt-1 text-4xl font-semibold text-emerald-800">
              {Math.round(energy.total)}
            </div>
            <div className="text-sm text-slate-500">kcal/dia</div>
            <label className="mt-4 block space-y-1.5">
              <span className={labelClass}>Objetivo calorico</span>
              <input
                name="calorie_target"
                type="number"
                step="1"
                min="0"
                inputMode="numeric"
                value={calorieTarget}
                placeholder={Math.round(energy.total).toString()}
                className={inputClass}
                onChange={(event) => setCalorieTarget(event.target.value)}
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                ["Mantenimiento", 0],
                ["-250 kcal", -250],
                ["-500 kcal", -500],
                ["+250 kcal", 250],
                ["+500 kcal", 500],
              ].map(([label, delta]) => (
                <button
                  key={String(label)}
                  type="button"
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                  onClick={() => setCalorieTarget(String(Math.round(energy.total + Number(delta))))}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">
              Distribucion macronutrientes
            </h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {macroRows.map((row) => (
                <div key={row.name} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-700">{row.label}</span>
                    <label className="flex items-center gap-1">
                      <input
                        name={row.name}
                        type="number"
                        step="1"
                        min="0"
                        value={row.pct}
                        className="w-14 rounded-md border border-slate-300 px-2 py-1 text-center text-sm font-semibold outline-none focus:border-emerald-700"
                        onChange={(event) => row.setPct(event.target.value)}
                      />
                      <span className="text-xs text-slate-400">%</span>
                    </label>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, parseNumber(row.pct) ?? 0)}%`,
                        backgroundColor: row.color,
                      }}
                    />
                  </div>
                  <div className="mt-2 text-lg font-semibold" style={{ color: row.color }}>
                    {row.grams} g
                  </div>
                  <div className="text-xs text-slate-400">
                    {Math.round(row.grams * row.kcalPerGram)} kcal
                  </div>
                </div>
              ))}
            </div>
            {Math.abs(macroTotal - 100) > 1 ? (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                La suma de macros debe ser 100%.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className={panelClass}>
        <h3 className="text-sm font-semibold text-slate-900">Distribucion por comida</h3>
        <p className="mt-1 text-sm text-slate-500">
          El porcentaje reparte automaticamente los gramos diarios de cada macro.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {mealRows.map((meal, index) => (
            <div key={meal.name} className="rounded-lg border border-slate-200 bg-white p-3">
              <input type="hidden" name={`meal_${index}_name`} value={meal.name} />
              <div className="mb-2 text-center text-sm font-semibold text-slate-900">
                {meal.name}
              </div>
              <label className="mb-3 flex items-center justify-center gap-1">
                <input
                  name={`meal_${index}_pct`}
                  type="number"
                  step="0.1"
                  min="0"
                  value={meal.pct}
                  className="w-16 rounded-md border border-slate-300 px-2 py-1 text-center text-sm font-semibold text-emerald-800 outline-none focus:border-emerald-700"
                  onChange={(event) =>
                    setMealRows((previous) =>
                      previous.map((row, rowIndex) =>
                        rowIndex === index
                          ? { ...row, pct: Number(event.target.value) || 0 }
                          : row,
                      ),
                    )
                  }
                />
                <span className="text-xs text-slate-400">%</span>
              </label>
              {[
                ["Prot.", energy.proteinG, "#2563eb"],
                ["Hidr.", energy.carbsG, "#c45a00"],
                ["Gras.", energy.fatG, "#be185d"],
              ].map(([label, grams, color]) => (
                <div key={String(label)} className="flex justify-between border-t border-slate-100 py-1 text-xs">
                  <span className="text-slate-400">{label}</span>
                  <span className="font-semibold" style={{ color: String(color) }}>
                    {Math.round((Number(grams) * meal.pct) / 100)} g
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <label className="block space-y-1.5">
        <span className={labelClass}>Notas del plan</span>
        <textarea
          name="content"
          defaultValue={content}
          rows={8}
          className="min-h-48 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          placeholder="Comidas, porciones, hidratacion, recordatorios y notas de revision."
        />
      </label>
      <div className="flex justify-end">
        <SubmitButton
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          pendingLabel="Guardando..."
          icon="save"
        >
          Guardar plan
        </SubmitButton>
      </div>
    </form>
  );
}
