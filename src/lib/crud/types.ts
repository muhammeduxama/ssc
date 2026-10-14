export type FieldType =
  | "text"
  | "email"
  | "textarea"
  | "richtext"
  | "code"
  | "number"
  | "money"
  | "boolean"
  | "select"
  | "relation"
  | "image"
  | "file"
  | "date"
  | "slug"
  | "password"
  | "multi";

export type Field = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
  /** Static choices for type "select". */
  options?: { value: string; label: string }[];
  /** Dynamic choices for type "relation": model + the column used as label. */
  relation?: { model: string; label: string; where?: Record<string, unknown>; orderBy?: Record<string, "asc" | "desc"> };
  /** Many-to-many for type "multi": join table and its two key columns. */
  through?: { model: string; self: string; other: string };
  /** Build the slug from this field when left empty. */
  slugFrom?: string;
  /** Upload folder under Laravel's public/ (type image/file). */
  dir?: string;
  leadingSlash?: boolean;
  unique?: boolean;
  /** Show in the list table. */
  list?: boolean;
  /** Only shown when editing. */
  editOnly?: boolean;
  /** Full-width in the form grid. */
  wide?: boolean;
  /** Default for new records. */
  default?: string | number | boolean;
};

export type Resource = {
  slug: string;
  title: string;
  singular: string;
  group: string;
  model: string;
  description?: string;
  fields: Field[];
  search?: string[];
  orderBy?: Record<string, "asc" | "desc">;
  /** Records belong to a parent: filtered by ?<field>=<id> and prefilled on create. */
  parent?: { field: string; resource: string; label: string };
  /** Extra values written on create (e.g. author). */
  createDefaults?: Record<string, unknown>;
  canCreate?: boolean;
  canDelete?: boolean;
  /** Only the "admin" role (not editors). */
  adminOnly?: boolean;
  /** Links shown per row, {id} is replaced. */
  rowLinks?: { label: string; href: string }[];
  /** Filters shown above the list: equals on a field. */
  filters?: { field: string; label: string; options: { value: string; label: string }[] }[];
  /** Side effects the Laravel controller ran after saving (server only). */
  afterCreate?: (id: bigint, form: FormData) => Promise<void>;
  afterSave?: (id: bigint, form: FormData) => Promise<void>;
};

/** What the client form needs (no functions). */
export type ClientField = Field & { choices?: { value: string; label: string }[] };
