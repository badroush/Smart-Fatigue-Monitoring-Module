/**
 * Enveloppe JSON alignée sur le contrat Symfony / frontend (ApiResponse).
 */
export function ok(data, message) {
  return {
    success: true,
    ...(message != null && { message }),
    ...(data !== undefined && { data }),
  };
}

export function fail(error, message, statusCode = 400) {
  const body = {
    success: false,
    ...(error != null && { error }),
    ...(message != null && { message }),
  };
  return { body, statusCode };
}
