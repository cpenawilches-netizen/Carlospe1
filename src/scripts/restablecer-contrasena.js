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

const getRecoverySession = () => {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const queryParams = new URLSearchParams(window.location.search);

  return {
    accessToken: hashParams.get('access_token') || queryParams.get('access_token'),
    refreshToken: hashParams.get('refresh_token') || queryParams.get('refresh_token'),
    type: hashParams.get('type') || queryParams.get('type'),
  };
};

const recoverySession = getRecoverySession();

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'undefined' || supabaseAnonKey === 'undefined') {
  setMessage('Faltan variables PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY.', 'error');
} else if (!recoverySession.accessToken) {
  setMessage(
    'Abre esta pagina desde el enlace de recuperacion que llega al correo. Si el enlace ya vencio, solicita uno nuevo.',
    'error',
  );
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const data = new FormData(form);
  const password = data.get('password')?.toString() ?? '';
  const confirmPassword = data.get('confirm_password')?.toString() ?? '';

  if (!recoverySession.accessToken) {
    setMessage('No hay token de recuperacion. Solicita un nuevo enlace desde Supabase.', 'error');
    return;
  }

  if (password !== confirmPassword) {
    setMessage('Las contrasenas no coinciden.', 'error');
    return;
  }

  setMessage('Guardando nueva contrasena...');

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${recoverySession.accessToken}`,
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
    setMessage('No se pudo cambiar la contrasena. Solicita otro enlace e intenta de nuevo.', 'error');
  }
});
