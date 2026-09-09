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
      updateButton.addEventListener('click', () => void updateSW(true), { once: true });
    },
    onRegisterError(error) {
      console.error('Little Roamer offline setup:', error);
      offlineStatus.textContent = 'Offline setup needs an HTTPS connection';
    },
  });
}
