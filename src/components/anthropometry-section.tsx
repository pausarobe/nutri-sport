"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Pencil,
  Plus,
  Printer,
  Trash2,
  X,
} from "lucide-react";
import {
  addClientAnthropometry,
  deleteClientAnthropometry,
  deleteClientAnthropometryBulk,
  updateClientAnthropometry,
} from "@/app/(app)/clients/actions";
import { SubmitButton } from "@/components/submit-button";
import {
  BODY_FAT_FORMULAS,
  calculateAnthropometry,
  calculateMedian,
  DIAMETER_FIELDS,
  GIRTH_FIELDS,
  isRestrictedProfile,
  measurementMapFromJson,
  RACE_LABELS,
  SKINFOLD_FIELDS,
  skinfoldSums,
  type BodyFatFormula,
  type MeasurementField,
  type MeasurementMap,
} from "@/lib/anthropometry";
import type {
  Client,
  ClientAnthropometryAssessment,
  ClientNote,
  Json,
} from "@/lib/database.types";

type AnthropometrySectionProps = {
  client: Client;
  assessments: ClientAnthropometryAssessment[];
  supplementNotes: ClientNote[];
  today: string;
  defaultWeight: number | null;
};

type MeasurementGroup = "skinfolds" | "girths" | "diameters";
type ConfirmAction =
  | { type: "assessment"; id: string }
  | { type: "bulk" }
  | null;

const inputClass =
  "clinical-input";
const labelClass = "clinical-label";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00`));
}

function ageAtDate(birthDate: string | null, measuredAt: string) {
  if (!birthDate) return null;
  const birth = new Date(`${birthDate}T00:00:00`);
  const target = new Date(`${measuredAt.slice(0, 10)}T00:00:00`);
  let years = target.getFullYear() - birth.getFullYear();
  const month = target.getMonth() - birth.getMonth();
  if (month < 0 || (month === 0 && target.getDate() < birth.getDate())) years -= 1;
  return years >= 0 ? years : null;
}

function objectJson(value: Json | null | undefined): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function rawReadings(
  assessment: ClientAnthropometryAssessment | null,
  group: MeasurementGroup,
  key: string,
  fallback: number,
) {
  if (!assessment) return ["", "", ""];
  const groupValue = objectJson(objectJson(assessment.measurements3)[group]);
  const stored = groupValue[key];
  if (Array.isArray(stored)) {
    return [0, 1, 2].map((index) => {
      const value = stored[index];
      return typeof value === "number" && value > 0 ? value : "";
    });
  }
  return [fallback > 0 ? fallback : "", "", ""];
}

function assessmentMaps(assessment: ClientAnthropometryAssessment) {
  return {
    skinfolds: measurementMapFromJson(assessment.skinfolds, SKINFOLD_FIELDS),
    girths: measurementMapFromJson(assessment.girths, GIRTH_FIELDS),
    diameters: measurementMapFromJson(assessment.diameters, DIAMETER_FIELDS),
  };
}

function Modal({
  title,
  description,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#131b2e]/45 p-4 backdrop-blur-sm print:static print:block print:bg-white print:p-0">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`my-4 w-full overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_20px_35px_-5px_rgba(15,23,42,0.16),0_8px_16px_-6px_rgba(15,23,42,0.08)] print:my-0 print:max-w-none print:rounded-none print:shadow-none ${wide ? "max-w-6xl" : "max-w-3xl"}`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur-xl print:hidden">
          <div>
            <h2 className="text-lg font-bold tracking-[-0.02em] text-[#003626]">{title}</h2>
            {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 print:p-0">{children}</div>
      </div>
    </div>
  );
}

function MeasurementInputs({
  title,
  prefix,
  fields,
  assessment,
}: {
  title: string;
  prefix: MeasurementGroup;
  fields: MeasurementField[];
  assessment: ClientAnthropometryAssessment | null;
}) {
  const finalValues = assessment
    ? measurementMapFromJson(assessment[prefix], fields)
    : ({} as MeasurementMap);
  return (
    <div className="rounded-xl border border-slate-200 bg-[#f7f8ff] p-4">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <div className="mt-3 grid grid-cols-[minmax(80px,1fr)_repeat(3,minmax(42px,70px))_48px_46px] gap-1.5 text-[0.6rem] font-semibold uppercase tracking-wide text-slate-400">
        <span>Medida</span><span className="text-center">1.ª</span><span className="text-center">2.ª</span><span className="text-center">3.ª</span><span className="text-center">Final</span><span className="text-center">Estado</span>
      </div>
      <div className="mt-2 space-y-2">
        {fields.map((field) => {
          const readings = rawReadings(assessment, prefix, field.key, finalValues[field.key] ?? 0);
          return (
            <MeasurementReadingRow
              key={field.key}
              prefix={prefix}
              field={field}
              initialReadings={readings}
            />
          );
        })}
      </div>
    </div>
  );
}

function MeasurementReadingRow({
  prefix,
  field,
  initialReadings,
}: {
  prefix: MeasurementGroup;
  field: MeasurementField;
  initialReadings: Array<string | number>;
}) {
  const [readings, setReadings] = useState(() =>
    initialReadings.map((value) => String(value)),
  );
  const numeric = readings
    .map((value) => Number(value.replace(",", ".")))
    .filter((value) => Number.isFinite(value) && value > 0);
  const finalValue = calculateMedian(numeric);
  const deviation =
    numeric.length >= 2 && finalValue > 0
      ? Math.max(...numeric.map((value) => Math.abs(value - finalValue))) /
        finalValue
      : null;
  const threshold = prefix === "skinfolds" ? 0.05 : 0.01;
  const valid = deviation === null || deviation <= threshold;

  return (
    <div
      className={`grid grid-cols-[minmax(80px,1fr)_repeat(3,minmax(42px,70px))_48px_46px] items-center gap-1.5 rounded-md px-1 py-0.5 ${
        numeric.length >= 3 && !valid ? "bg-red-50" : ""
      }`}
    >
      <label htmlFor={`${prefix}_${field.key}_1`} className="text-xs text-slate-600">
        {field.label}
      </label>
      {[0, 1, 2].map((index) => (
        <input
          key={index}
          id={`${prefix}_${field.key}_${index + 1}`}
          name={`${prefix}_${field.key}_${index + 1}`}
          type="number"
          min="0"
          step="0.01"
          value={readings[index]}
          onChange={(event) =>
            setReadings((current) =>
              current.map((value, readingIndex) =>
                readingIndex === index ? event.target.value : value,
              ),
            )
          }
          placeholder={index === 0 ? field.unit : ""}
          className={`w-full rounded-md border bg-white px-1 py-1.5 text-center text-xs outline-none focus:border-emerald-700 ${
            index === 2 && numeric.length >= 3 && !valid
              ? "border-red-400"
              : "border-slate-300"
          }`}
        />
      ))}
      <span className="text-center text-xs font-semibold" style={{ color: field.color }}>
        {finalValue > 0 ? finalValue.toFixed(1) : "--"}
      </span>
      <span
        className={`text-center text-[0.6rem] font-semibold ${
          deviation === null
            ? "text-slate-300"
            : valid
              ? "text-emerald-700"
              : "text-red-600"
        }`}
      >
        {deviation === null
          ? "--"
          : valid
            ? "OK"
            : numeric.length < 3
              ? "3.ª"
              : `${(deviation * 100).toFixed(1)}%`}
      </span>
    </div>
  );
}

function AssessmentForm({
  client,
  assessment,
  today,
  defaultWeight,
}: {
  client: Client;
  assessment: ClientAnthropometryAssessment | null;
  today: string;
  defaultWeight: number | null;
}) {
  return (
    <form action={assessment ? updateClientAnthropometry : addClientAnthropometry} className="space-y-4">
      <input type="hidden" name="client_id" value={client.id} />
      {assessment ? <input type="hidden" name="assessment_id" value={assessment.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1.5">
          <span className={labelClass}>Fecha</span>
          <input name="measured_at" type="date" required defaultValue={assessment?.measured_at ?? today} className={inputClass} />
        </label>
        <label className="space-y-1.5">
          <span className={labelClass}>Peso (kg)</span>
          <input name="weight_kg" type="number" required min="0" step="0.1" defaultValue={assessment?.weight_kg ?? defaultWeight ?? ""} className={inputClass} />
        </label>
        <label className="space-y-1.5">
          <span className={labelClass}>Altura (cm)</span>
          <input name="height_cm" type="number" required min="0" step="0.1" defaultValue={assessment?.height_cm ?? client.height_cm ?? ""} className={inputClass} />
        </label>
        <label className="space-y-1.5">
          <span className={labelClass}>Sexo</span>
          <select name="sex" required defaultValue={assessment?.sex ?? client.sex ?? ""} className={inputClass}>
            <option value="" disabled>Selecciona</option>
            <option value="male">Hombre</option>
            <option value="female">Mujer</option>
          </select>
        </label>
        <label className="space-y-1.5">
          <span className={labelClass}>Raza/etnia</span>
          <select name="race" defaultValue={assessment?.race ?? "caucasian"} className={inputClass}>
            {Object.entries(RACE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className={labelClass}>Altura sentada (cm)</span>
          <input name="sitting_height_cm" type="number" min="0" step="0.1" defaultValue={assessment?.sitting_height_cm ?? ""} className={inputClass} />
        </label>
        <label className="space-y-1.5">
          <span className={labelClass}>Envergadura (cm)</span>
          <input name="arm_span_cm" type="number" min="0" step="0.1" defaultValue={assessment?.arm_span_cm ?? ""} className={inputClass} />
        </label>
        <div className="rounded-lg bg-blue-50 p-3 text-xs leading-5 text-blue-800">
          La raza/etnia se aplica a Lee 2000 y a la conversión de densidad a grasa.
        </div>
      </div>
      <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
        Introduce la primera y segunda lectura. Añade la tercera si difieren más de un 5% en pliegues o de un 1% en perímetros y diámetros.
      </p>
      <div className="grid gap-4 xl:grid-cols-3">
        <MeasurementInputs title="Pliegues (mm)" prefix="skinfolds" fields={SKINFOLD_FIELDS} assessment={assessment} />
        <MeasurementInputs title="Perímetros (cm)" prefix="girths" fields={GIRTH_FIELDS} assessment={assessment} />
        <MeasurementInputs title="Diámetros (cm)" prefix="diameters" fields={DIAMETER_FIELDS} assessment={assessment} />
      </div>
      <label className="block space-y-1.5">
        <span className={labelClass}>Notas</span>
        <textarea name="notes" rows={3} defaultValue={assessment?.notes ?? ""} className={`${inputClass} min-h-20 leading-6`} />
      </label>
      <div className="flex justify-end">
        <SubmitButton className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700" pendingLabel="Guardando..." icon="save">
          {assessment ? "Guardar cambios" : "Guardar valoración"}
        </SubmitButton>
      </div>
    </form>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className={labelClass}>{label}</div>
      <div className="mt-2 text-xl font-bold tracking-[-0.02em] text-[#003626]">{value}</div>
    </div>
  );
}

function MeasureList({ title, fields, values }: { title: string; fields: MeasurementField[]; values: MeasurementMap }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      <div className="mt-2 space-y-1.5">
        {fields.map((field) => (
          <div key={field.key} className="flex justify-between gap-3 text-xs">
            <span className="text-slate-500">{field.label}</span>
            <strong className="text-slate-800">{values[field.key] || "--"} {values[field.key] ? field.unit : ""}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function MeasurementBars({
  title,
  fields,
  values,
  scale,
}: {
  title: string;
  fields: MeasurementField[];
  values: MeasurementMap;
  scale: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 print:p-1.5">
      <h4 className="text-sm font-semibold text-slate-900 print:text-[10px]">{title}</h4>
      <div className="mt-3 space-y-2 print:mt-1 print:space-y-1">
        {fields.map((field) => {
          const value = values[field.key] ?? 0;
          return (
            <div key={field.key} className="grid grid-cols-[108px_minmax(0,1fr)_50px] items-center gap-2 print:grid-cols-[76px_minmax(0,1fr)_34px] print:gap-1">
              <span className="text-xs text-slate-600 print:text-[8px]">{field.label}</span>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 print:h-1">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (value / scale) * 100)}%`,
                    backgroundColor: field.color,
                  }}
                />
              </div>
              <span className="text-right text-xs font-semibold print:text-[8px]" style={{ color: field.color }}>
                {value > 0 ? value : "--"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CompositionBar({ result }: { result: NonNullable<ReturnType<typeof calculateAnthropometry>> }) {
  const segments = [
    { label: "Grasa", value: Number(result.pctGrass), color: "#f43f5e" },
    { label: "Muscular", value: Number(result.pctMusc), color: "#0284c7" },
    { label: "Ósea", value: Number(result.pctOssi), color: "#0b4f3a" },
    { label: "Residual", value: Number(result.pctResid), color: "#94a3b8" },
  ];
  return (
    <div>
      <div className="flex h-8 overflow-hidden rounded-lg shadow-sm print:h-4">
        {segments.map((segment) => (
          <div
            key={segment.label}
            className="flex items-center justify-center text-xs font-semibold text-white print:text-[7px]"
            style={{ width: `${Math.max(0, segment.value)}%`, backgroundColor: segment.color }}
          >
            {segment.value > 8 ? `${segment.value.toFixed(1)}%` : ""}
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 print:mt-1 print:text-[7px]">
        {segments.map((segment) => (
          <span key={segment.label} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: segment.color }} />
            {segment.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function ZScoreRow({
  label,
  value,
  unit,
  z,
  color,
}: {
  label: string;
  value: number | string;
  unit: string;
  z: number | undefined;
  color: string;
}) {
  if (z === undefined) return null;
  const zColor = Math.abs(z) <= 1 ? "#2d7a3a" : Math.abs(z) <= 2 ? "#c45a00" : "#e05252";
  const zLabel = Math.abs(z) <= 1 ? "Normal" : Math.abs(z) <= 2 ? "Atención" : "Alejado";
  return (
    <div className="grid grid-cols-[minmax(88px,1fr)_58px_minmax(46px,1fr)_42px_60px] items-center gap-2 border-b border-slate-100 py-1.5 print:grid-cols-[70px_42px_minmax(34px,1fr)_30px_43px] print:gap-1 print:py-0.5">
      <span className="text-xs text-slate-700 print:text-[7px]">{label}</span>
      <span className="text-right text-xs font-semibold print:text-[7px]" style={{ color }}>
        {value}<span className="ml-0.5 font-normal text-slate-400">{unit}</span>
      </span>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-slate-200 print:h-1">
        <div
          className="absolute top-0 h-full rounded-full"
          style={{
            width: `${Math.min(50, (Math.abs(z) / 3) * 50)}%`,
            left: z < 0 ? `${50 - Math.min(50, (Math.abs(z) / 3) * 50)}%` : "50%",
            backgroundColor: zColor,
          }}
        />
        <div className="absolute bottom-0 left-1/2 top-0 w-px bg-slate-400" />
      </div>
      <span className="text-right text-xs font-semibold print:text-[7px]" style={{ color: zColor }}>
        {z >= 0 ? "+" : ""}{z}
      </span>
      <span className="rounded bg-slate-100 px-1 py-1 text-center text-[0.6rem] font-semibold print:text-[6px]" style={{ color: zColor }}>
        {zLabel}
      </span>
    </div>
  );
}

function Somatogram({
  points,
  selectedId,
}: {
  points: Array<{ id: string; x: number; y: number; label?: string }>;
  selectedId: string;
}) {
  const width = 280;
  const height = 280;
  const left = width * 0.1;
  const right = width * 0.1;
  const top = height * 0.13;
  const bottom = height * 0.12;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const toX = (value: number) => left + ((value + 9) / 18) * plotWidth;
  const toY = (value: number) => top + ((9 - value) / 18) * plotHeight;
  const meso = { x: width / 2, y: top + 10 };
  const endo = { x: left, y: height - bottom - 8 };
  const ecto = { x: width - right, y: height - bottom - 8 };
  const outline = `M ${meso.x} ${meso.y} Q ${width * 0.22} ${height * 0.28} ${endo.x} ${endo.y} Q ${width * 0.5} ${height * 0.97} ${ecto.x} ${ecto.y} Q ${width * 0.78} ${height * 0.28} ${meso.x} ${meso.y}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mx-auto w-full max-w-[280px]" aria-label="Somatograma">
      <rect width={width} height={height} fill="#fff" />
      <path d={outline} fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="6 4" />
      <line x1={meso.x} y1={meso.y} x2={width / 2} y2={endo.y + 12} stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="3 2" />
      <line x1={width * 0.18} y1={height * 0.43} x2={ecto.x} y2={ecto.y} stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="3 2" />
      <line x1={width * 0.82} y1={height * 0.43} x2={endo.x} y2={endo.y} stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="3 2" />
      <text x={meso.x - 27} y="22" fontSize="9" fill="#334155">MESOMORFO</text>
      <text x={endo.x - 16} y={height - 5} fontSize="9" fill="#334155">ENDOMORFO</text>
      <text x={ecto.x - 35} y={height - 5} fontSize="9" fill="#334155">ECTOMORFO</text>
      {points.map((point, index) => {
        if (index === 0) return null;
        return (
          <line
            key={`${point.id}-line`}
            x1={toX(points[index - 1].x)}
            y1={toY(points[index - 1].y)}
            x2={toX(point.x)}
            y2={toY(point.y)}
            stroke="#94a3b8"
            strokeWidth="1.2"
            strokeDasharray="3 2"
          />
        );
      })}
      {points.map((point) => {
        const selected = point.id === selectedId;
        const px = toX(point.x);
        const py = toY(point.y);
        return (
          <g key={point.id}>
            {selected ? <circle cx={px} cy={py} r="10" fill="#10b981" opacity="0.16" /> : null}
            <circle cx={px} cy={py} r={selected ? 5.5 : 4} fill={selected ? "#0b4f3a" : "#0284c7"} />
            <text x={px + 7} y={py + 3} fill={selected ? "#0b4f3a" : "#0284c7"} fontSize="7.5" fontWeight={selected ? "bold" : "400"}>
              {point.label ?? ""}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Report({
  client,
  assessment,
  assessments,
  supplements,
  embedded = false,
}: {
  client: Client;
  assessment: ClientAnthropometryAssessment;
  assessments: ClientAnthropometryAssessment[];
  supplements: ClientNote[];
  embedded?: boolean;
}) {
  const [formula, setFormula] = useState<BodyFatFormula>("yuhasz");
  const maps = assessmentMaps(assessment);
  const age = ageAtDate(client.birth_date, assessment.measured_at);
  const result = calculateAnthropometry({
    weightKg: assessment.weight_kg,
    heightCm: assessment.height_cm,
    sittingHeightCm: assessment.sitting_height_cm,
    armSpanCm: assessment.arm_span_cm,
    sex: assessment.sex ?? client.sex,
    age,
    race: assessment.race,
    formula,
    ...maps,
  });
  const comparisonPoints = assessments
    .map((row) => {
      const rowMaps = assessmentMaps(row);
      const calc = calculateAnthropometry({
        weightKg: row.weight_kg,
        heightCm: row.height_cm,
        sittingHeightCm: row.sitting_height_cm,
        armSpanCm: row.arm_span_cm,
        sex: row.sex ?? client.sex,
        age: ageAtDate(client.birth_date, row.measured_at),
        race: row.race,
        formula,
        ...rowMaps,
      });
      return calc
        ? {
            id: row.id,
            x: Number(calc.somatX),
            y: Number(calc.somatY),
            label: formatDate(row.measured_at).slice(0, 5),
          }
        : null;
    })
    .filter(
      (row): row is { id: string; x: number; y: number; label: string } =>
        Boolean(row),
    );
  const zRows = result
    ? [
        { key: "pes", label: "Peso", value: assessment.weight_kg, unit: "kg", color: "#64748b" },
        ...SKINFOLD_FIELDS.map((field) => ({ key: field.key, label: field.label, value: maps.skinfolds[field.key], unit: "mm", color: field.color })),
        ...GIRTH_FIELDS.map((field) => ({ key: field.key === "cuixa" ? "cuixa_per" : field.key, label: field.label, value: maps.girths[field.key], unit: "cm", color: field.color })),
        ...DIAMETER_FIELDS.map((field) => ({ key: field.key, label: field.label, value: maps.diameters[field.key], unit: "cm", color: field.color })),
        { key: "brac_corr", label: "Brazo corregido", value: result.brCorGen, unit: "cm", color: "#c45a00" },
        { key: "cama_corr", label: "Pierna corregida", value: result.camaCorGen, unit: "cm", color: "#c45a00" },
        { key: "pGras", label: "Masa grasa", value: result.pGras, unit: "kg", color: "#c45a00" },
        { key: "pMusc", label: "Masa muscular", value: result.pMusc, unit: "kg", color: "#2563eb" },
        { key: "pOssi", label: "Masa ósea", value: result.pOssi, unit: "kg", color: "#2d7a3a" },
        { key: "pResid", label: "Masa residual", value: result.pResid, unit: "kg", color: "#94a3b8" },
      ]
    : [];
  return (
    <div id={embedded ? undefined : "anthropometry-report"} className={`space-y-5 ${embedded ? "bg-transparent" : "bg-white"} print:text-[9px]`}>
      {!embedded ? (
        <div className="flex flex-wrap items-end justify-between gap-3 border-b-4 border-[#0b4f3a] pb-4 print:pb-2">
          <div>
            <h2 className="text-2xl font-bold tracking-[-0.02em] text-[#003626] print:text-lg">Informe antropométrico</h2>
            <p className="mt-1 text-xs text-slate-500">Valoración: {formatDate(assessment.measured_at)}</p>
          </div>
          <button type="button" onClick={() => window.print()} className="clinical-button-secondary print:hidden">
            <Printer className="h-4 w-4" /> Descargar / imprimir PDF
          </button>
        </div>
      ) : null}

      <div className="clinical-card grid gap-3 p-4 sm:grid-cols-3 lg:grid-cols-7 print:grid-cols-7">
        {[
          ["Paciente", client.name],
          ["Edad", age === null ? "--" : `${age} años`],
          ["Sexo", (assessment.sex ?? client.sex) === "female" ? "Mujer" : "Hombre"],
          ["Peso", `${assessment.weight_kg} kg`],
          ["Altura", `${assessment.height_cm} cm`],
          ["IMC", result?.imc ?? "--"],
          ["Raza/etnia", RACE_LABELS[assessment.race ?? "caucasian"]],
        ].map(([label, value]) => (
          <div key={label}><div className={labelClass}>{label}</div><div className="mt-1 font-semibold text-slate-900">{value}</div></div>
        ))}
      </div>

      {!embedded ? <section className="print:hidden">
        <h3 className="text-sm font-semibold text-slate-900">Fórmula de porcentaje graso</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {BODY_FAT_FORMULAS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setFormula(option.key)}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold ${formula === option.key ? "border-emerald-400 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-600"}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section> : null}

      {supplements.length ? (
        <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <h3 className="text-sm font-bold text-[#003626]">Suplementos</h3>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {supplements.map((note) => <div key={note.id} className="rounded-md bg-white px-3 py-2 text-sm text-slate-700">{note.content}</div>)}
          </div>
        </section>
      ) : null}

      {result ? (
        <>
          <section className="clinical-card p-5">
            <h3 className="text-base font-bold tracking-[-0.01em] text-[#003626]">Composición corporal</h3>
            <p className="mt-2 text-xs text-slate-500">{result.formulaLabel} · {result.conversionLabel}</p>
            {!result.withersValid ? <p className="mt-2 rounded-md bg-amber-50 p-2 text-xs text-amber-800">La edad queda fuera del rango de validación publicado para Withers.</p> : null}
            <div className="mt-3">
              <CompositionBar result={result} />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
              {[
                ["Grasa", result.pctGrass, result.pGras],
                ["Muscular", result.pctMusc, result.pMusc],
                ["Ósea", result.pctOssi, result.pOssi],
                ["Residual", result.pctResid, result.pResid],
              ].map(([label, pct, kg]) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-[#f7f8ff] p-4 text-center">
                  <div className={labelClass}>{label}</div><div className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-[#003626]">{pct}%</div><div className="mt-1 text-xs text-slate-500">{kg} kg</div>
                </div>
              ))}
            </div>
          </section>

          <section className="clinical-card p-5">
            <h3 className="text-base font-bold tracking-[-0.01em] text-[#003626]">Somatotipo Heath-Carter</h3>
            <div className="mt-3 grid items-center gap-4 lg:grid-cols-[300px_minmax(0,1fr)] print:grid-cols-2">
              <Somatogram
                points={comparisonPoints.length ? comparisonPoints : [{ id: assessment.id, x: Number(result.somatX), y: Number(result.somatY), label: formatDate(assessment.measured_at).slice(0, 5) }]}
                selectedId={assessment.id}
              />
              <div className="grid gap-2 sm:grid-cols-3">
                <Metric label="Endomorfia" value={result.endo} />
                <Metric label="Mesomorfia" value={result.meso} />
                <Metric label="Ectomorfia" value={result.ecto} />
                <Metric label="X" value={result.somatX} />
                <Metric label="Y" value={result.somatY} />
                <Metric label="Suma 6" value={`${result.sum6} mm`} />
              </div>
            </div>
          </section>

          <section className="clinical-card p-5">
            <h3 className="text-base font-bold tracking-[-0.01em] text-[#003626]">Medidas detalladas y correcciones</h3>
            <div className="mt-3 grid gap-3 lg:grid-cols-3 print:grid-cols-3">
              <MeasurementBars title="Pliegues" fields={SKINFOLD_FIELDS} values={maps.skinfolds} scale={40} />
              <MeasurementBars title="Perímetros" fields={GIRTH_FIELDS} values={maps.girths} scale={110} />
              <MeasurementBars title="Diámetros" fields={DIAMETER_FIELDS} values={maps.diameters} scale={12} />
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-4">
              <Metric label="Brazo corregido" value={`${result.brCorGen} cm`} />
              <Metric label="Pierna corregida" value={`${result.camaCorGen} cm`} />
              <Metric label="Cintura/cadera" value={`${result.ratioCM} · ${result.whrCat}`} />
              <Metric label="Cintura/altura" value={`${result.waistHeightRatio} · ${result.whtrCat}`} />
            </div>
          </section>

          {result.cormic && result.manouvrier && result.relArmSpan ? (
            <section className="clinical-card p-5">
              <h3 className="text-base font-bold tracking-[-0.01em] text-[#003626]">Proporcionalidad ósea</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <Metric label="Índice córmico" value={`${result.cormic} · ${result.cormicCat}`} />
                <Metric label="Índice de Manouvrier" value={`${result.manouvrier} · ${result.manouvrierCat}`} />
                <Metric label="Envergadura/altura" value={`${result.relArmSpan} · ${result.relArmSpanCat}`} />
              </div>
            </section>
          ) : null}

          <section className="clinical-card p-5">
            <h3 className="text-base font-bold tracking-[-0.01em] text-[#003626]">Valores Z Phantom</h3>
            <div className="mt-3 grid gap-x-6 lg:grid-cols-2 print:grid-cols-2 print:gap-x-3">
              {zRows.map((row) => (
                <ZScoreRow
                  key={row.key}
                  label={row.label}
                  value={row.value}
                  unit={row.unit}
                  z={result.zScores[row.key]}
                  color={row.color}
                />
              ))}
            </div>
          </section>
        </>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          La valoración está incompleta. Puedes consultar sus medidas, pero se necesitan todos los pliegues, perímetros y diámetros para calcular composición corporal, somatotipo y valores Z.
          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            <MeasureList title="Pliegues" fields={SKINFOLD_FIELDS} values={maps.skinfolds} />
            <MeasureList title="Perímetros" fields={GIRTH_FIELDS} values={maps.girths} />
            <MeasureList title="Diámetros" fields={DIAMETER_FIELDS} values={maps.diameters} />
          </div>
        </div>
      )}
    </div>
  );
}

export function AnthropometrySection({
  client,
  assessments,
  supplementNotes,
  today,
  defaultWeight,
}: AnthropometrySectionProps) {
  const rows = useMemo(
    () => [...assessments].sort((a, b) => b.measured_at.localeCompare(a.measured_at) || b.created_at.localeCompare(a.created_at)),
    [assessments],
  );
  const latest = rows[0] ?? null;
  const latestMaps = latest ? assessmentMaps(latest) : null;
  const latestSums = latestMaps ? skinfoldSums(latestMaps.skinfolds) : { sum6: 0, sum8: 0 };
  const latestBmi = latest ? latest.weight_kg / (latest.height_cm / 100) ** 2 : null;
  const [open, setOpen] = useState(false);
  const [formId, setFormId] = useState<string | "new" | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<ConfirmAction>(null);
  const formAssessment = formId && formId !== "new" ? rows.find((row) => row.id === formId) ?? null : null;
  const reportAssessment = rows.find((row) => row.id === reportId) ?? null;
  const allSelected = rows.length > 0 && selected.length === rows.length;

  return (
    <section id="antropometria" className="space-y-4">
      <div className="clinical-card overflow-hidden">
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="clinical-label text-emerald-700">Antropometría ISAK</span>
              <h2 className="mt-1 text-lg font-bold tracking-[-0.02em] text-[#003626]">Resumen antropométrico</h2>
              <p className="mt-1 text-sm text-slate-500">
                {latest ? `Última valoración: ${formatDate(latest.measured_at)}` : "Sin valoraciones"} · {rows.length} {rows.length === 1 ? "medición" : "mediciones"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setFormId("new")} className="clinical-button-primary">
                <Plus className="h-4 w-4" /> Nueva medición
              </button>
              <button type="button" onClick={() => setOpen((value) => !value)} className="clinical-button-secondary">
                Mediciones ({rows.length}) {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {latest ? (
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
              <Metric label="Masa corporal" value={`${latest.weight_kg} kg`} />
              <Metric label="Altura" value={`${latest.height_cm} cm`} />
              <Metric label="IMC" value={latestBmi?.toFixed(1) ?? "--"} />
              <Metric label="Suma 6 pliegues" value={`${latestSums.sum6.toFixed(1)} mm`} />
              <Metric label="Suma 8 pliegues" value={`${latestSums.sum8.toFixed(1)} mm`} />
            </div>
          ) : (
            <p className="mt-5 rounded-xl bg-[#f7f8ff] p-4 text-sm text-slate-500">Añade la primera valoración antropométrica.</p>
          )}

        </div>

        {open ? (
          <div className="border-t border-slate-100 p-5 sm:p-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                {rows.length >= 2 ? (
                  <button type="button" onClick={() => setComparisonOpen(true)} className="clinical-button-secondary px-3 py-2 text-xs">Comparación</button>
                ) : null}
                {selected.length ? (
                  <button type="button" onClick={() => setConfirm({ type: "bulk" })} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">Eliminar seleccionadas ({selected.length})</button>
                ) : null}
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-[#f8faf9] text-left text-[11px] uppercase tracking-[0.06em] text-slate-500">
                  <tr>
                    <th className="px-3 py-3"><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : rows.map((row) => row.id))} aria-label="Seleccionar todas" /></th>
                    <th className="px-3 py-3">Fecha</th>
                    <th className="px-3 py-3">Perfil</th>
                    <th className="hidden px-3 py-3 md:table-cell">Peso</th>
                    <th className="hidden px-3 py-3 md:table-cell">Suma 6</th>
                    <th className="px-3 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {rows.map((row, index) => {
                    const maps = assessmentMaps(row);
                    const restricted = isRestrictedProfile({ heightCm: row.height_cm, weightKg: row.weight_kg, ...maps });
                    const sums = skinfoldSums(maps.skinfolds);
                    return (
                      <tr key={row.id} className="transition hover:bg-[#f9fbf9]">
                        <td className="px-3 py-3"><input type="checkbox" checked={selected.includes(row.id)} onChange={() => setSelected((current) => current.includes(row.id) ? current.filter((id) => id !== row.id) : [...current, row.id])} aria-label={`Seleccionar ${formatDate(row.measured_at)}`} /></td>
                        <td className="px-3 py-3 font-medium text-slate-800">
                          {formatDate(row.measured_at)}
                          {index === 0 ? <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[0.65rem] font-semibold uppercase text-blue-700">Última</span> : null}
                        </td>
                        <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${restricted ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{restricted ? "Restringido" : "Incompleto"}</span></td>
                        <td className="hidden px-3 py-3 text-slate-600 md:table-cell">{row.weight_kg} kg</td>
                        <td className="hidden px-3 py-3 text-slate-600 md:table-cell">{sums.sum6.toFixed(1)} mm</td>
                        <td className="px-3 py-3">
                          <div className="flex justify-end gap-1">
                            <button type="button" onClick={() => setReportId(row.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-emerald-50 hover:text-emerald-700" aria-label="Generar informe"><FileText className="h-4 w-4" /></button>
                            <button type="button" onClick={() => setFormId(row.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-700" aria-label="Editar"><Pencil className="h-4 w-4" /></button>
                            <button type="button" onClick={() => setConfirm({ type: "assessment", id: row.id })} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-700" aria-label="Eliminar"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>

      {latest ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <div>
              <h2 className="text-lg font-bold tracking-[-0.02em] text-[#003626]">Último análisis clínico</h2>
              <p className="mt-1 text-sm text-slate-500">Resultados calculados con la valoración del {formatDate(latest.measured_at)}.</p>
            </div>
            <button type="button" onClick={() => setReportId(latest.id)} className="clinical-button-secondary">
              <FileText className="h-4 w-4" /> Generar informe
            </button>
          </div>
          <Report client={client} assessment={latest} assessments={rows} supplements={supplementNotes} embedded />
        </div>
      ) : null}

      {formId ? (
        <Modal title={formAssessment ? "Editar valoración antropométrica" : "Nueva valoración antropométrica"} description="Registra una primera y segunda lectura; la tercera es opcional." onClose={() => setFormId(null)} wide>
          <AssessmentForm client={client} assessment={formAssessment} today={today} defaultWeight={defaultWeight} />
        </Modal>
      ) : null}

      {reportAssessment ? (
        <Modal title="Informe antropométrico" onClose={() => setReportId(null)} wide>
          <Report client={client} assessment={reportAssessment} assessments={rows} supplements={supplementNotes} />
        </Modal>
      ) : null}

      {comparisonOpen ? (
        <Modal title="Comparación de valoraciones" onClose={() => setComparisonOpen(false)} wide>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400"><tr><th className="px-3 py-2">Fecha</th><th className="px-3 py-2">Peso</th><th className="px-3 py-2">IMC</th><th className="px-3 py-2">Suma 6</th><th className="px-3 py-2">Suma 8</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => {
                  const maps = assessmentMaps(row);
                  const sums = skinfoldSums(maps.skinfolds);
                  const bmi = row.weight_kg / (row.height_cm / 100) ** 2;
                  return <tr key={row.id}><td className="px-3 py-2 font-medium">{formatDate(row.measured_at)}</td><td className="px-3 py-2">{row.weight_kg} kg</td><td className="px-3 py-2">{bmi.toFixed(1)}</td><td className="px-3 py-2">{sums.sum6.toFixed(1)} mm</td><td className="px-3 py-2">{sums.sum8.toFixed(1)} mm</td></tr>;
                })}
              </tbody>
            </table>
          </div>
        </Modal>
      ) : null}

      {confirm ? (
        <Modal
          title={confirm.type === "bulk" ? "Eliminar valoraciones" : "Eliminar valoración"}
          description={confirm.type === "bulk" ? `Se eliminarán ${selected.length} valoraciones.` : "Esta acción no se puede deshacer."}
          onClose={() => setConfirm(null)}
        >
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setConfirm(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancelar</button>
            <form action={confirm.type === "bulk" ? deleteClientAnthropometryBulk : deleteClientAnthropometry}>
              <input type="hidden" name="client_id" value={client.id} />
              {confirm.type === "assessment" ? <input type="hidden" name="assessment_id" value={confirm.id} /> : null}
              {confirm.type === "bulk" ? <input type="hidden" name="assessment_ids" value={JSON.stringify(selected)} /> : null}
              <SubmitButton className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600" pendingLabel="Eliminando..." icon="trash">Eliminar</SubmitButton>
            </form>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
