import { registerSW } from 'virtual:pwa-register';

export function registerOfflinePlay() {
  const updateButton = document.getElementById('update-game') as HTMLButtonElement | null;
  const offlineStatus = document.getElementById('offline-status');
  if (!updateButton || !offlineStatus) return;

  const updateSW = registerSW({
    immediate: true,
    onOfflineReady() {
      offlineStatus.textContent = 'Ready to play offline';
      document.body.classList.add('offline-ready');
    },
    onNeedRefresh() {
      updateButton.hidden = false;
      updateButton.onclick = async () => {
        updateButton.disabled = true;
        offlineStatus.textContent = 'Updating game…';
        const timeout = window.setTimeout(() => {
          updateButton.disabled = false;
          offlineStatus.textContent = 'Update did not finish. Try again or close all game tabs and reopen.';
          console.error('Little Roamer update: timed out waiting for the new service worker.');
        }, 20_000);
        try {
          await updateSW(true);
        } catch (error) {
          window.clearTimeout(timeout);
          updateButton.disabled = false;
          offlineStatus.textContent = 'Update failed. Please try again.';
          console.error('Little Roamer update:', error);
        }
      };
    },
    onRegisterError(error) {
      console.error('Little Roamer offline setup:', error);
      offlineStatus.textContent = 'Offline setup needs an HTTPS connection';
    },
  });
}
