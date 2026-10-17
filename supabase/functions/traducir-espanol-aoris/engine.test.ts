function assertEquals(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
import { translateText, type Lexeme, type Morpheme, type MorphRule, type GrammarProfile } from "./engine.ts";

const lexemes: Lexeme[] = [
  { id: "nax", lema: "nax", categoria_gramatical: "pronombre", definicion_breve: "yo, primera persona singular", estado: "borrador" },
  { id: "dak", lema: "dak", categoria_gramatical: "pronombre", definicion_breve: "tú, segunda persona singular", estado: "borrador" },
  { id: "zor", lema: "zor", categoria_gramatical: "pronombre", definicion_breve: "él/ella, tercera persona singular", estado: "borrador" },
  { id: "kran", lema: "kran", categoria_gramatical: "verbo", definicion_breve: "volar, desplazarse por el aire", estado: "borrador" },
  { id: "grek", lema: "grek", categoria_gramatical: "adjetivo", definicion_breve: "grande, dominante", estado: "borrador" },
  { id: "tsan", lema: "tsan", categoria_gramatical: "verbo", definicion_breve: "ver, percibir con la vista", estado: "borrador" },
  { id: "zkor", lema: "zkor", categoria_gramatical: "sustantivo", definicion_breve: "cielo, espacio aéreo superior", estado: "borrador" },
  { id: "ngor", lema: "ngor", categoria_gramatical: "sustantivo", definicion_breve: "clan, linaje, grupo de pertenencia", estado: "borrador" },
  { id: "ska", lema: "ska", categoria_gramatical: "particula", definicion_breve: "negación, partícula preverbal", estado: "borrador" },
  { id: "ze", lema: "ze", categoria_gramatical: "particula", definicion_breve: "interrogación, partícula final", estado: "borrador" },
];
const morphemes: Morpheme[] = [
  { forma: "ak", tipo: "sufijo", significado: "plural", estado: "borrador" },
  { forma: "aken", tipo: "sufijo", significado: "plural y objeto", estado: "borrador" },
  { forma: "en", tipo: "sufijo", significado: "objeto directo", estado: "borrador" },
  { forma: "us", tipo: "sufijo", significado: "pasado", estado: "borrador" },
  { forma: "da", tipo: "sufijo", significado: "posesión", estado: "borrador" },
  { forma: "ok", tipo: "sufijo", significado: "imperativo", estado: "borrador" },
];
const rules: MorphRule[] = [
  { nombre: "Negación ska", tipo_operacion: "otro", categoria_objetivo: "particula", descripcion: "Partícula preverbal", estado: "borrador", orden_aplicacion: 1 },
  { nombre: "Tiempo pasado -us", tipo_operacion: "sufijacion", categoria_objetivo: "verbo", descripcion: "Marca pasado", estado: "borrador", orden_aplicacion: 20 },
  { nombre: "Pluralización -ak", tipo_operacion: "sufijacion", categoria_objetivo: "sustantivo", descripcion: "Marca plural", estado: "borrador", orden_aplicacion: 20 },
  { nombre: "Marca de objeto -en", tipo_operacion: "sufijacion", categoria_objetivo: "sustantivo", descripcion: "Marca objeto", estado: "borrador", orden_aplicacion: 30 },
  { nombre: "Plural objeto -aken", tipo_operacion: "sufijacion", categoria_objetivo: "sustantivo", descripcion: "Plural objeto", estado: "borrador", orden_aplicacion: 30 },
  { nombre: "Interrogación ze", tipo_operacion: "otro", categoria_objetivo: "particula", descripcion: "Partícula final", estado: "borrador", orden_aplicacion: 99 },
  { nombre: "Posesión -da", tipo_operacion: "sufijacion", categoria_objetivo: "sustantivo", descripcion: "Poseedor antes del poseído", estado: "borrador", orden_aplicacion: 15 },
  { nombre: "Imperativo -ok", tipo_operacion: "sufijacion", categoria_objetivo: "verbo", descripcion: "Marca imperativo", estado: "borrador", orden_aplicacion: 20 },
];
const grammar: GrammarProfile = { orden_basico: "SOV", orden_adjetivo_sustantivo: "adjetivo_antes", estrategia_negacion: "particula", estrategia_interrogacion: "particula", estado: "borrador" };
const translate = (text: string) => translateText(text, lexemes, morphemes, [], rules, grammar, "borrador");

Deno.test("maps an infinitive through the Spanish gloss", () => assertEquals(translate("volar").translated_text, "kran"));
Deno.test("maps a common conjugation and preserves punctuation", () => assertEquals(translate("Yo vuelo.").translated_text, "nax kran."));
Deno.test("places negation immediately before the verb", () => assertEquals(translate("Yo no vuelo.").translated_text, "nax ska kran."));
Deno.test("reorders a simple object before the verb and marks it", () => assertEquals(translate("Yo veo el cielo.").translated_text, "nax zkoren tsan."));
Deno.test("adds the interrogative particle", () => assertEquals(translate("¿Vuela el clan?").translated_text, "ngor kran ze?"));
Deno.test("keeps unresolved words visible instead of inventing lexemes", () => {
  const result = translate("Yo saludo.");
  assertEquals(result.translated_text, "nax [saludo].");
  assertEquals(result.unresolved_words, ["saludo"]);
});
Deno.test("flags draft output as experimental", () => assertEquals(translate("volar").warning.includes("borrador"), true));

Deno.test("marks a Spanish past form with the configured Aoris past suffix", () => {
  assertEquals(translate("El clan voló.").translated_text, "ngor kranus.");
});
Deno.test("does not drop the accented third-person pronoun él", () => {
  const result = translate("Él vuela.");
  assertEquals(result.translated_text, "zor kran.");
});

Deno.test("moves adjectives before nouns when no verb is present", () => {
  assertEquals(translate("cielo grande").translated_text, "grek zkor");
});
Deno.test("uses the stored possessive suffix for a Spanish possessive determiner", () => {
  assertEquals(translate("mi clan").translated_text, "naxda ngor");
});
Deno.test("uses the stored imperative suffix in an exclamative command", () => {
  assertEquals(translate("¡Vuela!").translated_text, "¡kranok!");
});

Deno.test("recognizes a regular Spanish imperfect form through the lexicon", () => {
  assertEquals(translate("El clan volaba.").translated_text, "ngor kranus.");
});
