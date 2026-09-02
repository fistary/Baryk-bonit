const $ = selector => document.querySelector(selector);
const config = window.BARYTON_CONFIG || {};
const configured = config.supabaseUrl?.startsWith('https://') && !config.supabasePublishableKey?.startsWith('DOPLN_');
let supabaseClient = null;
let state = { names: { mine: 'Já', friend: 'Kolega' }, events: [] };
let editor = false;

if (configured) {
  supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
  start();
} else {
  $('#events').innerHTML = '<p class="empty-state">Aplikace ještě není připojená k databázi. Dokonči nastavení podle README.</p>';
}

async function start() {
  await refresh();
  supabaseClient.auth.onAuthStateChange(() => refresh());
}
async function refresh() {
  const [{ data: events, error: eventsError }, { data: settings, error: settingsError }, { data: userData }] = await Promise.all([
    supabaseClient.from('events').select('*').order('date'),
    supabaseClient.from('plan_settings').select('*').eq('id', true).single(),
    supabaseClient.auth.getUser()
  ]);
  if (eventsError || settingsError) return showError('Nepodařilo se načíst plán. Zkontroluj připojení k databázi.');
  state.events = events;
  state.names = { mine: settings.mine_name, friend: settings.friend_name };
  editor = false;
  if (userData.user) {
    const { data } = await supabaseClient.rpc('is_editor');
    editor = data === true;
  }
  render();
}
function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function playerLabel(player) { return player === 'mine' ? state.names.mine : player === 'friend' ? state.names.friend : 'K domluvě'; }
function safe(value) { return String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' })[char]); }
function dateParts(date) { const d = new Date(`${date}T12:00:00`); return { day: d.getDate(), month: new Intl.DateTimeFormat('cs-CZ', { month: 'short' }).format(d).replace('.', ''), weekday: new Intl.DateTimeFormat('cs-CZ', { weekday: 'long' }).format(d) }; }
function showError(message) { $('#events').innerHTML = `<p class="empty-state">${safe(message)}</p>`; }
function toast(message) { const element = $('#toast'); element.textContent = message; element.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => element.classList.remove('show'), 2800); }
function eventMarkup(event, played = false) {
  const { day, month, weekday } = dateParts(event.date);
  const assignment = editor ? `<button class="assignment ${event.player}" type="button" data-edit="${event.id}">${safe(playerLabel(event.player))}</button>` : `<span class="assignment ${event.player}">${safe(playerLabel(event.player))}</span>`;
  return `<article class="event${played ? ' event-played' : ''}"><div class="date-block"><div class="date-day">${day}</div><div class="date-month">${month}</div><div class="date-weekday">${safe(weekday)}</div></div><div><h2>${safe(event.place)}</h2><p>${safe(event.title)}</p>${event.note ? `<p class="note">${safe(event.note)}</p>` : ''}</div>${assignment}</article>`;
}

function render() {
  const upcoming = state.events.filter(event => event.date >= today());
  const played = state.events.filter(event => event.date < today()).reverse();
  const counts = { all: state.events.length, mine: 0, friend: 0, open: 0 };
  state.events.forEach(event => counts[event.player]++);
  Object.entries(counts).forEach(([key, count]) => $(`#count-${key}`).textContent = count);
  $('#mine-label').textContent = state.names.mine; $('#friend-label').textContent = state.names.friend;
  $('#player-option-mine').textContent = state.names.mine; $('#player-option-friend').textContent = state.names.friend;
  document.querySelectorAll('.admin-only').forEach(element => element.hidden = !editor);
  $('#login-button').hidden = editor;
  $('#events').innerHTML = upcoming.map(event => eventMarkup(event)).join('') + (played.length ? `<div class="played-divider"><span>Odehráno</span></div>${played.map(event => eventMarkup(event, true)).join('')}` : '');
  $('#empty-state').hidden = state.events.length > 0;
}
function openEvent(event = null) {
  if (!editor) return;
  $('#event-dialog-title').textContent = event ? 'Upravit termín' : 'Přidat termín';
  $('#event-id').value = event?.id || ''; $('#event-date').value = event?.date || ''; $('#event-place').value = event?.place || ''; $('#event-title').value = event?.title || ''; $('#event-player').value = event?.player || 'open'; $('#event-note').value = event?.note || ''; $('#delete-event').hidden = !event;
  $('#event-dialog').showModal();
}
function eventFromClick(event) { const button = event.target.closest('[data-edit]'); if (button) openEvent(state.events.find(item => item.id === button.dataset.edit)); }

$('#add-event').addEventListener('click', () => openEvent());
$('#events').addEventListener('click', eventFromClick);
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => document.getElementById(button.dataset.close).close()));
$('#event-form').addEventListener('submit', async event => {
  event.preventDefault(); if (!editor) return;
  const data = new FormData(event.currentTarget); const record = { date: data.get('date'), place: data.get('place').trim(), title: data.get('title').trim(), player: data.get('player'), note: data.get('note').trim() };
  const id = data.get('id'); const query = id ? supabaseClient.from('events').update(record).eq('id', id) : supabaseClient.from('events').insert(record); const { error } = await query;
  if (error) return toast('Uložení se nepodařilo.'); $('#event-dialog').close(); await refresh(); toast('Termín uložen.');
});
$('#delete-event').addEventListener('click', async () => { if (!editor || !confirm('Opravdu tento termín smazat?')) return; const { error } = await supabaseClient.from('events').delete().eq('id', $('#event-id').value); if (error) return toast('Smazání se nepodařilo.'); $('#event-dialog').close(); await refresh(); });
$('#settings-button').addEventListener('click', () => { $('#settings-mine').value = state.names.mine; $('#settings-friend').value = state.names.friend; $('#settings-dialog').showModal(); });
$('#settings-form').addEventListener('submit', async event => { event.preventDefault(); const data = new FormData(event.currentTarget); const { error } = await supabaseClient.from('plan_settings').update({ mine_name: data.get('mine').trim(), friend_name: data.get('friend').trim() }).eq('id', true); if (error) return toast('Nastavení se nepodařilo uložit.'); $('#settings-dialog').close(); await refresh(); });
function clearLoginForm() {
  $('#login-form').reset();
  $('#login-username').value = '';
  $('#login-password').value = '';
}
$('#login-button').addEventListener('click', () => { clearLoginForm(); $('#login-dialog').showModal(); });
$('#login-dialog').addEventListener('close', clearLoginForm);
$('#login-form').addEventListener('submit', async event => {
  event.preventDefault();
  const submitButton = event.currentTarget.querySelector('[type="submit"]');
  submitButton.disabled = true;
  const username = $('#login-username').value.trim().toLowerCase();
  if (username !== config.adminUsername?.toLowerCase() || !config.adminEmail) { submitButton.disabled = false; return toast('Nesprávné uživatelské jméno nebo heslo.'); }
  const { error } = await supabaseClient.auth.signInWithPassword({ email: config.adminEmail, password: $('#login-password').value });
  submitButton.disabled = false;
  if (error) return toast('Nesprávné uživatelské jméno nebo heslo.');
  clearLoginForm();
  if ($('#login-dialog').open) $('#login-dialog').close();
  toast('Přihlášení proběhlo úspěšně.');
});
$('#password-button').addEventListener('click', () => $('#password-dialog').showModal());
$('#password-form').addEventListener('submit', async event => {
  event.preventDefault();
  const password = $('#new-password').value;
  if (password !== $('#new-password-confirm').value) return toast('Zadaná hesla se neshodují.');
  const { error } = await supabaseClient.auth.updateUser({ password });
  if (error) return toast(`Heslo se nepodařilo uložit: ${error.message}`);
  event.currentTarget.reset(); $('#password-dialog').close(); toast('Nové heslo bylo uloženo.');
});
$('#logout-button').addEventListener('click', () => supabaseClient.auth.signOut());
$('#pdf-button').addEventListener('click', () => window.print());
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js');
