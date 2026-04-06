// ─── UI Components barrel ─────────────────────────────────────────────────────
// Re-exporta desde los archivos divididos por categoría.
// Los imports existentes como @/components/ui siguen funcionando sin cambios.

export { Btn, BtnIcon }                      from "./Buttons";
export { Input, InputLine, Textarea, Select } from "./Inputs";
export { Loading, EmptyState, Badge, Divider, StatRow } from "./Feedback";
export { Modal, Card, PageHeader, BackBtn }  from "./Layout";