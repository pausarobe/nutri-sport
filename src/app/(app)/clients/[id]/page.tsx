import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Clock,
  Download,
  Dumbbell,
  Edit3,
  FileText,
  Mail,
  Phone,
  Plus,
  Ruler,
  Target,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import {
  calculateAnthropometry,
  DIAMETER_FIELDS,
  GIRTH_FIELDS,
  measurementMapFromJson,
  SKINFOLD_FIELDS,
  type AnthropometryResult,
  type MeasurementField,
  type MeasurementMap,
} from "@/lib/anthropometry";
import {
  calculateEnergyPlan,
  energySettingsFromJson,
  mealDistributionFromJson,
} from "@/lib/nutrition-plan";
import { EmptyState } from "@/components/empty-state";
import { Notice } from "@/components/notice";
import { NutritionPlanForm } from "@/components/nutrition-plan-form";
import { AnthropometrySection } from "@/components/anthropometry-section";
import { DeleteClientButton } from "@/components/delete-client-button";
import { PrintButton } from "@/components/print-button";
import { SubmitButton } from "@/components/submit-button";
import { createClient } from "@/lib/supabase/server";
import { clientStatusMeta } from "@/lib/client-status";
import type {
  ClientAppointment,
  ClientFile,
  ClientSex,
  ClientWeightLog,
} from "@/lib/database.types";
import { fileSizeLabel, formatDate, initials } from "@/lib/format";
import {
  addClientAnthropometry,
  addClientAppointment,
  addClientNote,
  addClientWeight,
  completeClientAppointment,
  deleteClientAppointment,
  deleteClientFile,
  deleteClientNote,
  deleteClientWeight,
  reopenClientAppointment,
  updateClientNote,
  updateClientWeight,
  uploadClientFile,
} from "../actions";
import { AnthropometryModal } from "@/components/anthropometry-modal";
import { ClientAvatarMenu } from "@/components/client-avatar-menu";

type ClientDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    error?: string;
    success?: string;
    tab?: string;
    anthropometry?: string;
  }>;
};

type SignedFile = ClientFile & {
  signedUrl?: string;
};

type WeightPoint = Pick<
  ClientWeightLog,
  "id" | "created_at" | "measured_at" | "weight_kg"
>;

const inputClass = "clinical-input cursor-pointer";
const labelClass = "clinical-label print:text-[7px]";
const cardClass = "clinical-card p-5 sm:p-6";
const mutedTileClass = "rounded-xl bg-[#f7f8ff] p-4";

const sexLabels: Record<ClientSex, string> = {
  female: "Mujer",
  male: "Hombre",
};

const activityLabels = {
  sedentary: "Sedentario",
  light: "Ligero",
  moderate: "Moderado",
  high: "Alto",
  very_high: "Muy alto",
};

const appointmentTypes = [
  "Revisión mensual",
  "Antropometría",
  "Primera visita",
  "Consulta",
  "Seguimiento",
];

const clientTabs = [
  { key: "ficha", label: "Ficha" },
  { key: "peso", label: "Peso y evolución" },
  { key: "plan", label: "Plan nutricional" },
  { key: "antropometria", label: "Antropometría" },
  { key: "citas", label: "Citas" },
  { key: "informe", label: "Informe" },
  { key: "notas", label: "Notas" },
  { key: "archivos", label: "Archivos" },
] as const;

const months = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

type ClientTab = (typeof clientTabs)[number]["key"];

function resolveClientTab(value: string | undefined): ClientTab {
  if (value === "informe") return "antropometria";
  return clientTabs.some((tab) => tab.key === value)
    ? (value as ClientTab)
    : "ficha";
}

function clientTabHref(clientId: string, tab: ClientTab) {
  return `/clients/${clientId}?tab=${tab}`;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function clientAge(birthDate: string | null) {
  if (!birthDate) return null;

  const birth = new Date(`${birthDate}T00:00:00`);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }

  return Number.isFinite(age) && age >= 0 ? age : null;
}

function clientBmi(weightKg: number | null, heightCm: number | null) {
  if (!weightKg || !heightCm) return null;
  const heightM = heightCm / 100;
  return (weightKg / (heightM * heightM)).toFixed(1);
}

function numberLabel(value: number | null | undefined, unit = "") {
  if (value === null || value === undefined) return "--";
  const label = Number(value).toFixed(1).replace(/\.0$/, "");
  return `${label}${unit ? ` ${unit}` : ""}`;
}

function dateParts(value: string) {
  const [year, month, day] = value.split("-");
  const monthIndex = Math.max(0, Number(month) - 1);
  return {
    year: year ?? "",
    month: months[monthIndex] ?? "",
    day: day ?? "",
  };
}

function isMissingSchemaTableError(
  error: { message?: string } | null | undefined,
) {
  return (
    error?.message?.includes("schema cache") &&
    error.message.includes("public.")
  );
}

function migrationPendingMessage(
  error: { message?: string } | null | undefined,
) {
  if (!isMissingSchemaTableError(error)) return error?.message;

  return "Falta aplicar la migracion de Supabase con las tablas nuevas de pesos, antropometria y citas.";
}

function SectionTitle({
  title,
  action,
  description,
}: {
  title: string;
  action?: React.ReactNode;
  description?: string;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-lg font-bold tracking-[-0.02em] text-[#003626]">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function MiniStat({
  label,
  value,
  color = "#2d7a3a",
  helper,
}: {
  label: string;
  value: React.ReactNode;
  color?: string;
  helper?: React.ReactNode;
}) {
  return (
    <div className={`${mutedTileClass} print:p-1.5`}>
      <div className={labelClass}>{label}</div>
      <div
        className="mt-1 text-xl font-semibold print:text-sm"
        style={{ color }}
      >
        {value}
      </div>
      {helper ? (
        <div className="mt-1 text-xs text-slate-500 print:text-[9px]">
          {helper}
        </div>
      ) : null}
    </div>
  );
}

function DateBadge({ date }: { date: string }) {
  const parts = dateParts(date);

  return (
    <div
      className="min-w-20 rounded-lg bg-white px-3 py-2 text-center h-fit"
      title={`${parts.day} ${parts.month} ${parts.year}`}
    >
      <div className={labelClass}>
        {parts.month} {parts.year}
      </div>
      <div className="text-lg font-semibold leading-none text-emerald-800">
        {parts.day}
      </div>
    </div>
  );
}

function WeightChart({ points }: { points: WeightPoint[] }) {
  if (!points.length) return null;

  const values = points.map((point) => Number(point.weight_kg));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 660;
  const height = 200;
  const left = 44;
  const right = 16;
  const top = 20;
  const bottom = 32;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const toX = (index: number) =>
    points.length === 1
      ? left + plotWidth / 2
      : left + (index / (points.length - 1)) * plotWidth;
  const toY = (value: number) =>
    top + plotHeight - ((value - min) / range) * plotHeight;
  const coords = values.map((value, index) => [toX(index), toY(value)]);
  let path = `M${coords[0][0]},${coords[0][1]}`;

  for (let index = 1; index < coords.length; index += 1) {
    const controlX = (coords[index - 1][0] + coords[index][0]) / 2;
    path += ` C${controlX},${coords[index - 1][1]} ${controlX},${coords[index][1]} ${coords[index][0]},${coords[index][1]}`;
  }

  const area =
    points.length > 1
      ? `${path} L${coords[coords.length - 1][0]},${top + plotHeight} L${coords[0][0]},${top + plotHeight} Z`
      : "";
  const trend = values[values.length - 1] < values[0] ? "#2d7a3a" : "#e05252";
  const ticks = Array.from(
    { length: 4 },
    (_, index) => min + (range / 3) * index,
  );
  const labelStep = Math.max(1, Math.ceil(points.length / 6));

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="block">
      <defs>
        <linearGradient id="weight-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={trend} stopOpacity="0.22" />
          <stop offset="100%" stopColor={trend} stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((tick, index) => (
        <g key={tick}>
          <line
            x1={left}
            y1={toY(tick)}
            x2={width - right}
            y2={toY(tick)}
            stroke="#dde3ed"
            strokeWidth="1"
            strokeDasharray={index === 0 ? "" : "4,3"}
          />
          <text
            x={left - 5}
            y={toY(tick) + 4}
            textAnchor="end"
            fill="#8fa0b8"
            fontSize="10"
          >
            {tick.toFixed(1)}
          </text>
        </g>
      ))}
      {points.map((point, index) => {
        if (index % labelStep !== 0 && index !== points.length - 1) return null;
        return (
          <text
            key={point.id}
            x={toX(index)}
            y={height - 6}
            textAnchor="middle"
            fill="#8fa0b8"
            fontSize="9"
          >
            {formatDate(point.measured_at).slice(0, 6)}
          </text>
        );
      })}
      {area ? <path d={area} fill="url(#weight-gradient)" /> : null}
      {points.length > 1 ? (
        <path
          d={path}
          fill="none"
          stroke={trend}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      ) : null}
      {coords.map(([x, y], index) => (
        <g key={`${x}-${y}`}>
          {index === coords.length - 1 ? (
            <circle cx={x} cy={y} r="9" fill={trend} opacity="0.12" />
          ) : null}
          <circle
            cx={x}
            cy={y}
            r={index === coords.length - 1 ? 5 : 3}
            fill={index === coords.length - 1 ? trend : "#fff"}
            stroke={trend}
            strokeWidth={index === coords.length - 1 ? 0 : 1.5}
          />
        </g>
      ))}
      {points.length === 1 ? (
        <text
          x={width / 2}
          y={height - 8}
          textAnchor="middle"
          fill="#8fa0b8"
          fontSize="11"
        >
          Anade otro registro para ver la curva de evolucion
        </text>
      ) : null}
    </svg>
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
    <div className={`${mutedTileClass} print:p-1.5`}>
      <h3 className="mb-3 text-sm font-semibold text-slate-900 print:mb-1 print:text-[10px]">
        {title}
      </h3>
      <div className="space-y-2 print:space-y-1">
        {fields.map((field) => {
          const value = values[field.key] ?? 0;
          return (
            <div
              key={field.key}
              className="grid grid-cols-[108px_minmax(0,1fr)_48px] items-center gap-2 print:grid-cols-[78px_minmax(0,1fr)_34px] print:gap-1"
            >
              <div className="text-xs text-slate-600 print:text-[8px]">
                {field.label}
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 print:h-1">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (value / scale) * 100)}%`,
                    backgroundColor: field.color,
                  }}
                />
              </div>
              <div
                className="text-right text-xs font-semibold print:text-[8px]"
                style={{ color: field.color }}
              >
                {numberLabel(value)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ComponentBar({ calc }: { calc: AnthropometryResult }) {
  const segments = [
    { label: "Grasa", percent: Number(calc.pctGrass), color: "#c45a00" },
    { label: "Muscular", percent: Number(calc.pctMusc), color: "#2563eb" },
    { label: "Osea", percent: Number(calc.pctOssi), color: "#2d7a3a" },
    { label: "Residual", percent: Number(calc.pctResid), color: "#94a3b8" },
  ];

  return (
    <div className="flex h-7 overflow-hidden rounded-lg shadow-sm print:h-4">
      {segments.map((segment) => (
        <div
          key={segment.label}
          className="flex items-center justify-center text-xs font-semibold text-white"
          style={{
            width: `${Math.max(0, segment.percent)}%`,
            backgroundColor: segment.color,
          }}
        >
          {segment.percent > 8 ? `${segment.percent.toFixed(1)}%` : ""}
        </div>
      ))}
    </div>
  );
}

function Somatocart({
  points,
  selectedIndex,
  size = 260,
}: {
  points: Array<{ x: string; y: string; label: string }>;
  selectedIndex: number;
  size?: number;
}) {
  const width = size;
  const height = size;

  // Márgenes para dejar espacio a las etiquetas
  const left = size * 0.1;
  const right = size * 0.1;
  const top = size * 0.13;
  const bottom = size * 0.12;

  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;

  // Mantengo tu sistema de coordenadas -9..9
  const tx = (x: number | string) => left + ((Number(x) + 9) / 18) * plotWidth;

  const ty = (y: number | string) => top + ((9 - Number(y)) / 18) * plotHeight;

  /*
   * Vértices principales
   */
  const meso = {
    x: width / 2,
    y: top + 10,
  };

  const endo = {
    x: left,
    y: height - bottom - 8,
  };

  const ecto = {
    x: width - right,
    y: height - bottom - 8,
  };

  /*
   * Centro del gráfico
   */
  /*
   * Puntos intermedios donde terminan las diagonales.
   * Están sobre los laterales curvos aproximadamente.
   */
  const leftMiddle = {
    x: width * 0.18,
    y: height * 0.43,
  };

  const rightMiddle = {
    x: width * 0.82,
    y: height * 0.43,
  };

  /*
   * Curvas del contorno.
   *
   * Q = quadratic Bézier:
   *
   * M inicio
   * Q controlX controlY destinoX destinoY
   */
  const outlinePath = `
    M ${meso.x} ${meso.y}

    Q
      ${width * 0.22} ${height * 0.28}
      ${endo.x} ${endo.y}

    Q
      ${width * 0.5} ${height * 0.97}
      ${ecto.x} ${ecto.y}

    Q
      ${width * 0.78} ${height * 0.28}
      ${meso.x} ${meso.y}
  `;

  const colors = [
    "#2563eb",
    "#c45a00",
    "#7c3aed",
    "#059669",
    "#0891b2",
    "#be185d",
  ];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="mx-auto block"
    >
      {/* Fondo */}
      <rect width={width} height={height} fill="#ffffff" />

      {/* CONTORNO CURVO */}
      <path
        d={outlinePath}
        fill="none"
        stroke="#888"
        strokeWidth="2"
        strokeDasharray="6 4"
        strokeLinecap="round"
      />

      {/* Eje vertical */}
      <line
        x1={meso.x}
        y1={meso.y}
        x2={width / 2}
        y2={endo.y + 12}
        stroke="#888"
        strokeWidth="1.2"
        strokeDasharray="3 2"
      />

      {/* Diagonal izquierda → derecha */}
      <line
        x1={leftMiddle.x}
        y1={leftMiddle.y}
        x2={ecto.x}
        y2={ecto.y}
        stroke="#888"
        strokeWidth="1.2"
        strokeDasharray="3 2"
      />

      {/* Diagonal derecha → izquierda */}
      <line
        x1={rightMiddle.x}
        y1={rightMiddle.y}
        x2={endo.x}
        y2={endo.y}
        stroke="#888"
        strokeWidth="1.2"
        strokeDasharray="3 2"
      />

      {/* MESOMORFO */}
      <g>
        <text x={meso.x - 25} y={25} fill="#222" fontSize="9">
          MESOMORFO
        </text>
      </g>

      {/* ENDOMORFO */}
      <g>
        <text x={endo.x - 16} y={height - 5} fill="#222" fontSize="9">
          ENDOMORFO
        </text>
      </g>

      {/* ECTOMORFO */}
      <g>
        <text x={ecto.x - 35} y={height - 5} fill="#222" fontSize="9">
          ECTOMORFO
        </text>
      </g>

      {/* Líneas entre mediciones */}
      {points.map((point, index) => {
        if (index === 0) return null;

        return (
          <line
            key={`${point.label}-${index}-line`}
            x1={tx(points[index - 1].x)}
            y1={ty(points[index - 1].y)}
            x2={tx(point.x)}
            y2={ty(point.y)}
            stroke="#94a3b8"
            strokeWidth="1.2"
            strokeDasharray="3 2"
          />
        );
      })}

      {/* Puntos */}
      {points.map((point, index) => {
        const x = tx(point.x);
        const y = ty(point.y);

        const selected = index === selectedIndex;

        const color = selected ? "#ef4444" : colors[index % colors.length];

        return (
          <g key={`${point.label}-${index}`}>
            {selected && (
              <circle cx={x} cy={y} r="9" fill="#ef4444" opacity="0.15" />
            )}

            <circle
              cx={x}
              cy={y}
              r={selected ? 5.5 : 4}
              fill={selected ? "#ef4444" : color}
              stroke={color}
              strokeWidth={selected ? 0 : 1.2}
            />

            <text
              x={x + 7}
              y={y + 3}
              fill={color}
              fontSize={selected ? 8 : 7.5}
              fontWeight={selected ? "bold" : "400"}
            >
              {point.label}
            </text>
          </g>
        );
      })}
    </svg>
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

  const zColor =
    Math.abs(z) <= 1 ? "#2d7a3a" : Math.abs(z) <= 2 ? "#c45a00" : "#e05252";
  const zLabel =
    Math.abs(z) <= 1 ? "Normal" : Math.abs(z) <= 2 ? "Atencion" : "Alejado";

  return (
    <div className="grid grid-cols-[minmax(92px,1fr)_56px_minmax(44px,1fr)_44px_68px] items-center gap-2 border-b border-slate-100 py-1.5">
      <div className="text-xs text-slate-700">{label}</div>
      <div className="text-right text-xs font-semibold" style={{ color }}>
        {value}
        <span className="ml-0.5 font-normal text-slate-400">{unit}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(100, (Math.abs(z) / 3) * 100)}%`,
            marginLeft: z >= 0 ? 0 : "auto",
            backgroundColor: zColor,
          }}
        />
      </div>
      <div
        className="text-right text-xs font-semibold"
        style={{ color: zColor }}
      >
        {z >= 0 ? "+" : ""}
        {z}
      </div>
      <div
        className="rounded bg-slate-100 px-1.5 py-1 text-center text-[0.65rem] font-semibold"
        style={{ color: zColor }}
      >
        {zLabel}
      </div>
    </div>
  );
}

function MeasurementInputRows({
  title,
  prefix,
  fields,
}: {
  title: string;
  prefix: string;
  fields: MeasurementField[];
}) {
  return (
    <div className={mutedTileClass}>
      <h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3>
      <div className="mb-2 grid grid-cols-[minmax(86px,1fr)_repeat(3,minmax(58px,90px))] gap-2 px-1 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-400">
        <div>Medida</div>
        <div className="text-center">1a</div>
        <div className="text-center">2a</div>
        <div className="text-center">3a</div>
      </div>
      <div className="space-y-2">
        {fields.map((field) => (
          <div
            key={field.key}
            className="grid grid-cols-[minmax(86px,1fr)_repeat(3,minmax(58px,90px))] items-center gap-2"
          >
            <label
              htmlFor={`${prefix}_${field.key}_1`}
              className="text-xs text-slate-600"
            >
              {field.label}
            </label>
            {[1, 2, 3].map((index) => (
              <input
                key={index}
                id={`${prefix}_${field.key}_${index}`}
                name={`${prefix}_${field.key}_${index}`}
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                placeholder={index === 1 ? field.unit : ""}
                className={`${inputClass} px-2 text-center`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function AppointmentActions({
  appointment,
  clientId,
  completed,
}: {
  appointment: ClientAppointment;
  clientId: string;
  completed: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <form
        action={completed ? reopenClientAppointment : completeClientAppointment}
      >
        <input type="hidden" name="client_id" value={clientId} />
        <input type="hidden" name="appointment_id" value={appointment.id} />
        <SubmitButton
          className="inline-flex items-center cursor-pointer gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
          pendingLabel="..."
        >
          {completed ? "Deshacer" : "Hecha"}
        </SubmitButton>
      </form>
      <form action={deleteClientAppointment}>
        <input type="hidden" name="client_id" value={clientId} />
        <input type="hidden" name="appointment_id" value={appointment.id} />
        <SubmitButton
          className="inline-flex items-center gap-1 cursor-pointer rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
          pendingLabel="..."
        >
          Eliminar
        </SubmitButton>
      </form>
    </div>
  );
}

function AppointmentList({
  title,
  appointments,
  clientId,
  completed = false,
  empty,
}: {
  title: string;
  appointments: ClientAppointment[];
  clientId: string;
  completed?: boolean;
  empty: string;
}) {
  return (
    <div className={`${cardClass} bg-[#f2f3ff] rounded-xl`}>
      <h3 className="mb-3 font-semibold text-slate-950">{title}</h3>
      {appointments.length ? (
        <div className="divide-y divide-slate-100">
          {appointments.map((appointment) => (
            <div
              key={appointment.id}
              className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center"
            >
              <DateBadge date={appointment.scheduled_date} />
              <div className="min-w-0 flex-1">
                <div
                  className={`text-sm font-semibold ${completed ? "text-slate-500 line-through" : "text-slate-950"}`}
                >
                  {appointment.appointment_type}
                </div>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                  {appointment.scheduled_time ? (
                    <span className="inline-flex items-center gap-1 text-blue-700">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      {appointment.scheduled_time.slice(0, 5)}
                    </span>
                  ) : null}
                  <span>{appointment.duration_minutes} min</span>
                  {appointment.notes ? <span>{appointment.notes}</span> : null}
                </div>
              </div>
              <AppointmentActions
                appointment={appointment}
                clientId={clientId}
                completed={completed}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">{empty}</p>
      )}
    </div>
  );
}

export default async function ClientDetailPage({
  params,
  searchParams,
}: ClientDetailPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const activeTab = resolveClientTab(query?.tab);
  const supabase = await createClient();
  const today = todayIsoDate();

  const [
    clientResult,
    planResult,
    notesResult,
    filesResult,
    weightsResult,
    anthropometryResult,
    appointmentsResult,
  ] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).single(),
    supabase.from("plans").select("*").eq("client_id", id).maybeSingle(),
    supabase
      .from("client_notes")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("client_files")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("client_weight_logs")
      .select("*")
      .eq("client_id", id)
      .order("measured_at", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("client_anthropometry_assessments")
      .select("*")
      .eq("client_id", id)
      .order("measured_at", { ascending: false }),
    supabase
      .from("client_appointments")
      .select("*")
      .eq("client_id", id)
      .order("scheduled_date", { ascending: true })
      .order("scheduled_time", { ascending: true }),
  ]);

  if (clientResult.error || !clientResult.data) notFound();

  const client = clientResult.data;
  const statusMeta = clientStatusMeta(client.status);
  const plan = planResult.data;
  const notes = notesResult.data ?? [];
  const supplementNotes = notes.filter(
    (note) => note.note_type === "supplement",
  );
  const age = clientAge(client.birth_date);
  const storedFiles = filesResult.data ?? [];
  const files: SignedFile[] = await Promise.all(
    storedFiles.map(async (file) => {
      const { data } = await supabase.storage
        .from("client-files")
        .createSignedUrl(file.path, 300);

      return { ...file, signedUrl: data?.signedUrl };
    }),
  );

  const databaseWeights = isMissingSchemaTableError(weightsResult.error)
    ? []
    : (weightsResult.data ?? []);
  const weightPoints: WeightPoint[] = (
    databaseWeights.length
      ? databaseWeights
      : client.weight_kg
        ? [
            {
              id: "current",
              created_at: client.updated_at,
              measured_at: client.updated_at.slice(0, 10),
              weight_kg: client.weight_kg,
            },
          ]
        : []
  ).sort((a, b) => {
    const byDate = a.measured_at.localeCompare(b.measured_at);
    return byDate === 0 ? a.created_at.localeCompare(b.created_at) : byDate;
  });
  const latestLoggedPoint = weightPoints[weightPoints.length - 1] ?? null;
  const latestLoggedWeight = latestLoggedPoint
    ? Number(latestLoggedPoint.weight_kg)
    : null;
  const weightValues = weightPoints.map((point) => Number(point.weight_kg));
  const latestWeight = latestLoggedWeight ?? client.weight_kg;
  const initialWeight = weightValues.length ? weightValues[0] : null;
  const weightDelta =
    latestWeight !== null && initialWeight !== null
      ? latestWeight - initialWeight
      : null;
  const anthropometryRows = isMissingSchemaTableError(anthropometryResult.error)
    ? []
    : (anthropometryResult.data ?? []);
  const latestAnthro = anthropometryRows[0] ?? null;
  const latestSkinfolds = latestAnthro
    ? measurementMapFromJson(latestAnthro.skinfolds, SKINFOLD_FIELDS)
    : ({} as MeasurementMap);
  const latestGirths = latestAnthro
    ? measurementMapFromJson(latestAnthro.girths, GIRTH_FIELDS)
    : ({} as MeasurementMap);
  const latestDiameters = latestAnthro
    ? measurementMapFromJson(latestAnthro.diameters, DIAMETER_FIELDS)
    : ({} as MeasurementMap);
  const calculationWeight = latestWeight ?? latestAnthro?.weight_kg ?? null;
  const calculationHeight = latestAnthro?.height_cm ?? client.height_cm;
  const bmi = clientBmi(calculationWeight, calculationHeight);
  const latestCalc = (
    latestAnthro && latestSkinfolds && latestGirths && latestDiameters
      ? calculateAnthropometry({
          weightKg: calculationWeight,
          heightCm: latestAnthro.height_cm,
          sex: latestAnthro.sex ?? client.sex,
          age,
          skinfolds: latestSkinfolds,
          girths: latestGirths,
          diameters: latestDiameters,
        })!
      : null
  ) as AnthropometryResult;
  const selectedAnthro =
    anthropometryRows.find((row) => row.id === query?.anthropometry) ??
    latestAnthro;
  const selectedSkinfolds = selectedAnthro
    ? measurementMapFromJson(selectedAnthro.skinfolds, SKINFOLD_FIELDS)
    : ({} as MeasurementMap);
  const selectedGirths = selectedAnthro
    ? measurementMapFromJson(selectedAnthro.girths, GIRTH_FIELDS)
    : ({} as MeasurementMap);
  const selectedDiameters = selectedAnthro
    ? measurementMapFromJson(selectedAnthro.diameters, DIAMETER_FIELDS)
    : ({} as MeasurementMap);
  const selectedCalc = (
    selectedAnthro && selectedSkinfolds && selectedGirths && selectedDiameters
      ? calculateAnthropometry({
          weightKg: calculationWeight,
          heightCm: selectedAnthro.height_cm,
          sex: selectedAnthro.sex ?? client.sex,
          age,
          skinfolds: selectedSkinfolds,
          girths: selectedGirths,
          diameters: selectedDiameters,
        })!
      : null
  ) as AnthropometryResult;
  const orderedAnthropometryRows = [...anthropometryRows].reverse();
  const somatotypePoints = orderedAnthropometryRows
    .map((row) => {
      const skinfolds = measurementMapFromJson(row.skinfolds, SKINFOLD_FIELDS);
      const girths = measurementMapFromJson(row.girths, GIRTH_FIELDS);
      const diameters = measurementMapFromJson(row.diameters, DIAMETER_FIELDS);
      const calc = calculateAnthropometry({
        weightKg: calculationWeight,
        heightCm: row.height_cm,
        sex: row.sex ?? client.sex,
        age,
        skinfolds,
        girths,
        diameters,
      });

      return calc
        ? {
            id: row.id,
            x: calc.somatX,
            y: calc.somatY,
            label: formatDate(row.measured_at).slice(0, 6),
          }
        : null;
    })
    .filter(
      (point): point is { id: string; x: string; y: string; label: string } =>
        Boolean(point),
    );
  const selectedSomatotypeIndex = Math.max(
    0,
    somatotypePoints.findIndex((point) => point.id === selectedAnthro?.id),
  );
  const appointments = isMissingSchemaTableError(appointmentsResult.error)
    ? []
    : (appointmentsResult.data ?? []);
  const upcomingAppointments = appointments.filter(
    (appointment) =>
      appointment.scheduled_date >= today && !appointment.completed,
  );
  const nextAppointment = upcomingAppointments[0] ?? null;
  const completedAppointments = appointments.filter(
    (appointment) => appointment.completed,
  );
  const pastAppointments = appointments.filter(
    (appointment) =>
      appointment.scheduled_date < today && !appointment.completed,
  );
  const planSettings = energySettingsFromJson(plan?.energy_settings);
  const mealDistribution = mealDistributionFromJson(plan?.meal_distribution);
  const energy = calculateEnergyPlan({
    settings: planSettings,
    weightKg: calculationWeight,
    heightCm: calculationHeight,
    age,
    sex: client.sex,
  });
  const planCalories = plan?.calories ?? energy.calories;
  const recentNotes = notes.slice(0, 5);
  const personalInfo: Array<{
    label: string;
    value: React.ReactNode;
    Icon: LucideIcon;
  }> = [
    { label: "Nombre", value: client.name, Icon: UserRound },
    {
      label: "Sexo",
      value: client.sex ? sexLabels[client.sex] : "No indicado",
      Icon: UserRound,
    },
    {
      label: "Altura",
      value: client.height_cm ? `${client.height_cm} cm` : "No indicada",
      Icon: Ruler,
    },
    { label: "Email", value: client.email || "No indicado", Icon: Mail },
    { label: "Telefono", value: client.phone || "No indicado", Icon: Phone },
    { label: "Deporte", value: client.sport || "No indicado", Icon: Dumbbell },
    { label: "Objetivo", value: client.goal || "No indicado", Icon: Target },
    {
      label: "Actividad",
      value: client.activity_level
        ? activityLabels[client.activity_level]
        : "No indicada",
      Icon: Activity,
    },
  ];

  return (
    <>
      <div className="mb-4 hidden sm:block print:hidden">
        <Link
          href="/clients"
          className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 hover:text-[#003626]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver a clientes
        </Link>
      </div>

      <section className="relative mb-5 rounded-3xl border border-emerald-100 bg-gradient-to-r from-white via-white to-emerald-50 p-5 shadow-[0_1px_3px_rgba(11,79,58,0.03),0_10px_28px_rgba(15,23,42,0.03)] sm:overflow-hidden sm:p-6 print:hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] sm:contents">
          <div
            className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-emerald-200/25 blur-3xl"
            aria-hidden="true"
          />
        </div>
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <ClientAvatarMenu
              clientId={client.id}
              clientName={client.name}
              clientInitials={initials(client.name)}
              showDelete={activeTab === "ficha"}
            />
            <div className="min-w-0">
              <h1 className="truncate text-[26px] font-bold leading-8 tracking-[-0.03em] text-[#131b2e] sm:text-[32px] sm:leading-10">
                {client.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span
                  className={`rounded-full border px-2.5 py-1 font-bold uppercase tracking-[0.04em] ${statusMeta.className}`}
                >
                  {statusMeta.badgeLabel}
                </span>
                <span>Cliente desde {formatDate(client.created_at)}</span>
                {client.sport ? (
                  <span className="rounded-full bg-white px-2.5 py-1 font-medium text-[#0b4f3a] shadow-sm">
                    {client.sport}
                  </span>
                ) : null}
                {client.goal ? (
                  <span className="rounded-full bg-[#f2f3ff] px-2.5 py-1 font-medium text-slate-700">
                    {client.goal}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="hidden shrink-0 flex-col gap-2 sm:flex">
            <Link
              href={`/clients/${client.id}/edit`}
              className="clinical-button-secondary"
            >
              <Edit3 className="h-4 w-4" aria-hidden="true" />
              Editar datos
            </Link>
            {activeTab === "ficha" ? (
              <DeleteClientButton
                clientId={client.id}
                clientName={client.name}
              />
            ) : null}
          </div>
        </div>
      </section>

      <div className="mb-4 print:hidden">
        <Notice
          error={
            query?.error ??
            notesResult.error?.message ??
            filesResult.error?.message ??
            migrationPendingMessage(weightsResult.error) ??
            migrationPendingMessage(anthropometryResult.error) ??
            migrationPendingMessage(appointmentsResult.error)
          }
          success={query?.success}
        />
      </div>

      <nav
        className="mb-5 flex flex-nowrap gap-1.5 overflow-x-auto rounded-xl bg-[#f2f3ff] p-1.5 text-sm print:hidden"
        aria-label="Apartados del cliente"
        role="tablist"
      >
        {clientTabs
          .filter((tab) => tab.key !== "informe")
          .map((tab) => {
            const selected = activeTab === tab.key;

            return (
              <Link
                key={tab.key}
                href={clientTabHref(client.id, tab.key)}
                className={`whitespace-nowrap rounded-lg px-4 py-2 font-medium transition ${
                  selected
                    ? "bg-white font-semibold text-[#0b4f3a] shadow-sm"
                    : "text-slate-600 hover:bg-white/60 hover:text-slate-950"
                }`}
                aria-current={selected ? "page" : undefined}
                aria-selected={selected}
                role="tab"
              >
                {tab.label}
              </Link>
            );
          })}
      </nav>

      <div>
        {activeTab === "ficha" ? (
          <section id="ficha" className={cardClass}>
            <SectionTitle
              title="Ficha"
              description="Datos personales y resumen actual del cliente."
            />
            <div className="space-y-5">
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
                <MiniStat
                  label="Edad"
                  value={age !== null ? `${age} años` : "--"}
                  color="#64748b"
                />
                <MiniStat
                  label="Peso actual"
                  value={numberLabel(calculationWeight, "kg")}
                />
                <MiniStat
                  label="IMC"
                  value={latestCalc?.imc ?? bmi ?? "--"}
                  color="#2563eb"
                  helper={latestCalc?.imcCat}
                />
                <MiniStat
                  label="S6 pliegues"
                  value={latestCalc ? `${latestCalc.sum6} mm` : "--"}
                  color="#c45a00"
                />
                <MiniStat
                  label="Kcal/dia plan"
                  value={planCalories || "--"}
                  color="#be185d"
                />
              </div>

              <div
                className={`grid gap-5 ${
                  nextAppointment || recentNotes.length
                    ? "md:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]"
                    : ""
                }`}
              >
                <div className="space-y-5">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 h-full">
                    <h3 className="mb-3 text-sm font-semibold text-slate-900">
                      Datos clave
                    </h3>
                    <dl className="grid gap-3 text-sm md:grid-cols-2">
                      {personalInfo.map(({ label, value, Icon }) => (
                        <div
                          key={label}
                          className="flex gap-3 rounded-lg bg-white p-3"
                        >
                          <Icon
                            className="mt-0.5 h-4 w-4 text-slate-400"
                            aria-hidden="true"
                          />
                          <div className="min-w-0">
                            <dt className={labelClass}>{label}</dt>
                            <dd className="mt-1 break-words font-medium text-slate-800">
                              {value}
                            </dd>
                          </div>
                        </div>
                      ))}
                    </dl>
                  </div>

                  {client.allergies || client.notes ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {client.allergies ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                          <div className={labelClass}>Alergias</div>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-amber-900">
                            {client.allergies}
                          </p>
                        </div>
                      ) : null}
                      {client.notes ? (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                          <div className={labelClass}>Notas de ficha</div>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                            {client.notes}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {nextAppointment || recentNotes.length ? (
                  <aside className="space-y-5">
                    {nextAppointment ? (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <h3 className="text-sm font-semibold text-emerald-950">
                            Proxima cita
                          </h3>
                          <Link
                            href={clientTabHref(client.id, "citas")}
                            className="text-xs font-semibold text-emerald-800 hover:text-emerald-700"
                          >
                            Ver citas
                          </Link>
                        </div>
                        <div className="flex gap-3">
                          <DateBadge date={nextAppointment.scheduled_date} />
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-950">
                              {nextAppointment.appointment_type}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-3 text-sm text-slate-600">
                              {nextAppointment.scheduled_time ? (
                                <span className="inline-flex items-center gap-1">
                                  <Clock
                                    className="h-3.5 w-3.5 text-emerald-700"
                                    aria-hidden="true"
                                  />
                                  {nextAppointment.scheduled_time.slice(0, 5)}
                                </span>
                              ) : null}
                              <span>
                                {formatDate(nextAppointment.scheduled_date)}
                              </span>
                            </div>
                            {nextAppointment.notes ? (
                              <p className="mt-2 text-sm leading-6 text-slate-700">
                                {nextAppointment.notes}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {recentNotes.length ? (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <h3 className="text-sm font-semibold text-slate-900">
                            Ultimas 5 notas
                          </h3>
                          <Link
                            href={clientTabHref(client.id, "notas")}
                            className="text-xs font-semibold text-emerald-800 hover:text-emerald-700"
                          >
                            Ver notas
                          </Link>
                        </div>
                        <div className="divide-y divide-slate-200">
                          {recentNotes.map((note) => {
                            const isSupplement =
                              note.note_type === "supplement";

                            return (
                              <article
                                key={note.id}
                                className="py-3 first:pt-0 last:pb-0"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className={labelClass}>
                                    {formatDate(note.created_at)}
                                  </div>
                                  {isSupplement ? (
                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[0.65rem] font-semibold uppercase text-emerald-800">
                                      Suplemento
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                  {note.content}
                                </p>
                              </article>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </aside>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "peso" ? (
          <section id="peso" className={cardClass}>
            <SectionTitle
              title="Peso"
              description="Evolucion del peso, resumen e historial de registros."
              action={
                <form
                  action={addClientWeight}
                  className="flex flex-wrap items-end gap-2"
                >
                  <input type="hidden" name="client_id" value={client.id} />
                  <label className="space-y-1">
                    <span className={labelClass}>Fecha</span>
                    <input
                      name="measured_at"
                      type="date"
                      defaultValue={today}
                      className={inputClass}
                    />
                  </label>
                  <label className="w-32 space-y-1">
                    <span className={labelClass}>Peso</span>
                    <input
                      name="weight_kg"
                      type="number"
                      step="0.1"
                      min="0"
                      inputMode="decimal"
                      placeholder="kg"
                      className={inputClass}
                    />
                  </label>
                  <SubmitButton
                    className="inline-flex items-center justify-center cursor-pointer gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    pendingLabel="Guardando..."
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Añadir
                  </SubmitButton>
                </form>
              }
            />

            {weightPoints.length ? (
              <>
                <div className="mb-5 rounded-lg border border-slate-200 bg-white p-3">
                  <WeightChart points={weightPoints} />
                </div>
                <div className="mb-5 grid gap-3 grid-cols-2 lg:grid-cols-5">
                  <MiniStat
                    label="Actual"
                    value={numberLabel(calculationWeight, "kg")}
                  />
                  <MiniStat
                    label="Inicial"
                    value={numberLabel(initialWeight, "kg")}
                    color="#64748b"
                  />
                  <MiniStat
                    label="Variacion"
                    value={
                      weightDelta !== null
                        ? `${weightDelta > 0 ? "+" : ""}${weightDelta.toFixed(1)} kg`
                        : "--"
                    }
                    color={
                      weightDelta !== null && weightDelta <= 0
                        ? "#2d7a3a"
                        : "#e05252"
                    }
                  />
                  <MiniStat
                    label="Minimo"
                    value={numberLabel(Math.min(...weightValues), "kg")}
                    color="#2563eb"
                  />
                  <MiniStat
                    label="Maximo"
                    value={numberLabel(Math.max(...weightValues), "kg")}
                    color="#c45a00"
                  />
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3">Peso</th>
                        <th className="px-4 py-3">Variacion</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[...weightPoints].reverse().map((point, index, rows) => {
                        const previous = rows[index + 1];
                        const delta = previous
                          ? Number(point.weight_kg) - Number(previous.weight_kg)
                          : null;
                        return (
                          <tr key={point.id}>
                            <td className="px-4 py-3 text-slate-500">
                              {point.id === "current" ? (
                                formatDate(point.measured_at)
                              ) : (
                                <input
                                  form={`weight-${point.id}`}
                                  name="measured_at"
                                  type="date"
                                  defaultValue={point.measured_at}
                                  className={`${inputClass} max-w-40`}
                                />
                              )}
                            </td>
                            <td className="px-4 py-3 font-semibold text-emerald-800">
                              {point.id === "current" ? (
                                numberLabel(point.weight_kg, "kg")
                              ) : (
                                <input
                                  form={`weight-${point.id}`}
                                  name="weight_kg"
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  inputMode="decimal"
                                  defaultValue={point.weight_kg}
                                  className={`${inputClass} max-w-28 font-semibold text-emerald-800`}
                                />
                              )}
                            </td>
                            <td
                              className="px-4 py-3 font-semibold"
                              style={{
                                color:
                                  delta === null
                                    ? "#94a3b8"
                                    : delta <= 0
                                      ? "#2d7a3a"
                                      : "#e05252",
                              }}
                            >
                              {delta === null
                                ? "--"
                                : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg`}
                            </td>
                            <td className="px-4 py-3">
                              {point.id === "current" ? (
                                <span className="block text-right text-xs text-slate-400">
                                  Ficha
                                </span>
                              ) : (
                                <div className="flex justify-end gap-2">
                                  <form
                                    id={`weight-${point.id}`}
                                    action={updateClientWeight}
                                  >
                                    <input
                                      type="hidden"
                                      name="client_id"
                                      value={client.id}
                                    />
                                    <input
                                      type="hidden"
                                      name="weight_id"
                                      value={point.id}
                                    />
                                    <SubmitButton
                                      className="inline-flex h-8 w-8 items-center justify-center cursor-pointer rounded-lg text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700"
                                      pendingLabel=""
                                      ariaLabel="Guardar peso"
                                      icon="save"
                                    />
                                  </form>
                                  <form action={deleteClientWeight}>
                                    <input
                                      type="hidden"
                                      name="client_id"
                                      value={client.id}
                                    />
                                    <input
                                      type="hidden"
                                      name="weight_id"
                                      value={point.id}
                                    />
                                    <SubmitButton
                                      className="inline-flex h-8 w-8 items-center justify-center cursor-pointer rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                                      pendingLabel=""
                                      ariaLabel="Eliminar peso"
                                      icon="trash"
                                    />
                                  </form>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <EmptyState
                title="Sin registros de peso"
                description="Anade el primer peso para empezar a ver la evolucion."
              />
            )}
          </section>
        ) : null}

        {activeTab === "plan" ? (
          <section id="plan" className={cardClass}>
            <SectionTitle
              title="Plan nutricional"
              description="Calculadora energetica, entrenamientos y macros del plan actual."
            />
            <NutritionPlanForm
              clientId={client.id}
              content={plan?.content ?? ""}
              settings={planSettings}
              meals={mealDistribution}
              reference={{
                weightKg: calculationWeight,
                heightCm: calculationHeight,
                age,
                sex: client.sex,
              }}
            />
          </section>
        ) : null}

        {activeTab === "antropometria" ? (
          <AnthropometrySection
            client={client}
            assessments={anthropometryRows}
            supplementNotes={supplementNotes}
            today={today}
            defaultWeight={calculationWeight}
          />
        ) : null}

        {false ? (
          <section id="antropometria" className={cardClass}>
            <SectionTitle
              title="Antropometria"
              description="Valoraciones, composicion corporal, proporcionalidad y somatotipo."
              action={
                <AnthropometryModal>
                  <form action={addClientAnthropometry} className="space-y-4">
                    <input type="hidden" name="client_id" value={client.id} />
                    <div className="grid gap-3 md:grid-cols-4">
                      <label className="space-y-1.5">
                        <span className={labelClass}>Fecha</span>
                        <input
                          name="measured_at"
                          type="date"
                          defaultValue={today}
                          className={inputClass}
                        />
                      </label>
                      <label className="space-y-1.5">
                        <span className={labelClass}>Peso (kg)</span>
                        <input
                          name="weight_kg"
                          type="number"
                          step="0.1"
                          min="0"
                          inputMode="decimal"
                          defaultValue={calculationWeight ?? ""}
                          className={inputClass}
                        />
                      </label>
                      <label className="space-y-1.5">
                        <span className={labelClass}>Altura (cm)</span>
                        <input
                          name="height_cm"
                          type="number"
                          step="0.1"
                          min="0"
                          inputMode="decimal"
                          defaultValue={client.height_cm ?? ""}
                          className={inputClass}
                        />
                      </label>
                      <label className="space-y-1.5">
                        <span className={labelClass}>Sexo</span>
                        <select
                          name="sex"
                          defaultValue={client.sex ?? ""}
                          className={inputClass}
                        >
                          <option value="" disabled>
                            Selecciona
                          </option>
                          <option value="male">Hombre</option>
                          <option value="female">Mujer</option>
                        </select>
                      </label>
                    </div>
                    <div className="grid gap-4 xl:grid-cols-3">
                      <MeasurementInputRows
                        title="Pliegues (mm)"
                        prefix="skinfolds"
                        fields={SKINFOLD_FIELDS}
                      />
                      <MeasurementInputRows
                        title="Perimetros (cm)"
                        prefix="girths"
                        fields={GIRTH_FIELDS}
                      />
                      <MeasurementInputRows
                        title="Diametros (cm)"
                        prefix="diameters"
                        fields={DIAMETER_FIELDS}
                      />
                    </div>
                    <label className="block space-y-1.5">
                      <span className={labelClass}>Notas</span>
                      <textarea
                        name="notes"
                        rows={3}
                        className="min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                      />
                    </label>
                    <div className="flex justify-end">
                      <SubmitButton
                        className="inline-flex items-center cursor-pointer justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                        pendingLabel="Guardando..."
                        icon="save"
                      >
                        Guardar valoracion
                      </SubmitButton>
                    </div>
                  </form>
                </AnthropometryModal>
              }
            />

            {selectedAnthro &&
            selectedSkinfolds &&
            selectedGirths &&
            selectedDiameters &&
            selectedCalc ? (
              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  {anthropometryRows.map((row) => (
                    <Link
                      key={row.id}
                      href={`/clients/${client.id}?tab=antropometria&anthropometry=${row.id}`}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                        row.id === selectedAnthro.id
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                          : "border-slate-200 bg-slate-50 text-slate-500"
                      }`}
                      aria-current={
                        row.id === selectedAnthro.id ? "page" : undefined
                      }
                    >
                      {formatDate(row.measured_at)}
                    </Link>
                  ))}
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className={mutedTileClass}>
                    <h3 className="mb-3 text-sm font-semibold text-slate-900">
                      Datos generales
                    </h3>
                    <dl className="grid gap-2 text-sm sm:grid-cols-2">
                      {[
                        ["Fecha", formatDate(selectedAnthro.measured_at)],
                        ["Peso actual", numberLabel(calculationWeight, "kg")],
                        ["Altura", `${selectedAnthro.height_cm} cm`],
                        ["IMC", selectedCalc.imc],
                        ["S6 pliegues", `${selectedCalc.sum6} mm`],
                        ["S8 pliegues", `${selectedCalc.sum8} mm`],
                        ["Ratio C/C", selectedCalc.ratioCM],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="flex justify-between border-b border-slate-100 py-1"
                        >
                          <dt className="text-slate-500">{label}</dt>
                          <dd className="font-semibold text-slate-900">
                            {value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <MiniStat
                      label="% Grasa Carter"
                      value={`${selectedCalc.pctGrass}%`}
                      color="#c45a00"
                      helper={`${selectedCalc.pGras} kg`}
                    />
                    <MiniStat
                      label="% Muscular Lee"
                      value={`${selectedCalc.pctMusc}%`}
                      color="#2563eb"
                      helper={`${selectedCalc.pMusc} kg`}
                    />
                    <MiniStat
                      label="% Osea Rocha"
                      value={`${selectedCalc.pctOssi}%`}
                      color="#2d7a3a"
                      helper={`${selectedCalc.pOssi} kg`}
                    />
                    <MiniStat
                      label="% Residual"
                      value={`${selectedCalc.pctResid}%`}
                      color="#94a3b8"
                      helper={`${selectedCalc.pResid} kg`}
                    />
                  </div>
                </div>

                <div className={mutedTileClass}>
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">
                    Composicion corporal - sumatorio de componentes
                  </h3>
                  <ComponentBar calc={selectedCalc} />
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <MeasurementBars
                    title="Pliegues cutaneos (mm)"
                    fields={SKINFOLD_FIELDS}
                    values={selectedSkinfolds}
                    scale={40}
                  />
                  <MeasurementBars
                    title="Perimetros (cm)"
                    fields={GIRTH_FIELDS}
                    values={selectedGirths}
                    scale={110}
                  />
                  <MeasurementBars
                    title="Diametros (cm)"
                    fields={DIAMETER_FIELDS}
                    values={selectedDiameters}
                    scale={12}
                  />
                </div>

                <div className={mutedTileClass}>
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">
                    Proporcionalidad - valores Z
                  </h3>
                  <div className="grid gap-5 lg:grid-cols-3">
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-700">
                        Pliegues
                      </div>
                      {SKINFOLD_FIELDS.map((field) => (
                        <ZScoreRow
                          key={field.key}
                          label={field.label}
                          value={selectedSkinfolds[field.key]}
                          unit={field.unit}
                          z={selectedCalc.zScores[field.key]}
                          color={field.color}
                        />
                      ))}
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-orange-700">
                        Perimetros
                      </div>
                      {GIRTH_FIELDS.map((field) => (
                        <ZScoreRow
                          key={field.key}
                          label={field.label}
                          value={selectedGirths[field.key]}
                          unit={field.unit}
                          z={selectedCalc.zScores[field.key]}
                          color={field.color}
                        />
                      ))}
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                        Diametros y composicion
                      </div>
                      {[
                        ...DIAMETER_FIELDS.map((field) => ({
                          ...field,
                          value: selectedDiameters[field.key],
                          zKey: field.key,
                        })),
                        {
                          label: "Brazo corr.",
                          unit: "cm",
                          color: "#2d7a3a",
                          value: selectedCalc.brCorGen,
                          zKey: "brac_corr",
                        },
                        {
                          label: "Pierna corr.",
                          unit: "cm",
                          color: "#2d7a3a",
                          value: selectedCalc.camaCorGen,
                          zKey: "cama_corr",
                        },
                        {
                          label: "Peso graso",
                          unit: "kg",
                          color: "#c45a00",
                          value: selectedCalc.pGras,
                          zKey: "pGras",
                        },
                        {
                          label: "Peso muscular",
                          unit: "kg",
                          color: "#2563eb",
                          value: selectedCalc.pMusc,
                          zKey: "pMusc",
                        },
                        {
                          label: "Peso oseo",
                          unit: "kg",
                          color: "#2d7a3a",
                          value: selectedCalc.pOssi,
                          zKey: "pOssi",
                        },
                      ].map((row) => (
                        <ZScoreRow
                          key={row.zKey}
                          label={row.label}
                          value={row.value}
                          unit={row.unit}
                          z={selectedCalc.zScores[row.zKey]}
                          color={row.color}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className={mutedTileClass}>
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">
                    Somatotipo Heath-Carter
                  </h3>
                  <div className="grid gap-5 lg:grid-cols-[auto_minmax(0,1fr)]">
                    <Somatocart
                      points={somatotypePoints}
                      selectedIndex={selectedSomatotypeIndex}
                    />
                    <div className="space-y-4">
                      {[
                        [
                          "Endomorfia",
                          selectedCalc.endo,
                          "#c45a00",
                          "Grasa y tejidos blandos",
                        ],
                        [
                          "Mesomorfia",
                          selectedCalc.meso,
                          "#2563eb",
                          "Musculo y hueso",
                        ],
                        [
                          "Ectomorfia",
                          selectedCalc.ecto,
                          "#7c3aed",
                          "Linealidad",
                        ],
                      ].map(([label, value, color, helper]) => (
                        <div key={label}>
                          <div className="mb-1 flex justify-between">
                            <span
                              className="text-sm font-semibold"
                              style={{ color }}
                            >
                              {label}
                            </span>
                            <span
                              className="text-xl font-semibold"
                              style={{ color }}
                            >
                              {value}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, (Number(value) / 8) * 100)}%`,
                                backgroundColor: String(color),
                              }}
                            />
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {helper}
                          </div>
                        </div>
                      ))}
                      <div className="grid gap-3 sm:grid-cols-3">
                        <MiniStat
                          label="X endo-ecto"
                          value={selectedCalc.somatX}
                          color="#64748b"
                        />
                        <MiniStat
                          label="Y meso"
                          value={selectedCalc.somatY}
                          color="#64748b"
                        />
                        <MiniStat
                          label="S6 pliegues"
                          value={`${selectedCalc.sum6} mm`}
                          color="#c45a00"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                title="Sin valoraciones antropometricas completas"
                description="Guarda una valoracion con pliegues, perimetros y diametros para ver los calculos."
              />
            )}
          </section>
        ) : null}

        {activeTab === "citas" ? (
          <section id="citas" className={cardClass}>
            <SectionTitle
              title="Citas"
              description="Proximas citas, completadas e historial."
            />
            <form action={addClientAppointment}>
              <div className="grid gap-2 grid-cols-2">
                <input type="hidden" name="client_id" value={client.id} />
                <label className="space-y-1">
                  <span className={labelClass}>Fecha</span>
                  <input
                    name="scheduled_date"
                    type="date"
                    defaultValue={today}
                    required
                    className={inputClass}
                  />
                </label>
                <label className="space-y-1">
                  <span className={labelClass}>Hora</span>
                  <input
                    name="scheduled_time"
                    type="time"
                    defaultValue="09:00"
                    required
                    className={inputClass}
                  />
                </label>
                <label className="space-y-1">
                  <span className={labelClass}>Duración</span>
                  <select
                    name="duration_minutes"
                    defaultValue="60"
                    className={inputClass}
                  >
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">1 hora</option>
                    <option value="90">1 h 30 min</option>
                    <option value="120">2 horas</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className={labelClass}>Tipo</span>
                  <select
                    name="appointment_type"
                    defaultValue={appointmentTypes[0]}
                    className={inputClass}
                  >
                    {appointmentTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 col-span-2">
                  <span className={labelClass}>Notas</span>
                  <input
                    name="notes"
                    placeholder="Indicaciones, recordatorios..."
                    className={inputClass}
                  />
                </label>
              </div>
              <SubmitButton
                className="block ml-auto mt-5 cursor-pointer rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                pendingLabel="Guardando..."
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Añadir
              </SubmitButton>
            </form>
            <div className="grid gap-4 mt-5">
              <AppointmentList
                title="Proximas citas"
                appointments={upcomingAppointments}
                clientId={client.id}
                empty="Sin citas programadas."
              />
              {completedAppointments.length ? (
                <AppointmentList
                  title="Completadas"
                  appointments={completedAppointments}
                  clientId={client.id}
                  completed
                  empty="Sin citas completadas."
                />
              ) : null}
              <AppointmentList
                title="Historial (pasadas)"
                appointments={pastAppointments}
                clientId={client.id}
                empty="Sin historial de citas pasadas."
              />
            </div>
          </section>
        ) : null}

        {false ? (
          <section
            id="informe"
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm print:border-0 print:p-0 print:shadow-none"
          >
            <div className="print:hidden">
              <SectionTitle
                title="Informe"
                description="Resumen imprimible de la ultima valoracion antropometrica."
                action={
                  <PrintButton className="inline-flex items-center justify-center cursor-pointer gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 print:hidden" />
                }
              />
            </div>
            <div id="client-report" className="bg-white print:text-[9px]">
              <div className="mb-5 flex items-end justify-between border-b-4 border-emerald-700 pb-4 print:mb-2 print:pb-1">
                <div>
                  <div className="text-2xl font-semibold text-emerald-800 print:text-lg">
                    Informe Antropometrico
                  </div>
                  <div className="mt-1 text-xs text-slate-500 print:text-[8px]">
                    Valoracion:{" "}
                    {latestAnthro ? formatDate(latestAnthro.measured_at) : "--"}{" "}
                    | Generado: {formatDate(today)}
                  </div>
                </div>
                <div className="text-right text-xs font-semibold uppercase tracking-wide text-slate-400 print:text-[8px]">
                  NutriSport Pro
                </div>
              </div>

              <div className="mb-5 grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-7 print:mb-2 print:grid-cols-7 print:gap-1.5 print:p-1.5">
                {[
                  ["Paciente", client.name],
                  ["Edad", age !== null ? `${age} años` : "--"],
                  [
                    "Sexo",
                    client.sex === "female"
                      ? "Mujer"
                      : client.sex === "male"
                        ? "Hombre"
                        : "--",
                  ],

                  [
                    "Peso",
                    calculationWeight ? `${calculationWeight} kg` : "--",
                  ],
                  [
                    "Talla",
                    calculationHeight ? `${calculationHeight} cm` : "--",
                  ],
                  ["IMC", latestCalc?.imc ?? bmi ?? "--"],
                  ["Deporte", client.sport || "--"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className={labelClass}>{label}</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900 print:text-[9px]">
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              {supplementNotes.length ? (
                <div className="mb-5 rounded-lg bg-emerald-50 p-3 print:mb-2 print:p-1.5">
                  <h3 className="mb-2 text-sm font-semibold text-slate-900 print:mb-1 print:text-[10px]">
                    Suplementos
                  </h3>
                  <div className="grid gap-2 text-sm leading-6 text-slate-700 sm:grid-cols-2 print:grid-cols-2 print:gap-1 print:text-[8px] print:leading-tight">
                    {supplementNotes.map((note) => (
                      <div
                        key={note.id}
                        className="rounded-md bg-white px-3 py-2 print:px-2 print:py-1"
                      >
                        {note.content}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {latestAnthro &&
              latestSkinfolds &&
              latestGirths &&
              latestDiameters &&
              latestCalc ? (
                <div className="space-y-5 print:space-y-2">
                  <div>
                    <h3 className="mb-3 border-l-4 border-emerald-700 pl-3 text-sm font-semibold text-slate-900 print:mb-1 print:mt-4 print:pl-2 print:text-[10px]">
                      Composicion corporal
                    </h3>
                    <ComponentBar calc={latestCalc} />
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 print:mt-1.5 print:grid-cols-4 print:gap-1">
                      {[
                        [
                          "Grasa",
                          latestCalc.pctGrass,
                          latestCalc.pGras,
                          "#c45a00",
                          "Carter 1982",
                        ],
                        [
                          "Muscular",
                          latestCalc.pctMusc,
                          latestCalc.pMusc,
                          "#2563eb",
                          "Lee 2000",
                        ],
                        [
                          "Osea",
                          latestCalc.pctOssi,
                          latestCalc.pOssi,
                          "#2d7a3a",
                          "Rocha 1974",
                        ],
                        [
                          "Residual",
                          latestCalc.pctResid,
                          latestCalc.pResid,
                          "#94a3b8",
                          "Diferencia",
                        ],
                      ].map(([label, percent, kg, color, method]) => (
                        <div
                          key={label}
                          className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center print:p-1.5"
                        >
                          <div className={labelClass}>{label}</div>
                          <div
                            className="mt-1 text-2xl font-semibold print:mt-0 print:text-sm"
                            style={{ color }}
                          >
                            {percent}%
                          </div>
                          <div className="text-sm font-semibold text-slate-700 print:text-[9px]">
                            {kg} kg
                          </div>
                          <div className="mt-1 text-xs text-slate-400 print:mt-0 print:text-[8px]">
                            {method}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 border-l-4 border-blue-700 pl-3 text-sm font-semibold text-slate-900 print:mb-1 print:pl-2 print:text-[10px]">
                      Somatotipo Heath-Carter
                    </h3>
                    <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)] print:grid-cols-[190px_minmax(0,1fr)] print:items-center print:gap-3">
                      <Somatocart
                        points={somatotypePoints}
                        selectedIndex={somatotypePoints.length - 1}
                        size={190}
                      />
                      <div className="space-y-3 print:space-y-1">
                        {[
                          ["Endomorfia", latestCalc.endo, "#c45a00"],
                          ["Mesomorfia", latestCalc.meso, "#2563eb"],
                          ["Ectomorfia", latestCalc.ecto, "#7c3aed"],
                        ].map(([label, value, color]) => (
                          <div key={label}>
                            <div
                              className="mb-1 flex justify-between text-sm font-semibold print:mb-0.5 print:text-[10px]"
                              style={{ color }}
                            >
                              <span>{label}</span>
                              <span>{value}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-200 print:h-1">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min(100, (Number(value) / 8) * 100)}%`,
                                  backgroundColor: String(color),
                                }}
                              />
                            </div>
                          </div>
                        ))}
                        <div className="grid gap-2 sm:grid-cols-3 print:gap-1">
                          <MiniStat
                            label="X"
                            value={latestCalc.somatX}
                            color="#64748b"
                          />
                          <MiniStat
                            label="Y"
                            value={latestCalc.somatY}
                            color="#64748b"
                          />
                          <MiniStat
                            label="S6"
                            value={`${latestCalc.sum6} mm`}
                            color="#c45a00"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 border-l-4 border-violet-700 pl-3 text-sm font-semibold text-slate-900 print:mb-1 print:pl-2 print:text-[10px]">
                      Medidas detalladas
                    </h3>
                    <div className="grid gap-3 lg:grid-cols-3 print:grid-cols-3 print:gap-1.5">
                      <MeasurementBars
                        title="Pliegues cutaneos"
                        fields={SKINFOLD_FIELDS}
                        values={latestSkinfolds}
                        scale={40}
                      />
                      <MeasurementBars
                        title="Perimetros"
                        fields={GIRTH_FIELDS}
                        values={latestGirths}
                        scale={110}
                      />
                      <MeasurementBars
                        title="Diametros"
                        fields={DIAMETER_FIELDS}
                        values={latestDiameters}
                        scale={12}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-slate-500">
                  Sin valoraciones antropometricas registradas.
                </p>
              )}
            </div>
          </section>
        ) : null}

        {activeTab === "notas" ? (
          <section id="notas" className={cardClass}>
            <SectionTitle title="Historial y notas" />
            <form action={addClientNote} className="space-y-3">
              <input type="hidden" name="client_id" value={client.id} />
              <div className="max-w-xs space-y-1">
                <label htmlFor="note_type" className={labelClass}>
                  Tipo de nota
                </label>
                <select
                  id="note_type"
                  name="note_type"
                  defaultValue="normal"
                  className={inputClass}
                >
                  <option value="normal">Normal</option>
                  <option value="supplement">Suplemento</option>
                </select>
              </div>
              <textarea
                name="content"
                rows={4}
                className="min-h-28 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                placeholder="Anade seguimiento, sintomas, adherencia o proximos pasos."
              />
              <div className="flex justify-end">
                <SubmitButton
                  className="inline-flex items-center justify-center cursor-pointer gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  pendingLabel="Anadiendo..."
                >
                  Añadir nota
                </SubmitButton>
              </div>
            </form>

            <div className="mt-5 divide-y divide-slate-100">
              {notes.length ? (
                notes.map((note) => {
                  const isSupplement = note.note_type === "supplement";

                  return (
                    <article key={note.id} className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className={labelClass}>
                              {formatDate(note.created_at)}
                            </div>
                            {isSupplement ? (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[0.65rem] font-semibold uppercase text-emerald-800">
                                Suplemento
                              </span>
                            ) : null}
                          </div>
                          <p
                            className={`mt-2 whitespace-pre-wrap text-sm leading-6 ${
                              isSupplement
                                ? "text-emerald-950"
                                : "text-slate-700"
                            }`}
                          >
                            {note.content}
                          </p>
                        </div>
                        <form action={deleteClientNote}>
                          <input
                            type="hidden"
                            name="client_id"
                            value={client.id}
                          />
                          <input type="hidden" name="note_id" value={note.id} />
                          <SubmitButton
                            className="inline-flex h-8 w-8 items-center cursor-pointer justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                            ariaLabel="Eliminar nota"
                            icon="trash"
                          />
                        </form>
                      </div>
                      <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-xs font-semibold text-slate-600 transition hover:text-emerald-800">
                          <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                          Editar nota
                        </summary>
                        <form
                          action={updateClientNote}
                          className="mt-3 space-y-3 border-t border-slate-200 pt-3"
                        >
                          <input
                            type="hidden"
                            name="client_id"
                            value={client.id}
                          />
                          <input type="hidden" name="note_id" value={note.id} />
                          <label className="block max-w-xs space-y-1">
                            <span className={labelClass}>Tipo de nota</span>
                            <select
                              name="note_type"
                              defaultValue={note.note_type ?? "normal"}
                              className={inputClass}
                            >
                              <option value="normal">Normal</option>
                              <option value="supplement">Suplemento</option>
                            </select>
                          </label>
                          <label className="block space-y-1">
                            <span className={labelClass}>Contenido</span>
                            <textarea
                              name="content"
                              rows={4}
                              required
                              defaultValue={note.content}
                              className="min-h-28 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                            />
                          </label>
                          <div className="flex justify-end">
                            <SubmitButton
                              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                              pendingLabel="Guardando..."
                              icon="save"
                            >
                              Guardar cambios
                            </SubmitButton>
                          </div>
                        </form>
                      </details>
                    </article>
                  );
                })
              ) : (
                <p className="py-6 text-sm text-slate-500">
                  Sin historial todavia. Anade la primera nota despues de una
                  revision.
                </p>
              )}
            </div>
          </section>
        ) : null}

        {activeTab === "archivos" ? (
          <section id="archivos" className={cardClass}>
            <SectionTitle title="Archivos del cliente" />
            <form
              action={uploadClientFile}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <input type="hidden" name="client_id" value={client.id} />
              <input
                name="file"
                type="file"
                className="block w-full cursor-pointer text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
              />
              <SubmitButton
                className="inline-flex items-center justify-center cursor-pointer gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                pendingLabel="Subiendo..."
                icon="upload"
              >
                Subir archivo
              </SubmitButton>
            </form>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {files.length ? (
                files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 p-3"
                  >
                    <FileText
                      className="h-4 w-4 shrink-0 text-slate-400"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      {file.signedUrl ? (
                        <a
                          href={file.signedUrl}
                          className="block truncate text-sm font-medium text-slate-800 hover:text-emerald-800"
                        >
                          {file.file_name}
                        </a>
                      ) : (
                        <div className="truncate text-sm font-medium text-slate-800">
                          {file.file_name}
                        </div>
                      )}
                      <div className="text-xs text-slate-400">
                        {fileSizeLabel(file.size_bytes)}
                      </div>
                    </div>
                    {file.signedUrl ? (
                      <a
                        href={file.signedUrl}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                        aria-label={`Descargar ${file.file_name}`}
                      >
                        <Download className="h-4 w-4" aria-hidden="true" />
                      </a>
                    ) : null}
                    <form action={deleteClientFile}>
                      <input type="hidden" name="client_id" value={client.id} />
                      <input type="hidden" name="file_id" value={file.id} />
                      <SubmitButton
                        className="inline-flex h-8 w-8 items-center cursor-pointer justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        ariaLabel={`Eliminar ${file.file_name}`}
                        icon="trash"
                      />
                    </form>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  No hay archivos subidos.
                </p>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
