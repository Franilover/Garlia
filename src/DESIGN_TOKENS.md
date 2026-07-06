# Reglas de diseño — consistencia visual

Este documento existe porque una auditoría del código encontró: **302 usos**
de tamaños de texto arbitrarios (`text-[7px]` a `text-[13px]`), **19 valores
distintos** de opacidad para `primary` (3% a 80%, sin escala), y dos formas
de escribir el mismo fondo (`bg-white-custom` vs `bg-[var(--white-custom)]`).
Estas reglas existen para que eso no vuelva a pasar.

**Regla general: si estás escribiendo un valor entre corchetes (`[...]`),
pregúntate primero si ya existe un token para eso.** Los corchetes son la
señal de que probablemente estás inventando algo que ya existe.

---

## 1. Tamaños de texto

Usar SIEMPRE una de estas 5 clases. Nunca `text-[Npx]` ni las viejas
`text-3xs`/`text-2xs`/`text-lg`/`text-2xl`/`text-4xl` (eliminadas: competían
entre sí por el mismo uso con diferencias de 2-4px, imperceptibles).

| Clase        | Tamaño | Uso                                                        |
|---------------|--------|--------------------------------------------------------------|
| `text-micro`  | 9px    | TODA etiqueta chica: badges, timestamps, labels, contadores  |
| `text-sm`     | 14px   | Texto de cuerpo, secundario o normal                          |
| `text-base`   | 16px   | Texto de cuerpo destacado / subtítulos chicos                 |
| `text-xl`     | 20px   | Títulos de sección                                             |
| `text-3xl`    | 30px   | Headers grandes                                                |

`text-micro` está definido en `style/tailwind.css`. Si de verdad necesitas
algo fuera de esta tabla, se agrega ahí como token nuevo, no se escribe
inline.

## 2. Opacidad de color (`primary/N`, `accent/N`, etc.)

Escala cerrada — solo estos 5 valores, nada intermedio:

| Opacidad | Uso                                      |
|----------|-------------------------------------------|
| `/5`     | Fondo sutil (cards, filas alternas)       |
| `/10`    | Fondo hover / estado activo suave         |
| `/20`    | Bordes                                    |
| `/40`    | Texto secundario / deshabilitado          |
| `/70`    | Texto casi-full, íconos activos           |

Nunca `/3`, `/4`, `/6`, `/7`, `/8`, `/12`, `/15`, `/25`, `/30`, `/35`, `/45`,
`/50`, `/60`, `/65`, `/80`. Si el valor que tenías está cerca de uno de la
tabla, usa el de la tabla — la diferencia visual es imperceptible.

## 3. Fondos

Siempre la clase de Tailwind, nunca la variable CSS cruda:

- ✅ `bg-white-custom`
- ❌ `bg-[var(--white-custom)]`

Mismo criterio para cualquier otro color del tema (`bg-primary`, no
`bg-[var(--primary)]`).

## 4. Colores

- Cero valores hex sueltos en componentes (`#ef4444`, `#34d399`, etc.).
- Si es un color **semántico** (error, éxito, advertencia, info) → usar los
  tokens de callout ya existentes: `callout-danger-*`, `callout-success-*`,
  `callout-warning-*`, `callout-info-*`, `callout-note-*`, `callout-tip-*`.
- Si es un color de **dominio** (ej. la paleta de colores de ropa) → se
  define UNA sola vez en el hook/constante de ese dominio y se importa
  donde se necesite. Nunca copiado y pegado en dos archivos.

## 5. Radios (`border-radius`)

Siempre uno de los tres tokens del tema:

- `rounded-[var(--radius-btn)]` — botones, inputs, elementos chicos
- `rounded-[var(--radius-card)]` — cards, contenedores
- `rounded-full` — avatares, badges circulares, dots

Nunca `rounded-lg`, `rounded-2xl`, `rounded-[5px]`, etc. — esos valores no
respetan el tema (ej. en el tema "pixel" los radios son 0, en "sepia" son
más chicos; un `rounded-lg` hardcodeado ignora eso).

## 6. Multi-tema

Este proyecto tiene 4 temas (`default`, `pixel`, `slate`, `sepia`), cada uno
con sus propios valores de `--primary`, `--radius-btn`, `--shadow-card`,
etc. **Cualquier valor de color o radio que no pase por una variable del
tema rompe el theming** en al menos uno de los 4 temas. Por eso las reglas
1–5 no son solo estética: son lo que mantiene los 4 temas funcionando.

---

## Estado de la migración

- [x] Token `text-micro` (9px) agregado a `style/tailwind.css`, reemplaza los antiguos `text-3xs`/`text-2xs`
- [ ] Centralizar paleta de colores de ropa (duplicada en `ropa.tsx` y `PrendaForms.tsx`)
- [x] Barrido de `text-[Npx]` y consolidación completa a la escala de 5 tamaños (`micro`/`sm`/`base`/`xl`/`3xl`), en todo `ensayos/` incluyendo `ropa/`
- [ ] Barrido de opacidades a la escala de 5 valores, dominio por dominio
- [ ] Unificar `bg-[var(--white-custom)]` → `bg-white-custom`
- [ ] Eliminar radios outlier (`rounded-lg`, `rounded-2xl`, `rounded-[5px]`, `rounded-[3px]`)
