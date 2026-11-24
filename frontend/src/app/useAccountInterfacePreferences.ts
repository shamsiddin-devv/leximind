import { useLayoutEffect } from 'react';
import { api, explain } from '../shared/services/api';
import {
  activateAccountInterface, applyInterfaceChanges, mergeInterfaceChanges,
  type InterfaceSettings, type InterfaceSettingsPatch,
} from './interfacePreferences';

const path = '/users/me/ui-preferences';
type Response = { interfaceSettings: InterfaceSettings | null };

export function useAccountInterfacePreferences(userId?: string, token?: string) {
  useLayoutEffect(() => {
    if (!userId || !token) return;
    const controller = new AbortController();
    const options = { token, signal: controller.signal };
    let confirmed: InterfaceSettings | null = null;
    let pending: InterfaceSettingsPatch | undefined;
    let ready = false;
    let reading = false;
    let saving = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const scope = activateAccountInterface(userId, (patch) => {
      pending = mergeInterfaceChanges(pending ?? {}, patch);
      schedule();
    });

    function schedule() {
      if (!ready || reading || saving || !pending || controller.signal.aborted) return;
      clearTimeout(timer);
      timer = setTimeout(() => void save(), 140);
    }

    function apply() {
      scope.apply(applyInterfaceChanges(confirmed ?? scope.initial, pending), confirmed);
    }

    function issue(failure: unknown) {
      if (!controller.signal.aborted) {
        scope.setIssue({ message: explain(failure), retry: refresh });
      }
    }

    async function load() {
      if (reading || saving || controller.signal.aborted) return;
      reading = true;
      try {
        const remote = await api<Response>(path, options);
        confirmed = remote.interfaceSettings;
        // Initial imports fill an empty server section. A different device that
        // wrote first wins, and any local edits made during loading are patched after it.
        if (!ready && !confirmed && scope.legacy) {
          const initialized = await api<Response>(path, {
            ...options, method: 'PATCH',
            body: { initialize: true, interfaceSettings: scope.legacy },
          });
          confirmed = initialized.interfaceSettings;
        }
        if (!controller.signal.aborted) {
          ready = true;
          apply();
          scope.setIssue();
        }
      } catch (failure) {
        issue(failure);
      } finally {
        reading = false;
        schedule();
      }
    }

    async function save() {
      if (!ready || reading || saving || !pending || controller.signal.aborted) return;
      saving = true;
      const changes = pending;
      pending = undefined;
      try {
        const remote = await api<Response>(path, {
          ...options, method: 'PATCH', body: { interfaceSettings: changes },
        });
        confirmed = remote.interfaceSettings;
        apply();
        scope.setIssue();
      } catch (failure) {
        pending = mergeInterfaceChanges(changes, pending ?? {});
        issue(failure);
        return;
      } finally {
        saving = false;
      }
      schedule();
    }

    function refresh() {
      if (ready && pending) schedule();
      else void load();
    }

    void load();
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    return () => {
      controller.abort();
      clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      scope.close();
    };
  }, [userId, token]);
}
