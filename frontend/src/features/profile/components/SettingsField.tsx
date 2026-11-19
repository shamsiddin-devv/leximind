import type { ReactNode } from 'react';
import { CircleHelp } from 'lucide-react';

export function SettingsField({ id, label, description, required, optional, children }: {
  id: string;
  label: string;
  description?: string;
  required?: boolean;
  optional?: boolean;
  children: ReactNode;
}) {
  return <div className="settings-form-row">
    <div className="settings-field-label">
      <div className="settings-field-title">
        <label className="settings-row-label" id={id + '-label'} htmlFor={id}>{label}</label>
        {required && <span className="settings-required-mark" aria-hidden="true">*</span>}
        {optional && <span className="settings-optional-mark" role="img" aria-label="Ixtiyoriy" title="Ixtiyoriy">
          <CircleHelp size={14} aria-hidden="true" />
        </span>}
      </div>
      {description && <small id={id + '-description'}>{description}</small>}
    </div>
    <div className="settings-field-control">{children}</div>
  </div>;
}
