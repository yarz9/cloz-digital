// Toast notification system
const container = document.createElement('div');
container.className = 'toast-container';
document.body.appendChild(container);

function toast(message, type = 'info', duration = 3500) {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('fade-out');
    setTimeout(() => el.remove(), 200);
  }, duration);
}

window.toast = toast;
