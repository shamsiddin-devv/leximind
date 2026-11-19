import type { ReactNode } from 'react';
import './LearningPreferencesForm.css';

export function PreferenceSection({ id, title, description, children }: {
  id: string; title: string; description?: string; children: ReactNode;
}) {
  return <section className="settings-form-section learning-preference-section" aria-labelledby={id}>
    <header className="settings-section-heading">
      <h2 id={id}>{title}</h2>
      {description && <p>{description}</p>}
    </header>
    <div className="learning-section-body">{children}</div>
  </section>;
}

export function PreferenceSwitch({ id, descriptionId, checked, disabled, onChange }: {
  id: string; descriptionId?: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void;
}) {
  return <span className="learning-toggle">
    <input type="checkbox" role="switch" id={id} checked={checked} disabled={disabled}
      aria-describedby={descriptionId} onChange={(event) => onChange(event.currentTarget.checked)} />
    <span className="learning-toggle-track" aria-hidden="true" />
  </span>;
}
