"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export type AgendaAppointment = {
  id: string;
  client_id: string;
  scheduled_date: string;
  scheduled_time: string | null;
  duration_minutes: number;
  appointment_type: string;
  notes: string | null;
  completed: boolean;
  clients: { id: string; name: string } | null;
};

type AppointmentsWorkspaceProps = {
  appointments: AgendaAppointment[];
  today: string;
  agendaStartTime: string;
  agendaEndTime: string;
  locale: string;
};

const MAX_WEEK_OFFSET = 2;

function minutesFromTime(value: string | null) {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function clockTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function timelineRange(startTime: string, endTime: string) {
  const start = minutesFromTime(startTime) ?? 7 * 60;
  const proposedEnd = minutesFromTime(endTime) ?? 22 * 60;
  const end = proposedEnd > start ? proposedEnd : 22 * 60;
  const duration = end - start;
  const ticks = [];

  for (let minute = start; minute < end; minute += 60) {
    ticks.push(minute);
  }
  if (ticks.at(-1) !== end) ticks.push(end);

  return { start, end, duration, ticks };
}

function timelineBlocks(
  appointments: AgendaAppointment[],
  range: ReturnType<typeof timelineRange>,
) {
  const laneEnds: number[] = [];

  return appointments
    .flatMap((appointment) => {
      const start = minutesFromTime(appointment.scheduled_time);
      if (start === null) return [];

      const end = start + appointment.duration_minutes;
      if (end <= range.start || start >= range.end) {
        return [];
      }

      return [
        {
          appointment,
          originalStart: start,
          originalEnd: end,
          start: Math.max(start, range.start),
          end: Math.min(end, range.end),
        },
      ];
    })
    .sort((left, right) => left.start - right.start || left.end - right.end)
    .map((block) => {
      let lane = laneEnds.findIndex((laneEnd) => laneEnd <= block.start);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(block.end);
      } else {
        laneEnds[lane] = block.end;
      }

      return {
        ...block,
        lane,
        left: ((block.start - range.start) / range.duration) * 100,
        width: ((block.end - block.start) / range.duration) * 100,
      };
    });
}

function DayTimeline({
  appointments,
  startTime,
  endTime,
}: {
  appointments: AgendaAppointment[];
  startTime: string;
  endTime: string;
}) {
  const range = timelineRange(startTime, endTime);
  const blocks = timelineBlocks(appointments, range);
  const laneCount = blocks.length
    ? Math.max(...blocks.map((block) => block.lane)) + 1
    : 1;
  const appointmentsWithoutVisibleTime = appointments.filter((appointment) => {
    const start = minutesFromTime(appointment.scheduled_time);
    if (start === null) return true;
    const end = start + appointment.duration_minutes;
    return end <= range.start || start >= range.end;
  }).length;

  return (
    <div className="border-b border-slate-100 bg-[#fbfcfb] px-5 py-5 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-[#003626]">
            Disponibilidad del día
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Franja visible de {clockTime(range.start)} a {clockTime(range.end)}
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" />
            Ocupado
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm border border-slate-300 bg-white" />
            Libre
          </span>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto pb-1">
        <div
          style={{
            minWidth: `${Math.max(720, Math.ceil(range.duration / 60) * 72)}px`,
          }}
        >
          <div className="relative h-5 text-[10px] font-semibold text-slate-400">
            {range.ticks.map((minute, index) => (
              <span
                key={minute}
                className="absolute top-0"
                style={{
                  left: `${((minute - range.start) / range.duration) * 100}%`,
                  transform:
                    index === 0
                      ? "translateX(0)"
                      : index === range.ticks.length - 1
                        ? "translateX(-100%)"
                        : "translateX(-50%)",
                }}
              >
                {clockTime(minute)}
              </span>
            ))}
          </div>
          <div
            className="relative overflow-hidden rounded-xl border border-slate-300 bg-white"
            style={{ height: `${Math.max(35, laneCount * 38)}px` }}
          >
            {range.ticks.map((minute) => (
              <span
                key={minute}
                className="absolute inset-y-0 border-l border-slate-200"
                style={{
                  left: `${((minute - range.start) / range.duration) * 100}%`,
                }}
                aria-hidden="true"
              />
            ))}

            {blocks.map((block) => {
              const clientName = block.appointment.clients?.name ?? "Cliente";
              const label = `${clientName} · ${clockTime(block.originalStart)}–${clockTime(block.originalEnd)}`;
              return (
                <Link
                  key={block.appointment.id}
                  href={`/clients/${block.appointment.client_id}?tab=citas`}
                  className={`absolute flex h-8 items-center overflow-hidden rounded-md border px-2 text-[11px] font-semibold text-white shadow-sm transition hover:z-20 hover:brightness-105 ${
                    block.appointment.completed
                      ? "border-slate-500 bg-slate-500"
                      : "border-emerald-700 bg-emerald-600"
                  }`}
                  style={{
                    left: `${block.left}%`,
                    top: `${2 + block.lane * 38}px`,
                    width: `${block.width}%`,
                  }}
                  title={label}
                  aria-label={label}
                >
                  <span className="truncate">{label}</span>
                </Link>
              );
            })}

            {!blocks.length ? (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">
                Sin citas con hora en esta franja
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {appointmentsWithoutVisibleTime ? (
        <p className="mt-2 text-xs text-amber-700">
          {appointmentsWithoutVisibleTime}{" "}
          {appointmentsWithoutVisibleTime === 1
            ? "cita no aparece"
            : "citas no aparecen"}{" "}
          en la barra porque no tiene hora o queda fuera de {clockTime(range.start)}–
          {clockTime(range.end)}.
        </p>
      ) : null}
    </div>
  );
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function weekFromDate(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  const start = addDays(value, -daysSinceMonday);
  return {
    start,
    end: addDays(start, 6),
    days: Array.from({ length: 7 }, (_, index) => addDays(start, index)),
  };
}

function calendarDate(
  value: string,
  options: Intl.DateTimeFormatOptions,
  locale: string,
) {
  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

function fullDate(value: string, locale: string) {
  return calendarDate(value, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }, locale);
}

function shortDate(value: string, locale: string) {
  return calendarDate(value, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }, locale);
}

function dayLabel(value: string, locale: string) {
  return calendarDate(value, { weekday: "long" }, locale);
}

function dayNumber(value: string, locale: string) {
  return calendarDate(value, { day: "numeric", month: "short" }, locale);
}

function timeLabel(value: string | null) {
  return value ? value.slice(0, 5) : "Sin hora";
}

type AppointmentStatus = "completed" | "overdue" | "today" | "scheduled";

function appointmentStatus(
  appointment: { completed: boolean; scheduled_date: string },
  today: string,
): AppointmentStatus {
  if (appointment.completed) return "completed";
  if (appointment.scheduled_date < today) return "overdue";
  if (appointment.scheduled_date === today) return "today";
  return "scheduled";
}

const statusMeta: Record<
  AppointmentStatus,
  { label: string; className: string }
> = {
  completed: {
    label: "Completada",
    className: "bg-emerald-100 text-emerald-800",
  },
  overdue: {
    label: "Pendiente",
    className: "bg-red-100 text-red-700",
  },
  today: {
    label: "Hoy",
    className: "bg-blue-100 text-blue-700",
  },
  scheduled: {
    label: "Programada",
    className: "bg-[#f2f3ff] text-indigo-700",
  },
};

export function AppointmentsWorkspace({
  appointments,
  today,
  agendaStartTime,
  agendaEndTime,
  locale,
}: AppointmentsWorkspaceProps) {
  const agendaRef = useRef<HTMLElement>(null);
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekOffset, setWeekOffset] = useState(0);

  const week = useMemo(
    () => weekFromDate(addDays(today, weekOffset * 7)),
    [today, weekOffset],
  );
  const selectedAppointments = appointments.filter(
    (appointment) => appointment.scheduled_date === selectedDate,
  );
  const weekAppointments = appointments.filter(
    (appointment) =>
      appointment.scheduled_date >= week.start &&
      appointment.scheduled_date <= week.end,
  );
  const orderedAppointments = useMemo(
    () =>
      [...appointments].sort((left, right) => {
        const leftUpcoming = left.scheduled_date >= today;
        const rightUpcoming = right.scheduled_date >= today;

        if (leftUpcoming !== rightUpcoming) return leftUpcoming ? -1 : 1;

        const direction = leftUpcoming ? 1 : -1;
        const dateComparison = left.scheduled_date.localeCompare(
          right.scheduled_date,
        );
        if (dateComparison !== 0) return dateComparison * direction;

        return (left.scheduled_time ?? "99:99").localeCompare(
          right.scheduled_time ?? "99:99",
        );
      }),
    [appointments, today],
  );

  function selectDay(date: string) {
    setSelectedDate(date);
    window.requestAnimationFrame(() => {
      agendaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function changeWeek(nextOffset: number) {
    const boundedOffset = Math.min(MAX_WEEK_OFFSET, Math.max(0, nextOffset));
    const nextWeek = weekFromDate(addDays(today, boundedOffset * 7));
    setWeekOffset(boundedOffset);
    setSelectedDate(boundedOffset === 0 ? today : nextWeek.start);
  }

  const weekTitle =
    weekOffset === 0
      ? "Esta semana"
      : weekOffset === 1
        ? "Próxima semana"
        : "Dentro de dos semanas";
  const selectedIsToday = selectedDate === today;

  return (
    <>
      <section
        ref={agendaRef}
        className="clinical-card scroll-mt-24 overflow-hidden"
      >
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-white to-emerald-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0b4f3a] text-white">
              <CalendarCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-[#003626]">
                {selectedIsToday ? "Agenda de hoy" : "Agenda del día"}
              </h2>
              <p className="mt-0.5 capitalize text-sm text-slate-500">
                {fullDate(selectedDate, locale)}
              </p>
            </div>
          </div>
          <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
            {selectedAppointments.length}{" "}
            {selectedAppointments.length === 1 ? "cita" : "citas"}
          </span>
        </div>

        <DayTimeline
          appointments={selectedAppointments}
          startTime={agendaStartTime}
          endTime={agendaEndTime}
        />

        {selectedAppointments.length ? (
          <div className="divide-y divide-slate-100">
            {selectedAppointments.map((appointment) => {
              const status = statusMeta[appointmentStatus(appointment, today)];
              return (
                <Link
                  key={appointment.id}
                  href={`/clients/${appointment.client_id}?tab=citas`}
                  className="group grid gap-3 px-5 py-4 transition hover:bg-[#f8faf9] sm:grid-cols-[100px_minmax(0,1fr)_auto] sm:items-center sm:px-6"
                >
                  <div className="inline-flex items-center gap-2 font-bold text-[#003626]">
                    <Clock3
                      className="h-4 w-4 text-emerald-600"
                      aria-hidden="true"
                    />
                    {timeLabel(appointment.scheduled_time)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-950">
                      {appointment.clients?.name ?? "Cliente"}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500">
                      <span>{appointment.appointment_type}</span>
                      <span>{appointment.duration_minutes} min</span>
                      {appointment.notes ? (
                        <span className="truncate">{appointment.notes}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}
                    >
                      {status.label}
                    </span>
                    <ArrowRight
                      className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-700"
                      aria-hidden="true"
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="p-5 sm:p-6">
            <EmptyState
              title={
                selectedIsToday
                  ? "No hay citas para hoy"
                  : "No hay citas para este día"
              }
              description="Las citas creadas desde la ficha de cada cliente aparecerán aquí."
            />
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-[-0.02em] text-[#003626]">
              {weekTitle}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Del {shortDate(week.start, locale)} al {shortDate(week.end, locale)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-emerald-700">
              {weekAppointments.length}{" "}
              {weekAppointments.length === 1 ? "cita" : "citas"} en la semana
            </span>
            <div className="inline-flex items-center">
              <button
                type="button"
                onClick={() => changeWeek(weekOffset - 1)}
                disabled={weekOffset === 0}
                className="inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700 disabled:text-slate-300"
                aria-label="Ver semana anterior"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="min-w-14 px-2 text-center text-xs font-semibold text-slate-400">
                {weekOffset + 1} / {MAX_WEEK_OFFSET + 1}
              </span>
              <button
                type="button"
                onClick={() => changeWeek(weekOffset + 1)}
                disabled={weekOffset === MAX_WEEK_OFFSET}
                className="inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700 disabled:text-slate-300"
                aria-label="Ver semana siguiente"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {week.days.map((date) => {
            const appointmentCount = weekAppointments.filter(
              (appointment) => appointment.scheduled_date === date,
            ).length;
            const isToday = date === today;
            const isSelected = date === selectedDate;

            return (
              <button
                key={date}
                type="button"
                onClick={() => selectDay(date)}
                aria-pressed={isSelected}
                aria-label={`Ver agenda del ${fullDate(date, locale)}: ${appointmentCount} ${appointmentCount === 1 ? "cita" : "citas"}`}
                className={`min-h-40 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md ${
                  isSelected
                    ? "border-emerald-600 bg-emerald-50 shadow-sm ring-2 ring-emerald-100"
                    : isToday
                      ? "border-emerald-200 bg-white"
                      : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="capitalize text-xs font-bold uppercase tracking-[0.05em] text-slate-500">
                      {dayLabel(date, locale)}
                    </div>
                    <div className="mt-1 text-lg font-bold capitalize text-[#003626]">
                      {dayNumber(date, locale)}
                    </div>
                  </div>
                  {isToday ? (
                    <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                      Hoy
                    </span>
                  ) : null}
                </div>
                <div className="mt-5">
                  <div className="text-3xl font-extrabold leading-none text-[#003626]">
                    {appointmentCount}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">
                    {appointmentCount === 1 ? "cita" : "citas"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="clinical-card overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f2f3ff] text-emerald-700">
              <CalendarDays className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-[#003626]">
                Todas las citas
              </h2>
              <p className="text-sm text-slate-500">
                Próximas citas e historial
              </p>
            </div>
          </div>
          <span className="text-sm font-semibold text-slate-500">
            {appointments.length} en total
          </span>
        </div>

        {orderedAppointments.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-[#f8faf9] text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">
                <tr>
                  <th className="px-6 py-3">Fecha</th>
                  <th className="px-4 py-3">Hora</th>
                  <th className="px-4 py-3">Duración</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Notas</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-6 py-3 text-right">Ficha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orderedAppointments.map((appointment) => {
                  const status =
                    statusMeta[appointmentStatus(appointment, today)];
                  return (
                    <tr key={appointment.id} className="hover:bg-[#f9fbf9]">
                      <td className="whitespace-nowrap px-6 py-4 font-medium capitalize text-slate-800">
                        {shortDate(appointment.scheduled_date, locale)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                        {timeLabel(appointment.scheduled_time)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                        {appointment.duration_minutes} min
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-950">
                        {appointment.clients?.name ?? "Cliente"}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {appointment.appointment_type}
                      </td>
                      <td className="max-w-64 truncate px-4 py-4 text-slate-500">
                        {appointment.notes || "—"}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}
                        >
                          {appointment.completed ? (
                            <CheckCircle2
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          ) : null}
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/clients/${appointment.client_id}?tab=citas`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700"
                          aria-label={`Ver citas de ${appointment.clients?.name ?? "cliente"}`}
                        >
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5 sm:p-6">
            <EmptyState
              title="Todavía no hay citas"
              description="Añade citas desde la ficha de un cliente para empezar a organizar la agenda."
            />
          </div>
        )}
      </section>
    </>
  );
}
