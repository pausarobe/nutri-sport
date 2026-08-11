import type { ClientSex, Json } from "@/lib/database.types";

export type MeasurementField = {
  key: string;
  label: string;
  unit: "mm" | "cm";
  color: string;
};

export type MeasurementMap = Record<string, number>;

export const SKINFOLD_FIELDS: MeasurementField[] = [
  { key: "triceps", label: "Triceps", unit: "mm", color: "#2563eb" },
  { key: "subescapular", label: "Subescapular", unit: "mm", color: "#2563eb" },
  { key: "biceps", label: "Biceps", unit: "mm", color: "#2563eb" },
  { key: "cresta_iliaca", label: "Cresta iliaca", unit: "mm", color: "#2563eb" },
  { key: "supraespinal", label: "Supraespinal", unit: "mm", color: "#2563eb" },
  { key: "abdominal", label: "Abdominal", unit: "mm", color: "#2563eb" },
  { key: "cuixa", label: "Muslo", unit: "mm", color: "#2563eb" },
  { key: "cama_medial", label: "Pierna medial", unit: "mm", color: "#2563eb" },
];

export const GIRTH_FIELDS: MeasurementField[] = [
  { key: "brac_relaxat", label: "Brazo relajado", unit: "cm", color: "#c45a00" },
  { key: "brac_contraigut", label: "Brazo contraido", unit: "cm", color: "#c45a00" },
  { key: "cintura", label: "Cintura", unit: "cm", color: "#c45a00" },
  { key: "maluc", label: "Cadera", unit: "cm", color: "#c45a00" },
  { key: "cuixa", label: "Muslo", unit: "cm", color: "#c45a00" },
  { key: "cama", label: "Pierna", unit: "cm", color: "#c45a00" },
];

export const DIAMETER_FIELDS: MeasurementField[] = [
  { key: "humer", label: "D. Humero", unit: "cm", color: "#2d7a3a" },
  { key: "femur", label: "D. Femur", unit: "cm", color: "#2d7a3a" },
  { key: "biestiloideo", label: "D. Biestiloideo", unit: "cm", color: "#2d7a3a" },
];

type CalculateAnthropometryInput = {
  weightKg: number | null | undefined;
  heightCm: number | null | undefined;
  sex: ClientSex | null | undefined;
  age: number | null | undefined;
  skinfolds: MeasurementMap;
  girths: MeasurementMap;
  diameters: MeasurementMap;
};

export type AnthropometryResult = {
  imc: string;
  imcCat: string;
  sum6: string;
  sum8: string;
  endo: string;
  meso: string;
  ecto: string;
  somatX: string;
  somatY: string;
  pctGrass: string;
  pGras: string;
  pctMusc: string;
  pMusc: string;
  pctOssi: string;
  pOssi: string;
  pctResid: string;
  pResid: string;
  ratioCM: string;
  brCorGen: string;
  camaCorGen: string;
  zScores: Record<string, number>;
};

export function measurementMapFromJson(
  value: Json | null | undefined,
  fields: MeasurementField[],
) {
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};

  return Object.fromEntries(
    fields.map((field) => {
      const raw = source[field.key];
      const number = typeof raw === "number" ? raw : Number(raw ?? 0);
      return [field.key, Number.isFinite(number) ? number : 0];
    }),
  ) as MeasurementMap;
}

export function hasAllMeasurements(map: MeasurementMap, fields: MeasurementField[]) {
  return fields.every((field) => Number(map[field.key]) > 0);
}

export function formatAnthroNumber(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateMedian(values: Array<number | null>) {
  const valid = values
    .filter((value): value is number => typeof value === "number" && value > 0)
    .sort((a, b) => a - b);

  if (valid.length >= 3) return valid[1];
  if (valid.length === 2) return 2 / (1 / valid[0] + 1 / valid[1]);
  if (valid.length === 1) return valid[0];
  return 0;
}

export function calculateAnthropometry({
  weightKg,
  heightCm,
  sex,
  age,
  skinfolds,
  girths,
  diameters,
}: CalculateAnthropometryInput): AnthropometryResult | null {
  const pes = Number(weightKg);
  const h = Number(heightCm);

  if (
    !Number.isFinite(pes) ||
    !Number.isFinite(h) ||
    pes <= 0 ||
    h <= 0 ||
    !hasAllMeasurements(skinfolds, SKINFOLD_FIELDS) ||
    !hasAllMeasurements(girths, GIRTH_FIELDS) ||
    !hasAllMeasurements(diameters, DIAMETER_FIELDS)
  ) {
    return null;
  }

  const pl = skinfolds;
  const per = girths;
  const dia = diameters;
  const hm = h / 100;
  const formulaSex = sex === "female" ? "Dona" : "Home";
  const formulaAge = age && age > 0 ? age : 25;
  const sum6 =
    pl.triceps +
    pl.subescapular +
    pl.supraespinal +
    pl.abdominal +
    pl.cuixa +
    pl.cama_medial;
  const sum8 = sum6 + pl.biceps + pl.cresta_iliaca;
  const S = (pl.triceps + pl.subescapular + pl.supraespinal) * (170.18 / h);
  const endo = Math.max(0.1, -0.7182 + 0.1451 * S - 68e-5 * S * S + 14e-7 * S * S * S);
  const brCS = per.brac_contraigut - pl.triceps / 10;
  const caCS = per.cama - pl.cama_medial / 10;
  const meso = Math.max(
    0.1,
    0.858 * dia.humer +
      0.601 * dia.femur +
      0.188 * brCS +
      0.161 * caCS -
      0.131 * h +
      4.5,
  );
  const HWR = h / Math.pow(pes, 0.3333);
  const ecto = Math.max(
    0.1,
    HWR >= 40.75 ? 0.732 * HWR - 28.58 : HWR >= 38.28 ? 0.463 * HWR - 17.63 : 0.1,
  );
  const sX = ecto - endo;
  const sY = 2 * meso - (endo + ecto);
  const bG = per.brac_relaxat - (Math.PI * pl.triceps) / 10;
  const cG = per.cama - (Math.PI * pl.cama_medial) / 10;
  const qG = per.cuixa - (Math.PI * pl.cuixa) / 10;
  const pctGrass = formulaSex === "Dona" ? 0.1548 * sum6 + 3.58 : 0.1051 * sum6 + 2.58;
  const pGras = (pctGrass / 100) * pes;
  const pMusc =
    hm * (744e-5 * bG * bG + 88e-5 * qG * qG + 441e-5 * cG * cG) +
    2.4 * (formulaSex === "Dona" ? 0 : 1) -
    0.048 * formulaAge +
    7.8;
  const pOssi = 3.02 * Math.pow(hm * hm * (dia.biestiloideo / 100) * (dia.femur / 100) * 400, 0.712);
  const pResid = pes - pGras - Math.max(0, pMusc) - pOssi;
  const imc = pes / (hm * hm);
  const phantom = {
    pes: [64.58, 8.6, 3],
    triceps: [15.4, 4.47, 1],
    subescapular: [17.2, 5.07, 1],
    biceps: [8, 2, 1],
    cresta_iliaca: [22.4, 6.8, 1],
    supraespinal: [15.4, 4.47, 1],
    abdominal: [25.4, 7.78, 1],
    cuixa: [27, 8.33, 1],
    cama_medial: [16, 4.67, 1],
    brac_relaxat: [26.89, 2.33, 1],
    brac_contraigut: [29.41, 2.37, 1],
    cintura: [71.91, 4.45, 1],
    maluc: [95.67, 5.58, 1],
    cama: [35.25, 2.3, 1],
    humer: [6.48, 0.35, 1],
    femur: [9.52, 0.48, 1],
    biestiloideo: [5.21, 0.28, 1],
    brac_corr: [20.05, 3.67, 1],
    cama_corr: [30.22, 1.97, 1],
    pGras: [12.13, 3.25, 3],
    pMusc: [25.55, 2.99, 3],
    pOssi: [10.49, 1.57, 3],
    pResid: [16.41, 1.9, 3],
  } satisfies Record<string, [number, number, number]>;
  const zv = (value: number, key: keyof typeof phantom) => {
    const [mean, sd, exp] = phantom[key];
    return +(((value * (170.18 / h) ** exp - mean) / sd).toFixed(2));
  };
  const zScores = {
    pes: zv(pes, "pes"),
    triceps: zv(pl.triceps, "triceps"),
    subescapular: zv(pl.subescapular, "subescapular"),
    biceps: zv(pl.biceps, "biceps"),
    cresta_iliaca: zv(pl.cresta_iliaca, "cresta_iliaca"),
    supraespinal: zv(pl.supraespinal, "supraespinal"),
    abdominal: zv(pl.abdominal, "abdominal"),
    cuixa: zv(pl.cuixa, "cuixa"),
    cama_medial: zv(pl.cama_medial, "cama_medial"),
    brac_relaxat: zv(per.brac_relaxat, "brac_relaxat"),
    brac_contraigut: zv(per.brac_contraigut, "brac_contraigut"),
    cintura: zv(per.cintura, "cintura"),
    maluc: zv(per.maluc, "maluc"),
    cama: zv(per.cama, "cama"),
    humer: zv(dia.humer, "humer"),
    femur: zv(dia.femur, "femur"),
    biestiloideo: zv(dia.biestiloideo, "biestiloideo"),
    brac_corr: zv(bG, "brac_corr"),
    cama_corr: zv(cG, "cama_corr"),
    pGras: zv(pGras, "pGras"),
    pMusc: zv(Math.max(0, pMusc), "pMusc"),
    pOssi: zv(pOssi, "pOssi"),
    pResid: zv(Math.max(0, pResid), "pResid"),
  };

  return {
    imc: imc.toFixed(1),
    imcCat:
      imc < 18.5 ? "Bajo peso" : imc < 25 ? "Normopeso" : imc < 30 ? "Sobrepeso" : "Obesidad",
    sum6: sum6.toFixed(1),
    sum8: sum8.toFixed(1),
    endo: endo.toFixed(2),
    meso: meso.toFixed(2),
    ecto: ecto.toFixed(2),
    somatX: sX.toFixed(2),
    somatY: sY.toFixed(2),
    pctGrass: pctGrass.toFixed(2),
    pGras: pGras.toFixed(2),
    pctMusc: Math.max(0, (pMusc / pes) * 100).toFixed(2),
    pMusc: Math.max(0, pMusc).toFixed(2),
    pctOssi: ((pOssi / pes) * 100).toFixed(2),
    pOssi: pOssi.toFixed(2),
    pctResid: Math.max(0, (pResid / pes) * 100).toFixed(2),
    pResid: Math.max(0, pResid).toFixed(2),
    ratioCM: per.maluc > 0 ? (per.cintura / per.maluc).toFixed(3) : "0",
    brCorGen: bG.toFixed(2),
    camaCorGen: cG.toFixed(2),
    zScores,
  };
}
