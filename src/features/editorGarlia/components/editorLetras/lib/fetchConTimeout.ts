/**
 * Helper para llamadas de red con timeout + reintento.
 *
 * Por qué existe: la primera consulta a Supabase de toda la sesión del
 * navegador (por ejemplo, al entrar directo a una canción navegando desde
 * otra página) puede tardar más de lo normal por el "cold start" de la
 * conexión (handshake TLS, restauración de la sesión de auth, balanceador
 * "despertando", etc.), incluso con buena conexión a internet. Antes, un
 * timeout corto y sin reintento confundía esa demora puntual con "estamos
 * offline" y mostraba el banner de sin conexión de forma incorrecta.
 *
 * Esta función intenta la llamada con una serie de timeouts antes de darse
 * por vencida. Solo después de agotar todos los intentos se considera un
 * fallo real de conexión.
 */
export function conTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout (${ms}ms)`)), ms);
    promise.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

export async function fetchConReintento<T>(
  fn: () => Promise<T>,
  intentosMs: number[] = [10000, 8000],
): Promise<T> {
  let lastErr: unknown;
  for (const ms of intentosMs) {
    try {
      return await conTimeout(fn(), ms);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}
