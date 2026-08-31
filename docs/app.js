const launch = document.getElementById('launch');
const status = document.getElementById('status');

launch.addEventListener('click', () => {
  status.textContent = 'Sending launch request to Steam… If your browser asks for permission, allow it to open Steam.';
  window.location.href = 'steam://rungameid/1694600';

  window.setTimeout(() => {
    status.innerHTML = 'If nothing opened, make sure Steam and the game are installed, then <a href="https://store.steampowered.com/app/1694600/" target="_blank" rel="noreferrer">open the Steam page</a>.';
  }, 1800);
});
