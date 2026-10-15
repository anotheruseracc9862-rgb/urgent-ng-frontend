"use client";

import { useId } from "react";
import { Input, Textarea } from "@urgent/ui";
import type { Schema } from "./contracts";
import { labelFor } from "./access";

/** Native, labelled controls are shared by action forms and server-side query filters. */
export function SchemaField({ name, schema, value, required = false, onChange }: { name: string; schema: Schema; value: unknown; required?: boolean; onChange: (value: unknown) => void }) {
  const id = useId();
  const label = labelFor(name);
  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  if (schema.properties) {
    const enabled = value !== undefined;
    const object = value && typeof value === "object" ? value as Record<string, unknown> : {};
    return <fieldset className="nested-fields"><legend>{label}{!required && <button className="text-button" type="button" onClick={() => onChange(enabled ? undefined : {})}>{enabled ? "Remove" : "Add"}</button>}</legend>{(required || enabled) && Object.entries(schema.properties).map(([key, child]) => <SchemaField key={key} name={key} schema={child} required={schema.required?.includes(key)} value={object[key]} onChange={next => onChange({ ...object, [key]: next })} />)}</fieldset>;
  }
  if (type === "array") {
    const list = Array.isArray(value) ? value : [];
    if (schema.items?.properties) return <fieldset className="nested-fields"><legend>{label}</legend>{schema.description && <p className="muted">{schema.description}</p>}{list.map((item, index) => <div className="array-item" key={index}><SchemaField name={`${name} ${index + 1}`} schema={schema.items!} value={item} required onChange={next => onChange(list.map((entry, i) => i === index ? next : entry))} /><button className="text-button" type="button" onClick={() => onChange(list.filter((_, i) => i !== index))}>Remove entry</button></div>)}<button className="button" type="button" disabled={list.length >= (schema.maxItems ?? 50)} onClick={() => onChange([...list, {}])}>Add {label.toLowerCase()} entry</button></fieldset>;
    if (schema.items?.enum) return <fieldset className="nested-fields"><legend>{label}{required ? " *" : ""}</legend>{schema.description && <p className="muted">{schema.description}</p>}<div className="checkbox-grid">{schema.items.enum.map(option => <label key={String(option)}><input type="checkbox" checked={list.includes(option)} onChange={e => onChange(e.target.checked ? [...list, option] : list.filter(v => v !== option))} />{labelFor(String(option))}</label>)}</div></fieldset>;
    return <label className="field" htmlFor={id}>{label}{required ? " *" : ""}<Textarea id={id} value={list.join("\n")} onChange={e => onChange(e.target.value === "" ? [] : e.target.value.split("\n"))} placeholder="One value per line" /><small>{schema.description ?? "Enter one value per line. An empty list replaces the current list with none."}</small></label>;
  }
  if (schema.oneOf) {
    const chosen = typeof value === "number" ? "number" : typeof value === "boolean" ? "boolean" : "string";
    return <div className="stack"><label className="field" htmlFor={`${id}-type`}>{label} type<select id={`${id}-type`} value={chosen} onChange={e => onChange(e.target.value === "number" ? 0 : e.target.value === "boolean" ? false : "")}><option value="number">Number</option><option value="boolean">Boolean</option><option value="string">Text</option></select></label><SchemaField name={name} schema={{ ...schema, oneOf: undefined, type: chosen }} required={required} value={value} onChange={onChange} /></div>;
  }
  const str = value === undefined || value === null ? "" : String(value);
  const longText = ["reasonText", "note", "notes", "body", "message", "summary", "resolution", "description"].includes(name);
  const common = { id, required, "aria-describedby": schema.description ? `${id}-help` : undefined };
  return <label className="field" htmlFor={id}>{label}{required ? " *" : ""}
    {schema.enum || type === "boolean" ? <select {...common} value={str} onChange={e => onChange(e.target.value === "" ? undefined : type === "boolean" ? e.target.value === "true" : e.target.value)}><option value="">{required ? "Choose an option" : "Leave unchanged / use default"}</option>{(schema.enum ?? [true, false]).map(option => <option key={String(option)} value={String(option)}>{typeof option === "boolean" ? option ? "Yes" : "No" : labelFor(String(option))}</option>)}</select>
      : longText ? <Textarea {...common} value={str} minLength={schema.minLength} maxLength={schema.maxLength} onChange={e => onChange(e.target.value || undefined)} rows={3} />
      : <Input {...common} type={type === "number" || type === "integer" ? "number" : schema.format === "date-time" ? "datetime-local" : schema.format === "email" || name === "email" ? "email" : "text"} value={schema.format === "date-time" && str.endsWith("Z") ? str.slice(0, 16) : str} min={schema.minimum} max={schema.maximum} step={type === "integer" || schema.integer ? 1 : type === "number" ? "any" : undefined} minLength={schema.minLength} maxLength={schema.maxLength} pattern={schema.pattern} onChange={e => onChange(e.target.value === "" ? undefined : type === "number" || type === "integer" ? Number(e.target.value) : e.target.value)} />}
    {schema.description && <small id={`${id}-help`}>{schema.description}</small>}
  </label>;
}

/** Keep omitted optional fields omitted; dates sent to the API are timezone-qualified. */
export function requestValue(value: unknown, schema: Schema): unknown {
  if (value === undefined) return undefined;
  if (schema.format === "date-time" && typeof value === "string") return new Date(value).toISOString();
  if (Array.isArray(value)) return value.map(v => requestValue(v, schema.items ?? {}));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined).map(([key, v]) => [key, requestValue(v, schema.properties?.[key] ?? {})]));
  return typeof value === "string" ? value.trim() : value;
}
