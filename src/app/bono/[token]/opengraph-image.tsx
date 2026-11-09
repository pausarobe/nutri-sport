import { ImageResponse } from "next/og";
import {
  getPublicBonus,
  publicBonusStatusLabel,
} from "@/lib/public-bonus";

export const alt = "Estado del bono de sesiones";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 0;

type OpenGraphImageProps = {
  params: Promise<{ token: string }>;
};

export default async function OpenGraphImage({ params }: OpenGraphImageProps) {
  const { token } = await params;
  const bonus = await getPublicBonus(token);

  if (!bonus) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#f5f8f6",
            color: "#003626",
            fontFamily: "sans-serif",
          }}
        >
          <div style={{ display: "flex", fontSize: 52, fontWeight: 800 }}>
            NutriSport Pro
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 20,
              fontSize: 28,
              color: "#64748b",
            }}
          >
            Bono no disponible
          </div>
        </div>
      ),
      size,
    );
  }

  const progress = Math.min(
    100,
    Math.round((bonus.usedSessions / bonus.totalSessions) * 100),
  );
  const statusColors = {
    active: { background: "#d1fae5", color: "#065f46" },
    completed: { background: "#dbeafe", color: "#1e40af" },
    expired: { background: "#fef3c7", color: "#92400e" },
    inactive: { background: "#e2e8f0", color: "#475569" },
    scheduled: { background: "#ede9fe", color: "#5b21b6" },
  }[bonus.status];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f8f6",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            width: 1100,
            height: 530,
            display: "flex",
            flexDirection: "column",
            padding: "48px 54px",
            borderRadius: 40,
            background: "#064e3b",
            color: "white",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  width: 58,
                  height: 58,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 18,
                  background: "#6ffbbe",
                  color: "#003626",
                  fontSize: 30,
                  fontWeight: 900,
                }}
              >
                N
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  marginLeft: 18,
                }}
              >
                <div style={{ display: "flex", fontSize: 27, fontWeight: 800 }}>
                  {bonus.clinicName}
                </div>
                <div
                  style={{
                    display: "flex",
                    marginTop: 3,
                    fontSize: 17,
                    color: "#a7f3d0",
                  }}
                >
                  {bonus.professionalName}
                </div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                padding: "10px 18px",
                borderRadius: 999,
                background: statusColors.background,
                color: statusColors.color,
                fontSize: 17,
                fontWeight: 800,
              }}
            >
              {publicBonusStatusLabel(bonus.status)}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              marginTop: 50,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", maxWidth: 650 }}>
              <div
                style={{
                  display: "flex",
                  fontSize: 22,
                  color: "#a7f3d0",
                  fontWeight: 700,
                }}
              >
                TU BONO
              </div>
              <div
                style={{
                  display: "flex",
                  marginTop: 8,
                  fontSize: 50,
                  lineHeight: 1.05,
                  fontWeight: 900,
                  letterSpacing: "-2px",
                }}
              >
                {bonus.name}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 20,
                  color: "#a7f3d0",
                  fontWeight: 700,
                }}
              >
                SESIONES RESTANTES
              </div>
              <div
                style={{
                  display: "flex",
                  marginTop: 2,
                  fontSize: 86,
                  lineHeight: 1,
                  fontWeight: 900,
                }}
              >
                {bonus.remainingSessions}
              </div>
            </div>
          </div>

          <div
            style={{
              height: 16,
              display: "flex",
              marginTop: 42,
              overflow: "hidden",
              borderRadius: 999,
              background: "rgba(255,255,255,0.16)",
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                display: "flex",
                borderRadius: 999,
                background: "#6ffbbe",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 15,
              fontSize: 19,
              color: "#d1fae5",
            }}
          >
            <div style={{ display: "flex" }}>
              {bonus.usedSessions} de {bonus.totalSessions} consumidas
            </div>
            <div style={{ display: "flex", fontWeight: 800 }}>{progress}% completado</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
