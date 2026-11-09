"use client";

import { Check, MessageCircle, Share2 } from "lucide-react";
import { useState } from "react";

type BonusShareButtonProps = {
  path: string;
  bonusName: string;
  clientName: string;
};

export function BonusShareButton({
  path,
  bonusName,
  clientName,
}: BonusShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = new URL(path, window.location.origin).toString();

    if (navigator.share) {
      try {
        await navigator.share({
          title: bonusName,
          text: `Consulta el bono de ${clientName}`,
          url,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = url;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      textArea.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  function shareOnWhatsApp() {
    const url = new URL(path, window.location.origin).toString();
    const message = `Hola ${clientName}, puedes consultar tu ${bonusName} aquí:\n${url}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={shareOnWhatsApp}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#25d366] px-3 py-2 text-sm font-semibold text-[#063d25] transition hover:bg-[#20bd5a]"
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        WhatsApp
      </button>
      <button
        type="button"
        onClick={share}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#0b4f3a] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#003626]"
      >
        {copied ? (
          <Check className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Share2 className="h-4 w-4" aria-hidden="true" />
        )}
        {copied ? "Enlace copiado" : "Compartir enlace"}
      </button>
    </>
  );
}
