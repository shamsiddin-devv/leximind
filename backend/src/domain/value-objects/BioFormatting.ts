import { BadRequestError } from '../errors/BadRequestError';

export const maxBioFormatLength = 24_576;

const marks = new Set(['bold', 'italic', 'underline']);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function allowedAttribute(name: string, value: unknown) {
  if (marks.has(name)) return value === true;
  if (name === 'color') return typeof value === 'string' && /^#[a-f0-9]{6}$/i.test(value);
  if (name === 'align') return value === 'center';
  if (name === 'list') return value === 'bullet';
  return false;
}

export function normalizeBioFormat(format: string, bio: string | null): string {
  try {
    if (!bio || format.length > maxBioFormatLength) throw new Error();
    const delta: unknown = JSON.parse(format);
    if (!Array.isArray(delta) || delta.length === 0 || delta.length > 560) throw new Error();
    let text = '';
    for (const operation of delta as unknown[]) {
      if (!isObject(operation) || typeof operation.insert !== 'string' || !operation.insert ||
          Object.keys(operation).some((key) => key !== 'insert' && key !== 'attributes')) throw new Error();
      const { attributes, insert } = operation;
      if (attributes !== undefined) {
        if (!isObject(attributes) || Object.entries(attributes).some(([name, value]) => !allowedAttribute(name, value))) throw new Error();
        if (('align' in attributes || 'list' in attributes) && !/^\n+$/.test(insert)) throw new Error();
      }
      text += insert;
    }
    if (!text.endsWith('\n') || text.trim() !== bio) throw new Error();
    return JSON.stringify(delta);
  } catch {
    throw new BadRequestError('Invalid bio formatting.');
  }
}
