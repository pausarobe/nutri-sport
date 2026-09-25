import type { AnthropometryRace, ClientSex, Json } from "@/lib/database.types";

export type MeasurementField = {
  key: string;
  label: string;
  unit: "mm" | "cm";
  color: string;
};

export type MeasurementMap = Record<string, number>;
export type BodyFatFormula = "yuhasz" | "withers" | "durnin";

export const BODY_FAT_FORMULAS: ReadonlyArray<{
  key: BodyFatFormula;
  label: string;
}> = [
  { key: "yuhasz", label: "Yuhasz (1974)" },
  { key: "withers", label: "Withers et al. (1987)" },
  { key: "durnin", label: "Durnin-Womersley (1974)" },
];

export const RACE_LABELS: Record<AnthropometryRace, string> = {
  caucasian: "Caucásica/latina",
  black: "Negra",
  asian: "Asiática/india",
};

export const SKINFOLD_FIELDS: MeasurementField[] = [
  { key: "triceps", label: "Tríceps", unit: "mm", color: "#2563eb" },
  { key: "subescapular", label: "Subescapular", unit: "mm", color: "#2563eb" },
  { key: "biceps", label: "Bíceps", unit: "mm", color: "#2563eb" },
  { key: "cresta_iliaca", label: "Cresta ilíaca", unit: "mm", color: "#2563eb" },
  { key: "supraespinal", label: "Supraespinal", unit: "mm", color: "#2563eb" },
  { key: "abdominal", label: "Abdominal", unit: "mm", color: "#2563eb" },
  { key: "cuixa", label: "Muslo", unit: "mm", color: "#2563eb" },
  { key: "cama_medial", label: "Pierna medial", unit: "mm", color: "#2563eb" },
];

export const GIRTH_FIELDS: MeasurementField[] = [
  { key: "brac_relaxat", label: "Brazo relajado", unit: "cm", color: "#c45a00" },
  { key: "brac_contraigut", label: "Brazo contraído", unit: "cm", color: "#c45a00" },
  { key: "cintura", label: "Cintura", unit: "cm", color: "#c45a00" },
  { key: "maluc", label: "Cadera", unit: "cm", color: "#c45a00" },
  { key: "cuixa", label: "Muslo", unit: "cm", color: "#c45a00" },
  { key: "cama", label: "Pierna", unit: "cm", color: "#c45a00" },
];

export const DIAMETER_FIELDS: MeasurementField[] = [
  { key: "humer", label: "D. húmero", unit: "cm", color: "#2d7a3a" },
  { key: "femur", label: "D. fémur", unit: "cm", color: "#2d7a3a" },
  { key: "biestiloideo", label: "D. biestiloideo", unit: "cm", color: "#2d7a3a" },
];

type CalculateAnthropometryInput = {
  weightKg: number | null | undefined;
  heightCm: number | null | undefined;
  sittingHeightCm?: number | null | undefined;
  armSpanCm?: number | null | undefined;
  sex: ClientSex | null | undefined;
  age: number | null | undefined;
  race?: AnthropometryRace | null | undefined;
  formula?: BodyFatFormula;
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
  whrCat: string;
  conicity: string;
  conicityCat: string;
  waistHeightRatio: string;
  whtrCat: string;
  brCorGen: string;
  camaCorGen: string;
  formula: BodyFatFormula;
  formulaLabel: string;
  raceLabel: string;
  conversionLabel: string;
  withersValid: boolean;
  adiposeMuscleIdx: string;
  muscleBoneIdx: string;
  cormic: string | null;
  cormicCat: string;
  manouvrier: string | null;
  manouvrierCat: string;
  relArmSpan: string | null;
  relArmSpanCat: string;
  trunkPct: string;
  limbPct: string;
  fatDistIndex: string;
  zScores: Record<string, number>;
};

export function measurementMapFromJson(
  value: Json | null | undefined,
  fields: MeasurementField[],
) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};

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

export function isRestrictedProfile({
  heightCm,
  weightKg,
  skinfolds,
  girths,
  diameters,
}: {
  heightCm: number | null | undefined;
  weightKg: number | null | undefined;
  skinfolds: MeasurementMap;
  girths: MeasurementMap;
  diameters: MeasurementMap;
}) {
  const requiredGirths = ["brac_relaxat", "brac_contraigut", "cintura", "maluc", "cama"];
  const requiredDiameters = ["humer", "femur"];
  return (
    Number(heightCm) > 0 &&
    Number(weightKg) > 0 &&
    hasAllMeasurements(skinfolds, SKINFOLD_FIELDS) &&
    requiredGirths.every((key) => Number(girths[key]) > 0) &&
    requiredDiameters.every((key) => Number(diameters[key]) > 0)
  );
}

export function measurementSum(map: MeasurementMap, keys: string[]) {
  return keys.reduce((total, key) => total + Math.max(0, Number(map[key]) || 0), 0);
}

export function skinfoldSums(skinfolds: MeasurementMap) {
  const sum6 = measurementSum(skinfolds, [
    "triceps",
    "subescapular",
    "supraespinal",
    "abdominal",
    "cuixa",
    "cama_medial",
  ]);
  return { sum6, sum8: sum6 + (skinfolds.biceps || 0) + (skinfolds.cresta_iliaca || 0) };
}

export function formatAnthroNumber(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateMedian(values: Array<number | null>) {
  const valid = values
    .filter((value): value is number => typeof value === "number" && value > 0)
    .sort((a, b) => a - b);

  if (valid.length >= 3) return valid[1];
  if (valid.length === 2) return (valid[0] + valid[1]) / 2;
  if (valid.length === 1) return valid[0];
  return 0;
}

export function normalizeAnthropometryRace(value: unknown): AnthropometryRace {
  if (value === "black" || value === "negra") return "black";
  if (value === "asian" || value === "asiatica") return "asian";
  return "caucasian";
}

function densityConversion(sex: ClientSex | null | undefined, race: AnthropometryRace) {
  const female = sex === "female";
  if (race === "black") {
    return female
      ? { a: 485, b: 439, label: "Ortiz et al. (1992), mujeres afrodescendientes" }
      : { a: 437, b: 393, label: "Schutte et al. (1984), hombres afrodescendientes" };
  }
  if (race === "asian") {
    return female
      ? { a: 503, b: 462, label: "Heyward y Stolarczyk (1996), mujeres asiáticas" }
      : { a: 497, b: 452, label: "Heyward y Stolarczyk (1996), hombres asiáticos" };
  }
  return { a: 495, b: 450, label: "Siri (1961)" };
}

function durninCoefficient(sex: ClientSex | null | undefined, age: number) {
  const male = [
    [19, 1.162, 0.063],
    [29, 1.1631, 0.0632],
    [39, 1.1422, 0.0544],
    [49, 1.162, 0.07],
    [999, 1.1715, 0.0779],
  ];
  const female = [
    [19, 1.1549, 0.0678],
    [29, 1.1599, 0.0717],
    [39, 1.1423, 0.0632],
    [49, 1.1333, 0.0612],
    [999, 1.1339, 0.0645],
  ];
  const row = (sex === "female" ? female : male).find(([limit]) => age <= limit) ?? male[4];
  return { c: row[1], m: row[2] };
}

function bodyFatPercent({
  skinfolds,
  sex,
  age,
  sum6,
  formula,
  race,
}: {
  skinfolds: MeasurementMap;
  sex: ClientSex | null | undefined;
  age: number;
  sum6: number;
  formula: BodyFatFormula;
  race: AnthropometryRace;
}) {
  const conversion = densityConversion(sex, race);
  if (formula === "durnin") {
    const sum4 =
      skinfolds.biceps +
      skinfolds.triceps +
      skinfolds.subescapular +
      skinfolds.cresta_iliaca;
    if (sum4 <= 0) return 0;
    const { c, m } = durninCoefficient(sex, age);
    const density = c - m * Math.log10(sum4);
    return conversion.a / density - conversion.b;
  }
  if (formula === "withers") {
    const density =
      sex === "female"
        ? 1.17484 -
          0.07229 *
            Math.log10(
              skinfolds.triceps +
                skinfolds.subescapular +
                skinfolds.supraespinal +
                skinfolds.cama_medial,
            )
        : 1.0988 -
          4e-4 *
            (skinfolds.triceps +
              skinfolds.cresta_iliaca +
              skinfolds.subescapular +
              skinfolds.supraespinal +
              skinfolds.abdominal +
              skinfolds.cuixa +
              skinfolds.cama_medial);
    return conversion.a / density - conversion.b;
  }
  return sex === "female" ? 0.1548 * sum6 + 3.58 : 0.1051 * sum6 + 2.58;
}

export function calculateAnthropometry({
  weightKg,
  heightCm,
  sittingHeightCm,
  armSpanCm,
  sex,
  age,
  race: requestedRace,
  formula = "yuhasz",
  skinfolds,
  girths,
  diameters,
}: CalculateAnthropometryInput): AnthropometryResult | null {
  const weight = Number(weightKg);
  const height = Number(heightCm);

  if (
    !Number.isFinite(weight) ||
    !Number.isFinite(height) ||
    weight <= 0 ||
    height <= 0 ||
    !hasAllMeasurements(skinfolds, SKINFOLD_FIELDS) ||
    !hasAllMeasurements(girths, GIRTH_FIELDS) ||
    !hasAllMeasurements(diameters, DIAMETER_FIELDS)
  ) {
    return null;
  }

  const race = normalizeAnthropometryRace(requestedRace);
  const pl = skinfolds;
  const per = girths;
  const dia = diameters;
  const heightM = height / 100;
  const formulaAge = age && age > 0 ? age : 25;
  const { sum6, sum8 } = skinfoldSums(pl);
  const correctedSkinfoldSum =
    (pl.triceps + pl.subescapular + pl.supraespinal) * (170.18 / height);
  const endo = Math.max(
    0.1,
    -0.7182 +
      0.1451 * correctedSkinfoldSum -
      68e-5 * correctedSkinfoldSum ** 2 +
      14e-7 * correctedSkinfoldSum ** 3,
  );
  const contractedArm = per.brac_contraigut - pl.triceps / 10;
  const correctedCalfForSomatotype = per.cama - pl.cama_medial / 10;
  const meso = Math.max(
    0.1,
    0.858 * dia.humer +
      0.601 * dia.femur +
      0.188 * contractedArm +
      0.161 * correctedCalfForSomatotype -
      0.131 * height +
      4.5,
  );
  const heightWeightRatio = height / Math.pow(weight, 0.3333);
  const ecto = Math.max(
    0.1,
    heightWeightRatio >= 40.75
      ? 0.732 * heightWeightRatio - 28.58
      : heightWeightRatio >= 38.28
        ? 0.463 * heightWeightRatio - 17.63
        : 0.1,
  );
  const somatX = ecto - endo;
  const somatY = 2 * meso - (endo + ecto);
  const correctedArm = per.brac_relaxat - (Math.PI * pl.triceps) / 10;
  const correctedCalf = per.cama - (Math.PI * pl.cama_medial) / 10;
  const correctedThigh = per.cuixa - (Math.PI * pl.cuixa) / 10;
  const pctGrass = Math.max(
    2,
    bodyFatPercent({ skinfolds: pl, sex, age: formulaAge, sum6, formula, race }),
  );
  const fatKg = (pctGrass / 100) * weight;
  const raceAdjustment = race === "asian" ? -2 : race === "black" ? 1.1 : 0;
  const muscleKg =
    heightM *
      (744e-5 * correctedArm ** 2 +
        88e-5 * correctedThigh ** 2 +
        441e-5 * correctedCalf ** 2) +
    2.4 * (sex === "female" ? 0 : 1) -
    0.048 * formulaAge +
    raceAdjustment +
    7.8;
  const boneKg =
    3.02 *
    Math.pow(
      heightM ** 2 * (dia.biestiloideo / 100) * (dia.femur / 100) * 400,
      0.712,
    );
  const residualKg = weight - fatKg - Math.max(0, muscleKg) - boneKg;
  const bmi = weight / heightM ** 2;
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
    maluc: [94.67, 5.58, 1],
    cama: [35.25, 2.3, 1],
    cuixa_per: [55.82, 4.23, 1],
    humer: [6.48, 0.35, 1],
    femur: [9.52, 0.48, 1],
    biestiloideo: [5.21, 0.28, 1],
    brac_corr: [22.05, 1.91, 1],
    cama_corr: [30.22, 1.97, 1],
    pGras: [12.13, 3.25, 3],
    pMusc: [25.55, 2.99, 3],
    pOssi: [10.49, 1.57, 3],
    pResid: [16.41, 1.9, 3],
  } satisfies Record<string, [number, number, number]>;
  const zValue = (value: number, key: keyof typeof phantom) => {
    const [mean, sd, exponent] = phantom[key];
    return +(((value * (170.18 / height) ** exponent - mean) / sd).toFixed(2));
  };
  const zScores = {
    pes: zValue(weight, "pes"),
    triceps: zValue(pl.triceps, "triceps"),
    subescapular: zValue(pl.subescapular, "subescapular"),
    biceps: zValue(pl.biceps, "biceps"),
    cresta_iliaca: zValue(pl.cresta_iliaca, "cresta_iliaca"),
    supraespinal: zValue(pl.supraespinal, "supraespinal"),
    abdominal: zValue(pl.abdominal, "abdominal"),
    cuixa: zValue(pl.cuixa, "cuixa"),
    cama_medial: zValue(pl.cama_medial, "cama_medial"),
    brac_relaxat: zValue(per.brac_relaxat, "brac_relaxat"),
    brac_contraigut: zValue(per.brac_contraigut, "brac_contraigut"),
    cintura: zValue(per.cintura, "cintura"),
    maluc: zValue(per.maluc, "maluc"),
    cama: zValue(per.cama, "cama"),
    cuixa_per: zValue(per.cuixa, "cuixa_per"),
    humer: zValue(dia.humer, "humer"),
    femur: zValue(dia.femur, "femur"),
    biestiloideo: zValue(dia.biestiloideo, "biestiloideo"),
    brac_corr: zValue(correctedArm, "brac_corr"),
    cama_corr: zValue(correctedCalf, "cama_corr"),
    pGras: zValue(fatKg, "pGras"),
    pMusc: zValue(Math.max(0, muscleKg), "pMusc"),
    pOssi: zValue(boneKg, "pOssi"),
    pResid: zValue(Math.max(0, residualKg), "pResid"),
  };
  const ratio = per.maluc > 0 ? per.cintura / per.maluc : 0;
  const whrCat =
    sex === "female"
      ? ratio < 0.8
        ? "Riesgo bajo"
        : ratio < 0.85
          ? "Riesgo moderado"
          : "Riesgo alto"
      : ratio < 0.9
        ? "Riesgo bajo"
        : ratio < 1
          ? "Riesgo moderado"
          : "Riesgo alto";
  const conicity = per.cintura > 0 ? per.cintura / 100 / (0.109 * Math.sqrt(weight / heightM)) : 0;
  const waistHeightRatio = per.cintura > 0 ? per.cintura / height : 0;
  const cormic = sittingHeightCm && sittingHeightCm > 0 ? sittingHeightCm / height : null;
  const manouvrier =
    sittingHeightCm && sittingHeightCm > 0
      ? ((height - sittingHeightCm) / sittingHeightCm) * 100
      : null;
  const relArmSpan = armSpanCm && armSpanCm > 0 ? armSpanCm / height : null;
  const trunkSum = pl.subescapular + pl.cresta_iliaca + pl.supraespinal + pl.abdominal;
  const limbSum = pl.triceps + pl.biceps + pl.cuixa + pl.cama_medial;
  const distributionTotal = trunkSum + limbSum || 1;
  const formulaLabel =
    BODY_FAT_FORMULAS.find((candidate) => candidate.key === formula)?.label ??
    BODY_FAT_FORMULAS[0].label;
  const conversion = densityConversion(sex, race);

  return {
    imc: bmi.toFixed(1),
    imcCat: bmi < 18.5 ? "Bajo peso" : bmi < 25 ? "Normopeso" : bmi < 30 ? "Sobrepeso" : "Obesidad",
    sum6: sum6.toFixed(1),
    sum8: sum8.toFixed(1),
    endo: endo.toFixed(2),
    meso: meso.toFixed(2),
    ecto: ecto.toFixed(2),
    somatX: somatX.toFixed(2),
    somatY: somatY.toFixed(2),
    pctGrass: pctGrass.toFixed(2),
    pGras: fatKg.toFixed(2),
    pctMusc: Math.max(0, (muscleKg / weight) * 100).toFixed(2),
    pMusc: Math.max(0, muscleKg).toFixed(2),
    pctOssi: ((boneKg / weight) * 100).toFixed(2),
    pOssi: boneKg.toFixed(2),
    pctResid: Math.max(0, (residualKg / weight) * 100).toFixed(2),
    pResid: Math.max(0, residualKg).toFixed(2),
    ratioCM: ratio.toFixed(3),
    whrCat,
    conicity: conicity.toFixed(2),
    conicityCat: conicity < 1.25 ? "Riesgo cardiovascular bajo" : conicity < 1.4 ? "Riesgo cardiovascular moderado" : "Riesgo cardiovascular alto",
    waistHeightRatio: waistHeightRatio.toFixed(2),
    whtrCat: waistHeightRatio < 0.5 ? "Riesgo bajo" : waistHeightRatio < 0.6 ? "Riesgo moderado" : "Riesgo alto",
    brCorGen: correctedArm.toFixed(2),
    camaCorGen: correctedCalf.toFixed(2),
    formula,
    formulaLabel,
    raceLabel: RACE_LABELS[race],
    conversionLabel:
      formula === "yuhasz"
        ? "Yuhasz calcula el porcentaje directamente; validada en población caucásica."
        : `Conversión densidad a grasa: ${conversion.label}.`,
    withersValid:
      formula !== "withers" ||
      (sex === "female"
        ? formulaAge >= 11 && formulaAge <= 41
        : formulaAge >= 15 && formulaAge <= 39),
    adiposeMuscleIdx: (fatKg / Math.max(0.001, muscleKg)).toFixed(2),
    muscleBoneIdx: (Math.max(0, muscleKg) / Math.max(0.001, boneKg)).toFixed(2),
    cormic: cormic === null ? null : cormic.toFixed(2),
    cormicCat:
      cormic === null
        ? ""
        : cormic < 0.51
          ? "Microcórmico (piernas largas)"
          : cormic <= 0.53
            ? "Mesocórmico"
            : "Macrocórmico (tronco largo)",
    manouvrier: manouvrier === null ? null : manouvrier.toFixed(0),
    manouvrierCat:
      manouvrier === null
        ? ""
        : manouvrier < 85
          ? "Piernas cortas (braquisquélico)"
          : manouvrier <= 90
            ? "Proporción media (mesatisquélico)"
            : "Piernas largas (macrosquélico)",
    relArmSpan: relArmSpan === null ? null : relArmSpan.toFixed(2),
    relArmSpanCat:
      relArmSpan === null
        ? ""
        : relArmSpan > 1.01
          ? "Envergadura mayor que la altura"
          : relArmSpan < 0.99
            ? "Envergadura menor que la altura"
            : "Envergadura similar a la altura",
    trunkPct: ((trunkSum / distributionTotal) * 100).toFixed(1),
    limbPct: ((limbSum / distributionTotal) * 100).toFixed(1),
    fatDistIndex: (limbSum / Math.max(0.001, trunkSum)).toFixed(2),
    zScores,
  };
}
