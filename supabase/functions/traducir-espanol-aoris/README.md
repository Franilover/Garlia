# Motor Español → Aoris (backend)

## Qué contiene
- Edge Function `traducir-espanol-aoris`, con autenticación de sesión y autorización por `public.perfiles.rol` (`editor` o `admin`).
- Motor determinista sin IA externa: búsqueda por glosas existentes, normalización de acentos, formas verbales españolas frecuentes, orden SOV, partículas de negación/interrogación y sufijos que existen en las tablas lingüísticas.
- Respuesta compatible con la interfaz existente: `source_language`, `target_language`, `source_text`, `translated_text`, `recognized_tokens`, `total_content_tokens`, `unresolved_words`, `matches`, `language_state`, `warning`, `diagnostics`.
- Solo lectura: no inserta ni actualiza idiomas, lexemas, morfemas ni reglas.

## Canon y límites
Los registros lingüísticos de Aoris consultados actualmente están en `borrador`. El motor los utiliza de forma explícita experimental y devuelve una advertencia; no eleva estados ni inventa raíces. Los artículos españoles se omiten por ser determinantes que el perfil Aoris no marca; las palabras no reconocidas se devuelven entre corchetes y en `unresolved_words`.

La gramática implementada es un primer analizador determinista, no un parser lingüístico completo. El motor reordena cláusulas sencillas SVO→SOV y aplica solo operaciones respaldadas por reglas/morfemas presentes. Frases coordinadas complejas, subordinación, ambigüedad léxica, concordancia verbal y traducción semántica contextual siguen siendo limitaciones deliberadas, en lugar de producir palabras inventadas.

## Contrato de petición
```json
{ "text": "Yo no vuelo." }
```
Sesión requerida en el encabezado `Authorization: Bearer <access_token>`. Límite: 2000 caracteres.

## Desarrollo y pruebas
Con Supabase CLI instalado:
- `supabase functions serve traducir-espanol-aoris --env-file .env.local`
- `deno test supabase/functions/traducir-espanol-aoris/engine.test.ts`

Variables de servidor: `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` (o `SUPABASE_SECRET_KEY`). La clave privilegiada nunca se debe incluir en el frontend.
