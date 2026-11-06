export const CLIENT_FILE_MAX_SIZE_BYTES = 8 * 1024 * 1024;
export const CLIENT_FILE_MAX_SIZE_LABEL = "8 MB";
export const CLIENT_FILE_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.txt";
export const CLIENT_FILE_FORMATS_LABEL =
  "PDF, JPG, JPEG, PNG, WEBP, DOC, DOCX o TXT";

const allowedMimeTypes: Record<string, ReadonlyArray<string>> = {
  pdf: ["application/pdf"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  webp: ["image/webp"],
  doc: ["application/msword"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  txt: ["text/plain"],
};

type FileDescriptor = {
  name: string;
  size: number;
  type: string;
};

export function clientFileValidationError(file: FileDescriptor) {
  if (file.size <= 0) return "Selecciona un archivo.";

  if (file.size > CLIENT_FILE_MAX_SIZE_BYTES) {
    return `El archivo supera el tamaño máximo permitido de ${CLIENT_FILE_MAX_SIZE_LABEL}.`;
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const acceptedTypes = allowedMimeTypes[extension];
  if (!acceptedTypes) {
    return `Formato no permitido. Usa ${CLIENT_FILE_FORMATS_LABEL}.`;
  }

  const mimeType = file.type.toLowerCase().split(";", 1)[0].trim();
  const isGenericType =
    mimeType === "" || mimeType === "application/octet-stream";
  if (!isGenericType && !acceptedTypes.includes(mimeType)) {
    return `El contenido del archivo no coincide con el formato .${extension}.`;
  }

  return null;
}
