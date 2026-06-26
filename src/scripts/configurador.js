const app = document.querySelector('#inventory-app');
const supabaseUrl = app?.dataset.supabaseUrl;
const supabaseAnonKey = app?.dataset.supabaseAnonKey;
const loginForm = document.querySelector('#login-form');
const productForm = document.querySelector('#product-form');
const inventoryPanel = document.querySelector('#inventory-panel');
const inventoryList = document.querySelector('#inventory-list');
const loginMessage = document.querySelector('#login-message');
const productMessage = document.querySelector('#product-message');
const logoutButton = document.querySelector('.admin-logout');
const refreshButton = document.querySelector('#refresh-products');

let session = JSON.parse(localStorage.getItem('induprot_session') || 'null');

const headers = (authenticated = true) => ({
  apikey: supabaseAnonKey,
  Authorization: `Bearer ${authenticated && session?.access_token ? session.access_token : supabaseAnonKey}`,
  'Content-Type': 'application/json',
});

const slugify = (value) =>
  value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const formatPrice = (value) => {
  if (!value) return 'Cotizar';

  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value));
};

const setMessage = (element, text, type = '') => {
  element.textContent = text;
  element.dataset.type = type;
};

const apiFetch = async (path, options = {}) => {
  const response = await fetch(`${supabaseUrl}${path}`, options);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Solicitud rechazada por Supabase');
  }

  if (response.status === 204) return null;

  return response.json();
};

const loadTypes = async () => {
  const types = await apiFetch(
    '/rest/v1/tipos_calzado?select=id,nombre,slug&activo=eq.true&order=orden.asc',
    { headers: headers() },
  );

  const select = productForm.elements.tipo_calzado_id;
  select.innerHTML = types
    .map((type) => `<option value="${type.id}">${type.nombre}</option>`)
    .join('');
};

const loadProducts = async () => {
  const products = await apiFetch(
    '/rest/v1/productos?select=id,nombre,precio,color,etiqueta,imagen_url,disponible,destacado,tipos_calzado(nombre)&order=created_at.desc',
    { headers: headers() },
  );

  inventoryList.innerHTML = products
    .map(
      (product) => `
        <article class="inventory-item">
          <div class="inventory-thumb">
            ${
              product.imagen_url
                ? `<img src="${product.imagen_url}" alt="${product.nombre}" loading="lazy" />`
                : '<span></span>'
            }
          </div>
          <div>
            <strong>${product.nombre}</strong>
            <p>${product.tipos_calzado?.nombre ?? 'Sin tipo'} · ${product.color ?? 'Sin color'}</p>
            <p>${product.etiqueta ?? 'Producto'} · ${formatPrice(product.precio)}</p>
          </div>
          <span class="status-pill">${product.disponible ? 'Disponible' : 'Oculto'}</span>
        </article>
      `,
    )
    .join('');
};

const showDashboard = async () => {
  loginForm.hidden = true;
  productForm.hidden = false;
  inventoryPanel.hidden = false;
  logoutButton.hidden = false;
  await loadTypes();
  await loadProducts();
};

const uploadImage = async (file, slug) => {
  if (!file) return null;

  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${slug}-${Date.now()}.${extension}`;
  const response = await fetch(`${supabaseUrl}/storage/v1/object/productos/${path}`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': file.type || 'application/octet-stream',
      'x-upsert': 'false',
    },
    body: file,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'No se pudo subir la imagen');
  }

  return `${supabaseUrl}/storage/v1/object/public/productos/${path}`;
};

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(loginMessage, 'Entrando...');

  const data = new FormData(loginForm);

  try {
    session = await apiFetch('/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: headers(false),
      body: JSON.stringify({
        email: data.get('email'),
        password: data.get('password'),
      }),
    });

    localStorage.setItem('induprot_session', JSON.stringify(session));
    setMessage(loginMessage, '');
    await showDashboard();
  } catch (error) {
    setMessage(loginMessage, 'No se pudo iniciar sesion. Revisa el correo y la contrasena.', 'error');
    console.error(error);
  }
});

productForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(productMessage, 'Guardando producto...');

  const data = new FormData(productForm);
  const name = data.get('nombre').toString().trim();
  const slug = `${slugify(name)}-${Date.now()}`;

  try {
    const imageUrl = await uploadImage(data.get('imagen'), slug);

    await apiFetch('/rest/v1/productos', {
      method: 'POST',
      headers: {
        ...headers(),
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        tipo_calzado_id: Number(data.get('tipo_calzado_id')),
        nombre: name,
        slug,
        descripcion: data.get('descripcion') || null,
        precio: data.get('precio') ? Number(data.get('precio')) : null,
        color: data.get('color') || null,
        etiqueta: data.get('etiqueta') || null,
        imagen_url: imageUrl,
        disponible: data.get('disponible') === 'on',
        destacado: data.get('destacado') === 'on',
      }),
    });

    productForm.reset();
    productForm.elements.disponible.checked = true;
    setMessage(productMessage, 'Producto guardado.', 'success');
    await loadProducts();
  } catch (error) {
    setMessage(productMessage, 'No se pudo guardar. Revisa permisos, bucket y datos.', 'error');
    console.error(error);
  }
});

logoutButton.addEventListener('click', () => {
  localStorage.removeItem('induprot_session');
  session = null;
  loginForm.hidden = false;
  productForm.hidden = true;
  inventoryPanel.hidden = true;
  logoutButton.hidden = true;
});

refreshButton.addEventListener('click', () => {
  loadProducts().catch(console.error);
});

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'undefined' || supabaseAnonKey === 'undefined') {
  setMessage(loginMessage, 'Faltan variables PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY.', 'error');
} else if (session?.access_token) {
  showDashboard().catch((error) => {
    console.error(error);
    localStorage.removeItem('induprot_session');
  });
}
