const toggle = document.getElementById('team-toggle');
const members = document.getElementById('team-members');

toggle.addEventListener('click', () => {
  const expanded = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!expanded));
  members.hidden = expanded;
});
