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
    supabaseClient.from('events').select('*').gte('date', today()).order('date'),
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
function dateParts(date) { const d = new Date(`${date}T12:00:00`); return { day: d.getDate(), month: new Intl.DateTimeFormat('cs-CZ', { month: 'short' }).format(d).replace('.', '') }; }
function showError(message) { $('#events').innerHTML = `<p class="empty-state">${safe(message)}</p>`; }
function toast(message) { const element = $('#toast'); element.textContent = message; element.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => element.classList.remove('show'), 2800); }

function render() {
  const counts = { all: state.events.length, mine: 0, friend: 0, open: 0 };
  state.events.forEach(event => counts[event.player]++);
  Object.entries(counts).forEach(([key, count]) => $(`#count-${key}`).textContent = count);
  $('#mine-label').textContent = state.names.mine; $('#friend-label').textContent = state.names.friend;
  document.querySelectorAll('.admin-only').forEach(element => element.hidden = !editor);
  $('#login-button').hidden = editor;
  $('#events').innerHTML = state.events.map(event => {
    const { day, month } = dateParts(event.date);
    const assignment = editor ? `<button class="assignment ${event.player}" type="button" data-edit="${event.id}">${safe(playerLabel(event.player))}</button>` : `<span class="assignment ${event.player}">${safe(playerLabel(event.player))}</span>`;
    return `<article class="event"><div class="date-block"><div class="date-day">${day}</div><div class="date-month">${month}</div></div><div><h2>${safe(event.place)}</h2><p>${safe(event.title)}</p>${event.note ? `<p class="note">${safe(event.note)}</p>` : ''}</div>${assignment}</article>`;
  }).join('');
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
$('#login-button').addEventListener('click', () => $('#login-dialog').showModal());
$('#login-form').addEventListener('submit', async event => { event.preventDefault(); const { error } = await supabaseClient.auth.signInWithOtp({ email: $('#login-email').value, options: { emailRedirectTo: location.href } }); if (error) return toast(`E-mail se nepodařilo odeslat: ${error.message}`); $('#login-dialog').close(); toast('Odkaz k přihlášení byl odeslán e-mailem.'); });
$('#logout-button').addEventListener('click', () => supabaseClient.auth.signOut());
$('#pdf-button').addEventListener('click', () => window.print());
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js');
