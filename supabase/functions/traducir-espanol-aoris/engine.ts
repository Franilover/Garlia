export type Lexeme = {
  id: string; lema: string; categoria_gramatical: string | null; definicion_breve: string | null;
  estado: string | null; transcripcion_ipa?: string | null;
};
export type Morpheme = { forma: string; tipo: string; significado: string | null; estado: string | null };
export type MorphRule = { nombre: string; tipo_operacion: string; categoria_objetivo: string | null; descripcion: string | null; estado: string | null; orden_aplicacion: number | null };
export type LexicalSense = { lexema_id: string; definicion: string | null; uso_ejemplo?: string | null; restricciones_uso?: string | null; estado: string | null };
export type GrammarProfile = { orden_basico?: string | null; orden_adjetivo_sustantivo?: string | null; estrategia_negacion?: string | null; estrategia_interrogacion?: string | null; notas?: string | null; estado?: string | null };
export type Match = { source: string; target: string; category: string | null; state: string | null };
type Token = { source: string; normalized: string; target: string; category: string | null; state: string | null; kind: "word" | "ignored" | "negation"; tense?: "past" | "present" | "unknown"; matched?: Lexeme; index: number };

const ARTICLES = new Set(["el", "la", "los", "las", "un", "una", "unos", "unas", "lo"]);
const IRREGULAR_VERBS: Record<string, { lemma: string; tense?: "past" | "present" }> = {
  vuelo: { lemma: "volar" }, vuelas: { lemma: "volar" }, vuela: { lemma: "volar" }, volamos: { lemma: "volar" }, volais: { lemma: "volar" }, vuelan: { lemma: "volar" }, vole: { lemma: "volar", tense: "past" }, volaste: { lemma: "volar", tense: "past" }, volo: { lemma: "volar", tense: "past" }, volaron: { lemma: "volar", tense: "past" },
  veo: { lemma: "ver" }, ves: { lemma: "ver" }, ve: { lemma: "ver" }, vemos: { lemma: "ver" }, ven: { lemma: "ver" }, vi: { lemma: "ver", tense: "past" }, viste: { lemma: "ver", tense: "past" }, vio: { lemma: "ver", tense: "past" }, vieron: { lemma: "ver", tense: "past" },
  soy: { lemma: "ser" }, eres: { lemma: "ser" }, es: { lemma: "ser" }, somos: { lemma: "ser" }, sois: { lemma: "ser" }, son: { lemma: "ser" }, fui: { lemma: "ser", tense: "past" }, fue: { lemma: "ser", tense: "past" }, fueron: { lemma: "ser", tense: "past" },
  estoy: { lemma: "estar" }, estas: { lemma: "estar" }, esta: { lemma: "estar" }, estamos: { lemma: "estar" }, estan: { lemma: "estar" }, estuve: { lemma: "estar", tense: "past" }, estuvo: { lemma: "estar", tense: "past" },
  tengo: { lemma: "tener" }, tienes: { lemma: "tener" }, tiene: { lemma: "tener" }, tenemos: { lemma: "tener" }, tienen: { lemma: "tener" }, tuve: { lemma: "tener", tense: "past" }, tuvo: { lemma: "tener", tense: "past" },
  hago: { lemma: "hacer" }, haces: { lemma: "hacer" }, hace: { lemma: "hacer" }, hacemos: { lemma: "hacer" }, hacen: { lemma: "hacer" }, hice: { lemma: "hacer", tense: "past" }, hizo: { lemma: "hacer", tense: "past" },
  digo: { lemma: "decir" }, dices: { lemma: "decir" }, dice: { lemma: "decir" }, decimos: { lemma: "decir" }, dicen: { lemma: "decir" }, dije: { lemma: "decir", tense: "past" }, dijo: { lemma: "decir", tense: "past" },
  puedo: { lemma: "poder" }, puedes: { lemma: "poder" }, puede: { lemma: "poder" }, podemos: { lemma: "poder" }, pueden: { lemma: "poder" },
  quiero: { lemma: "querer" }, quieres: { lemma: "querer" }, quiere: { lemma: "querer" }, queremos: { lemma: "querer" }, quieren: { lemma: "querer" },
};
const normalize = (value: string) => value.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’']/g, "").trim();
const splitGloss = (value: string | null | undefined) =>
  (value ?? "").split(/[,;\/|—–:()]+/u).map((part) => normalize(part).replace(/[^\p{L}\p{N}\s-]/gu, "").trim()).filter(Boolean);
const hasRule = (rules: MorphRule[], pattern: RegExp) => rules.some((rule) => rule.estado !== "archivado" && pattern.test(normalize(rule.nombre)));

function glossesFor(lexeme: Lexeme, senses: LexicalSense[]) {
  return [...new Set([...splitGloss(lexeme.definicion_breve), ...senses.filter((s) => s.lexema_id === lexeme.id && s.estado !== "archivado").flatMap((s) => splitGloss(s.definicion))])];
}
function stemCandidates(word: string, category: string | null): { candidates: string[]; tense: "past" | "present" | "unknown" } {
  const candidates = [word]; let tense: "past" | "present" | "unknown" = "unknown";
  const irregular = IRREGULAR_VERBS[word];
  if (irregular) { candidates.push(normalize(irregular.lemma)); tense = irregular.tense ?? "present"; }
  if (category === "verbo") {
    const add = (s: string) => { if (s && !candidates.includes(s)) candidates.push(s); };
    if (word.endsWith("ando") && word.length > 4) add(word.slice(0, -4) + "ar");
    if (word.endsWith("iendo") && word.length > 5) { add(word.slice(0, -5) + "er"); add(word.slice(0, -5) + "ir"); }
    if (word.endsWith("io") && word.length > 2) { add(word.slice(0, -2) + "er"); add(word.slice(0, -2) + "ir"); }
    const pastPatterns: Array<[RegExp, string[]]> = [
      [/aste$/, ["ar"]], [/iste$/, ["er", "ir"]], [/aron$/, ["ar"]], [/ieron$/, ["er", "ir"]],
      [/abamos$/, ["ar"]], [/iamos$/, ["er", "ir"]], [/asteis$/, ["ar"]], [/é$/, ["ar"]], [/ó$/, ["ar"]], [/í$/, ["er", "ir"]], [/ió$/, ["er", "ir"]],
    ];
    for (const [pattern, endings] of pastPatterns) if (pattern.test(word) && word.length > 2) {
      const base = word.replace(pattern, ""); endings.forEach((ending) => add(base + ending)); tense = "past";
    }
    const presentPatterns: Array<[RegExp, string[]]> = [
      [/amos$/, ["ar"]], [/ais$/, ["ar"]], [/an$/, ["ar"]], [/as$/, ["ar"]], [/a$/, ["ar"]],
      [/emos$/, ["er"]], [/eis$/, ["er"]], [/en$/, ["er", "ir"]], [/es$/, ["er", "ir"]], [/e$/, ["ar", "er", "ir"]],
      [/imos$/, ["ir"]], [/is$/, ["ir"]], [/i$/, ["er", "ir"]], [/o$/, ["ar", "er", "ir"]],
    ];
    for (const [pattern, endings] of presentPatterns) if (pattern.test(word) && word.length > 2) {
      const base = word.replace(pattern, ""); endings.forEach((ending) => add(base + ending));
    }
  } else if (["sustantivo", "adjetivo", "pronombre"].includes(category ?? "")) {
    if (word.endsWith("es") && word.length > 3) candidates.push(word.slice(0, -2));
    if (word.endsWith("s") && word.length > 2) candidates.push(word.slice(0, -1));
    if (category === "adjetivo") for (const ending of ["os", "as", "o", "a"]) {
      if (word.endsWith(ending) && word.length > ending.length + 1) candidates.push(word.slice(0, -ending.length) + "o");
    }
  }
  return { candidates: [...new Set(candidates)], tense };
}
function findLexeme(word: string, lexemes: Lexeme[], senses: LexicalSense[], preferredCategory?: string) {
  const normalized = normalize(word);
  const candidates = stemCandidates(normalized, preferredCategory ?? null);
  const explicitlyPast = /(?:é|aste|ó|aron|í|iste|ió|ieron|aba|aban|ía|ían)$/iu.test(word);
  const ordered = preferredCategory ? [...lexemes.filter((l) => l.categoria_gramatical === preferredCategory), ...lexemes.filter((l) => l.categoria_gramatical !== preferredCategory)] : lexemes;
  for (const candidate of candidates.candidates) {
    const found = ordered.find((lexeme) => glossesFor(lexeme, senses).some((gloss) => gloss === candidate || gloss.split(/\s+/u).includes(candidate)));
    if (found) return { lexeme: found, tense: IRREGULAR_VERBS[normalized]?.tense ?? (explicitlyPast ? "past" : candidates.tense) };
  }
  return null;
}
function getSuffix(morphemes: Morpheme[], forms: string[]) {
  const wanted = new Set(forms.map(normalize));
  return morphemes.find((m) => m.estado !== "archivado" && wanted.has(normalize(m.forma)))?.forma ?? null;
}
const categoryIs = (token: Token, category: string) => token.category === category && token.kind === "word";
const isSpanishPlural = (source: string) => {
  const word = normalize(source);
  return word.length > 3 && (word.endsWith("s") || word.endsWith("es")) && !["lunes", "martes", "jueves", "virus", "crisis"].includes(word);
};
function attachPlural(token: Token, morphemes: Morpheme[], rules: MorphRule[]) {
  const suffix = hasRule(rules, /pluralizacion/) ? getSuffix(morphemes, ["ak"]) : null;
  if (suffix && !/(?:ak|aken)$/i.test(token.target)) token.target += suffix;
}
function attachObject(token: Token, morphemes: Morpheme[], rules: MorphRule[], plural: boolean) {
  const enabled = plural ? hasRule(rules, /plural objeto/) : hasRule(rules, /marca de objeto/);
  const suffix = enabled ? getSuffix(morphemes, plural ? ["aken"] : ["en"]) : null;
  if (suffix && !token.target.toLowerCase().endsWith(suffix.toLowerCase())) token.target += suffix;
}

function translateClause(rawClause: string, lexemes: Lexeme[], morphemes: Morpheme[], senses: LexicalSense[], rules: MorphRule[], profile: GrammarProfile | null) {
  const rawTokens = rawClause.match(/[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*|\d+|[^\s]/gu) ?? [];
  const tokens: Token[] = []; const unresolved: string[] = []; const matches: Match[] = [];
  const question = /\?/u.test(rawClause);
  const invertedQuestion = rawClause.trim().startsWith("¿");
  const exclamative = rawClause.trim().startsWith("¡");
  const possessionRule = hasRule(rules, /posesion/);
  const possessionSuffix = possessionRule ? getSuffix(morphemes, ["da"]) : null;
  const possessivePerson: Record<string, string> = {
    mi: "yo", mis: "yo", tu: "tu", tus: "tu", su: "el", sus: "el",
    nuestro: "nosotros", nuestra: "nosotros", nuestros: "nosotros", nuestras: "nosotros",
  };
  const negationRule = hasRule(rules, /negacion/);
  const questionRule = hasRule(rules, /interrogacion/);
  const negativeLexeme = negationRule ? lexemes.find((l) => l.categoria_gramatical === "particula" && /negacion/u.test(normalize(l.definicion_breve ?? ""))) : undefined;
  const questionLexeme = questionRule ? lexemes.find((l) => l.categoria_gramatical === "particula" && /interrogacion/u.test(normalize(l.definicion_breve ?? ""))) : undefined;
  const isSov = (profile?.orden_basico ?? "SOV").toUpperCase() === "SOV";
  const adjectiveBefore = (profile?.orden_adjetivo_sustantivo ?? "adjetivo_antes") === "adjetivo_antes";

  for (let i = 0; i < rawTokens.length; i++) {
    const source = rawTokens[i];
    if (!/[\p{L}\p{M}\d]/u.test(source)) continue;
    const normalized = normalize(source);
    const sourceHasAcuteAccent = source.normalize("NFD").includes("\u0301");
    if (ARTICLES.has(normalized) && !(normalized === "el" && sourceHasAcuteAccent)) {
      tokens.push({ source, normalized, target: "", category: null, state: null, kind: "ignored", index: i });
      continue;
    }
    if (possessionSuffix && possessivePerson[normalized] && !(normalized === "tu" && sourceHasAcuteAccent)) {
      const pronoun = findLexeme(possessivePerson[normalized], lexemes, senses, "pronombre")?.lexeme;
      if (pronoun) {
        const token: Token = {
          source, normalized, target: pronoun.lema + possessionSuffix, category: "posesivo",
          state: pronoun.estado, kind: "word", matched: pronoun, index: i,
        };
        tokens.push(token);
        matches.push({ source, target: token.target, category: token.category, state: token.state });
        continue;
      }
    }
    if (normalized === "no" || (normalized === "nunca" && negativeLexeme)) {
      const target = normalized === "nunca" ? lexemes.find((l) => l.categoria_gramatical === "adverbio" && /nunca/u.test(normalize(l.definicion_breve ?? ""))) : negativeLexeme;
      if (target) {
        const token: Token = { source, normalized, target: target.lema, category: target.categoria_gramatical, state: target.estado, kind: normalized === "no" ? "negation" : "word", matched: target, index: i };
        tokens.push(token); matches.push({ source, target: token.target, category: token.category, state: token.state });
      } else { tokens.push({ source, normalized, target: `[${source}]`, category: null, state: null, kind: "word", index: i }); unresolved.push(source); }
      continue;
    }
    let found = findLexeme(normalized, lexemes, senses);
    if (!found) for (const category of ["pronombre", "verbo", "sustantivo", "adjetivo", "adverbio", "conjuncion", "particula", "numeral"]) {
      found = findLexeme(normalized, lexemes, senses, category); if (found) break;
    }
    if (!found) { tokens.push({ source, normalized, target: `[${source}]`, category: null, state: null, kind: "word", index: i }); unresolved.push(source); continue; }
    const token: Token = { source, normalized, target: found.lexeme.lema, category: found.lexeme.categoria_gramatical, state: found.lexeme.estado, kind: "word", matched: found.lexeme, tense: found.tense, index: i };
    if (token.category === "verbo" && found.tense === "past" && hasRule(rules, /tiempo pasado/)) {
      const suffix = getSuffix(morphemes, ["us"]);
      if (suffix && !token.target.toLowerCase().endsWith(suffix.toLowerCase())) token.target += suffix;
    }
    tokens.push(token); matches.push({ source, target: token.target, category: token.category, state: token.state });
  }

  const content = tokens.filter((t) => t.kind !== "ignored");
  const verbIndex = content.findIndex((t) => categoryIs(t, "verbo"));
  const rendered: Token[] = []; const used = new Set<Token>();
  const nounPhrase = (head: Token, isObject: boolean) => {
    const phrase: Token[] = [];
    const headIndex = content.indexOf(head);
    const possessive = content.find((t) => t.category === "posesivo" && !used.has(t) && content.indexOf(t) < headIndex && headIndex - content.indexOf(t) <= 2);
    if (possessive) { phrase.push(possessive); used.add(possessive); }
    if (adjectiveBefore) {
      const adjectives = content.filter((t) => categoryIs(t, "adjetivo") && !used.has(t) && Math.abs(content.indexOf(t) - content.indexOf(head)) <= 2)
        .sort((a, b) => content.indexOf(a) - content.indexOf(b));
      for (const adjective of adjectives) {
        if (isObject === (content.indexOf(adjective) > verbIndex) || verbIndex < 0) { phrase.push(adjective); used.add(adjective); }
      }
    }
    if (head.category === "sustantivo") {
      if (isSpanishPlural(head.source)) {
        if (isObject) attachObject(head, morphemes, rules, true); else attachPlural(head, morphemes, rules);
      } else if (isObject) attachObject(head, morphemes, rules, false);
    }
    phrase.push(head); used.add(head); return phrase;
  };

  if (verbIndex >= 0 && isSov) {
    const verb = content[verbIndex]; const before = content.slice(0, verbIndex); const after = content.slice(verbIndex + 1);
    let subject = before.find((t) => categoryIs(t, "pronombre") || categoryIs(t, "sustantivo"));
    if (!subject && invertedQuestion) subject = after.find((t) => categoryIs(t, "pronombre") || categoryIs(t, "sustantivo"));
    const objects = after.filter((t) => t !== subject && (categoryIs(t, "sustantivo") || categoryIs(t, "pronombre")));
    if (subject) rendered.push(...nounPhrase(subject, false));
    for (const object of objects) rendered.push(...nounPhrase(object, true));
    for (const token of content) {
      if (used.has(token) || token === verb || token.kind === "negation") continue;
      if (categoryIs(token, "adjetivo") && content.some((t) => (categoryIs(t, "sustantivo") || categoryIs(t, "pronombre")) && Math.abs(content.indexOf(t) - content.indexOf(token)) <= 2)) continue;
      rendered.push(token); used.add(token);
    }
    rendered.push(...content.filter((t) => t.kind === "negation"));
    rendered.push(verb);
  } else {
    for (const token of content) {
      if (used.has(token)) continue;
      if (categoryIs(token, "sustantivo") || categoryIs(token, "pronombre")) {
        rendered.push(...nounPhrase(token, false));
      } else {
        const belongsToNoun = categoryIs(token, "adjetivo") && content.some((t) =>
          (categoryIs(t, "sustantivo") || categoryIs(t, "pronombre")) && Math.abs(content.indexOf(t) - content.indexOf(token)) <= 2
        );
        if (!belongsToNoun) { rendered.push(token); used.add(token); }
      }
    }
  }

  if (exclamative && !question && verbIndex >= 0 && content[verbIndex]?.category === "verbo" &&
      !content.slice(0, verbIndex).some((t) => categoryIs(t, "pronombre") || categoryIs(t, "sustantivo")) &&
      hasRule(rules, /imperativo/)) {
    const imperativeSuffix = getSuffix(morphemes, ["ok"]);
    if (imperativeSuffix && !content[verbIndex].target.toLowerCase().endsWith(imperativeSuffix.toLowerCase())) {
      content[verbIndex].target += imperativeSuffix;
    }
  }

  let output = rendered.map((t) => t.target).filter(Boolean).join(" ");
  if (question && questionLexeme && !output.toLowerCase().endsWith(questionLexeme.lema.toLowerCase())) {
    output = `${output} ${questionLexeme.lema}`.trim();
    matches.push({ source: "?", target: questionLexeme.lema, category: "particula", state: questionLexeme.estado });
  }
  if (question && invertedQuestion) output = `¿${output}`;
  if (exclamative && !question) output = `¡${output}`;
  const finalMatches = matches.map((match) => {
    const token = tokens.find((t) => t.source === match.source && t.matched);
    return token ? { ...match, target: token.target } : match;
  });
  return { output, unresolved: [...new Set(unresolved)], matches: finalMatches, recognized: finalMatches.filter((m) => m.source !== "?").length, contentCount: content.filter((t) => t.kind !== "ignored").length };
}

export function translateText(text: string, lexemes: Lexeme[], morphemes: Morpheme[], senses: LexicalSense[], rules: MorphRule[], profile: GrammarProfile | null, languageState: string | null) {
  const segments = text.match(/[^.!?]+[.!?]?/gu) ?? [text];
  const translated: string[] = []; const allMatches: Match[] = []; const allUnresolved: string[] = [];
  let recognized = 0; let content = 0;
  for (const segment of segments) {
    if (!segment.trim()) continue;
    const punctuation = segment.match(/[.!?]+\s*$/u)?.[0]?.trim() ?? "";
    const rawClause = punctuation ? segment.slice(0, segment.lastIndexOf(punctuation)).trim() : segment.trim();
    if (!rawClause) { translated.push(punctuation); continue; }
    const result = translateClause(rawClause + punctuation, lexemes, morphemes, senses, rules, profile);
    translated.push(`${result.output}${punctuation}`.trim());
    allMatches.push(...result.matches); allUnresolved.push(...result.unresolved);
    recognized += result.recognized; content += result.contentCount;
  }
  const unresolved = [...new Set(allUnresolved)];
  const isDraft = languageState !== "canon" || lexemes.some((l) => l.estado !== "canon") || morphemes.some((m) => m.estado !== "canon") || rules.some((r) => r.estado !== "canon") || (profile?.estado != null && profile.estado !== "canon");
  return {
    source_language: "Español", target_language: "Aoris", source_text: text,
    translated_text: translated.join(" ").replace(/\s+([.!?])/gu, "$1"),
    mode: "morphosyntactic-provisional", recognized_tokens: recognized, total_content_tokens: content,
    unresolved_words: unresolved, matches: allMatches, language_state: languageState,
    warning: isDraft
      ? "Motor experimental: el perfil gramatical, las reglas y/o el léxico Aoris contienen datos en borrador. La salida no representa todavía una traducción canónica."
      : "La salida se ha generado con el léxico y las reglas lingüísticas disponibles; revisa las palabras sin resolver.",
    diagnostics: {
      grammar_profile_loaded: Boolean(profile), morphology_rules_loaded: rules.length, morphemes_loaded: morphemes.length,
      lexemes_loaded: lexemes.length, recognized_content_tokens: recognized, total_content_tokens: content,
      coverage: content ? Number((recognized / content).toFixed(3)) : 1,
    },
  };
}
