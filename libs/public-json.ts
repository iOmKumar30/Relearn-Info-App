const JSON_CONTENT_TYPE = /^application\/json(?:\s*;|$)/i;

export class PublicJsonRequestError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 413 | 415 = 400,
  ) {
    super(message);
  }
}

/** Reads a small JSON object without trusting Content-Length alone. */
export async function readPublicJsonObject(
  request: Request,
  maxBytes: number,
): Promise<Record<string, unknown>> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!JSON_CONTENT_TYPE.test(contentType)) {
    throw new PublicJsonRequestError('Unsupported request format.', 415);
  }

  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new PublicJsonRequestError('Request is too large.', 413);
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > maxBytes) {
    throw new PublicJsonRequestError('Request is too large.', 413);
  }

  try {
    const parsed: unknown = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new PublicJsonRequestError('Invalid payment request.');
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof PublicJsonRequestError) throw error;
    throw new PublicJsonRequestError('Invalid payment request.');
  }
}

export function boundedString(
  value: unknown,
  maxLength: number,
): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= maxLength ? trimmed : null;
}
