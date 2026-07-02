const app = document.querySelector('#reset-password-app');
const form = document.querySelector('#reset-password-form');
const message = document.querySelector('#reset-password-message');
const cleanSupabaseUrl = (value) => value?.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabaseUrl = cleanSupabaseUrl(app?.dataset.supabaseUrl);
const supabaseAnonKey = app?.dataset.supabaseAnonKey;

const setMessage = (text, type = '') => {
  message.textContent = text;
  message.dataset.type = type;
};

const getRecoveryParams = () => {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const queryParams = new URLSearchParams(window.location.search);

  return {
    accessToken: hashParams.get('access_token') || queryParams.get('access_token'),
    refreshToken: hashParams.get('refresh_token') || queryParams.get('refresh_token'),
    tokenHash: hashParams.get('token_hash') || queryParams.get('token_hash'),
    code: hashParams.get('code') || queryParams.get('code'),
    type: hashParams.get('type') || queryParams.get('type'),
    errorDescription:
      hashParams.get('error_description') || queryParams.get('error_description'),
  };
};

const recoveryParams = getRecoveryParams();
let accessToken = recoveryParams.accessToken;

const authHeaders = {
  apikey: supabaseAnonKey,
  Authorization: `Bearer ${supabaseAnonKey}`,
  'Content-Type': 'application/json',
};

const readAuthResponse = async (response) => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error_description || payload.msg || payload.message || 'Enlace rechazado');
  }
  return payload;
};

const createRecoverySession = async () => {
  if (accessToken) return;

  if (recoveryParams.errorDescription) {
    throw new Error(recoveryParams.errorDescription.replaceAll('+', ' '));
  }

  if (recoveryParams.tokenHash) {
    const response = await fetch(`${supabaseUrl}/auth/v1/verify`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        token_hash: recoveryParams.tokenHash,
        type: recoveryParams.type || 'recovery',
      }),
    });
    const session = await readAuthResponse(response);
    accessToken = session.access_token;
    return;
  }

  if (recoveryParams.code) {
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=pkce`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ auth_code: recoveryParams.code }),
    });
    const session = await readAuthResponse(response);
    accessToken = session.access_token;
    return;
  }

  throw new Error('El enlace no contiene un codigo de recuperacion.');
};

const initializeRecovery = async () => {
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'undefined' || supabaseAnonKey === 'undefined') {
    setMessage('Faltan variables PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY.', 'error');
    return;
  }

  try {
    await createRecoverySession();
    setMessage('Enlace verificado. Ya puedes crear tu nueva contrasena.', 'success');
  } catch (error) {
    setMessage(`No se pudo validar el enlace: ${error.message}`, 'error');
  }
};

initializeRecovery();

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const data = new FormData(form);
  const password = data.get('password')?.toString() ?? '';
  const confirmPassword = data.get('confirm_password')?.toString() ?? '';

  if (password !== confirmPassword) {
    setMessage('Las contrasenas no coinciden.', 'error');
    return;
  }

  setMessage('Guardando nueva contrasena...');

  try {
    await createRecoverySession();

    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Supabase rechazo el cambio de contrasena');
    }

    setMessage('Contrasena actualizada. Ya puedes entrar al configurador.', 'success');
    window.history.replaceState({}, document.title, window.location.pathname);
    form.reset();

    setTimeout(() => {
      window.location.href = '/configurador';
    }, 1800);
  } catch (error) {
    console.error(error);
    setMessage(`No se pudo cambiar la contrasena: ${error.message}`, 'error');
  }
});
