import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Notice } from '../../../shared/components/UI';
import type { PreferenceSave } from '../hooks/usePreferenceSave';
import { levels, type LearningPreferences, type Profile } from '../../../shared/types/api';
import { SettingsField } from './SettingsField';
import { PreferenceSection, PreferenceSwitch } from './PreferenceControls';

type ToggleKey = 'studyReminderEnabled' | 'feedbackAudioEnabled' | 'autoplayPronunciation';

function GoalControl({ id, label, description, value, unit, min, max, onChange }: {
  id: string; label: string; description: string; value: number; unit: string;
  min: number; max: number; onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string>();
  function adjust(by: number) {
    onChange(Math.min(max, Math.max(min, value + by)));
  }

  return <SettingsField id={id} label={label} description={description}>
    <div className="learning-goal-stepper">
      <button type="button" aria-label={`${label} miqdorini kamaytirish`} disabled={value <= min}
        onClick={() => adjust(-1)}><Minus size={16} aria-hidden="true" /></button>
      <span className="learning-goal-value">
        <input id={id} type="number" min={min} max={max} step={1} required
          value={draft ?? value} aria-describedby={`${id}-description`} onChange={(event) => setDraft(event.currentTarget.value)}
          onBlur={(event) => {
            if (draft !== undefined && event.currentTarget.validity.valid) onChange(event.currentTarget.valueAsNumber);
            setDraft(undefined);
          }}
          onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} />
        <span aria-hidden="true">{unit}</span>
      </span>
      <button type="button" aria-label={`${label} miqdorini oshirish`} disabled={value >= max}
        onClick={() => adjust(1)}><Plus size={16} aria-hidden="true" /></button>
    </div>
  </SettingsField>;
}

export function LearningPreferencesForm({ profile, preferences }: { profile: Profile; preferences: PreferenceSave }) {
  const { save, pending, status } = preferences;
  const values = { ...profile, ...pending };
  const [reminderTime, setReminderTime] = useState<string>();

  function edit<K extends keyof LearningPreferences>(key: K, value: LearningPreferences[K]) {
    if (values[key] !== value) save({ [key]: value });
  }

  function toggle(key: ToggleKey, label: string, description: string) {
    const id = `learning-${key}`;
    return <SettingsField id={id} label={label} description={description}>
      <PreferenceSwitch id={id} descriptionId={`${id}-description`} checked={values[key]} onChange={(checked) => edit(key, checked)} />
    </SettingsField>;
  }

  return <div className="learning-preferences-form">
    <PreferenceSection id="learning-goals" title="Kunlik maqsadlar" description="Har kuni qancha o‘rganishni belgilang.">
      <GoalControl id="learning-words" label="Kunlik yangi so‘zlar" description="Har kuni taklif qilinadigan yangi so‘zlar soni."
        value={values.dailyNewWords} unit="so‘z" min={1} max={100}
        onChange={(value) => edit('dailyNewWords', value)} />
      <GoalControl id="learning-minutes" label="Kunlik o‘rganish vaqti" description="Kunlik mashq uchun ajratilgan vaqt."
        value={values.dailyStudyMinutes} unit="daq" min={5} max={180}
        onChange={(value) => edit('dailyStudyMinutes', value)} />
    </PreferenceSection>
    <PreferenceSection id="learning-course" title="Til va daraja">
      <SettingsField id="learning-interface-language" label="Interfeys tili">
        <input id="learning-interface-language" className="learning-language" readOnly value="O‘zbekcha" />
      </SettingsField>
      <SettingsField id="learning-language" label="O‘rganilayotgan til">
        <input id="learning-language" className="learning-language" readOnly value="Ingliz tili" />
      </SettingsField>
      <div className="settings-form-row learning-selector-row">
        <div className="settings-field-label">
          <span className="settings-row-label" id="learning-level-label">Mashq darajasi</span>
          <small id="learning-level-description">Avtomatik rejimda aniqlangan CEFR darajangiz ishlatiladi.</small>
        </div>
        <div className="learning-segments" role="radiogroup" aria-labelledby="learning-level-label" aria-describedby="learning-level-description">
          <label>
            <input type="radio" name="studyLevel" value="auto" checked={values.studyLevel === null} onChange={() => edit('studyLevel', null)} />
            <span>Avto <span className="learning-automatic-level">{profile.level}</span></span>
          </label>
          {levels.map((level) => <label key={level}>
            <input type="radio" name="studyLevel" value={level} checked={values.studyLevel === level} onChange={() => edit('studyLevel', level)} />
            <span>{level}</span>
          </label>)}
        </div>
      </div>
      <div className="settings-form-row learning-selector-row">
        <span className="settings-row-label" id="learning-review-label">Takrorlash usuli</span>
        <div className="learning-segments" role="radiogroup" aria-labelledby="learning-review-label">
          <label>
            <input type="radio" name="reviewMode" value="spaced" checked={values.reviewMode === 'spaced'} onChange={() => edit('reviewMode', 'spaced')} />
            <span>Intervalli</span>
          </label>
          <label>
            <input type="radio" name="reviewMode" value="random" checked={values.reviewMode === 'random'} onChange={() => edit('reviewMode', 'random')} />
            <span>Tasodifiy</span>
          </label>
        </div>
      </div>
    </PreferenceSection>
    <PreferenceSection id="learning-audio" title="Eslatmalar va ovozlar">
      {toggle('studyReminderEnabled', 'O‘rganish eslatmalari', 'LexiMind ochiq bo‘lganda kunlik mashqni eslatadi.')}
      <SettingsField id="learning-reminder-time" label="Eslatma vaqti" description="Qurilmangizning mahalliy vaqti bo‘yicha.">
        <input id="learning-reminder-time" type="time" step={60} required value={reminderTime ?? values.studyReminderTime} disabled={!values.studyReminderEnabled}
          aria-describedby="learning-reminder-time-description" onChange={(event) => {
            const input = event.currentTarget;
            setReminderTime(input.validity.valid ? undefined : input.value);
            if (input.validity.valid) edit('studyReminderTime', input.value);
          }}
          onBlur={() => setReminderTime(undefined)} />
      </SettingsField>
      {toggle('feedbackAudioEnabled', 'O‘yin ovoz effektlari', 'O‘yin javoblariga beriladigan ovozli fikr-mulohaza.')}
      {toggle('autoplayPronunciation', 'Talaffuzni avtomatik ijro etish', 'So‘z mashqlari va kartalarda inglizcha talaffuzni ijro etadi.')}
    </PreferenceSection>
    {status?.error && <Notice error>{status.message}</Notice>}
    <p className="preference-status" role="status">{status?.error ? '' : status?.message}</p>
  </div>;
}
