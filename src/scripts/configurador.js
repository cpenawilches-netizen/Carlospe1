const app = document.querySelector('#inventory-app');
const cleanSupabaseUrl = (value) => value?.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabaseUrl = cleanSupabaseUrl(app?.dataset.supabaseUrl);
const supabaseAnonKey = app?.dataset.supabaseAnonKey;
const loginForm = document.querySelector('#login-form');
const productForm = document.querySelector('#product-form');
const inventoryPanel = document.querySelector('#inventory-panel');
const inventoryList = document.querySelector('#inventory-list');
const loginMessage = document.querySelector('#login-message');
const productMessage = document.querySelector('#product-message');
const logoutButton = document.querySelector('.admin-logout');
const refreshButton = document.querySelector('#refresh-products');
const recoveryButton = document.querySelector('#send-recovery-link');
const productFormTitle = document.querySelector('#product-form-title');
const productSubmit = document.querySelector('#product-submit');
const cancelEditButton = document.querySelector('#cancel-edit');

let session = JSON.parse(localStorage.getItem('induprot_session') || 'null');
let productCache = [];

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

const setEditingMode = (product = null) => {
  const isEditing = Boolean(product);
  productForm.elements.id.value = product?.id ?? '';
  productForm.elements.imagen_url_actual.value = product?.imagen_url ?? '';
  productForm.elements.imagen_hover_url_actual.value = product?.imagen_hover_url ?? '';
  productFormTitle.textContent = isEditing ? 'Editar producto' : 'Nuevo producto';
  productSubmit.textContent = isEditing ? 'Actualizar producto' : 'Guardar producto';
  cancelEditButton.hidden = !isEditing;
};

const fillProductForm = (product) => {
  productForm.elements.tipo_calzado_id.value = product.tipo_calzado_id;
  productForm.elements.etiqueta.value = product.etiqueta ?? '';
  productForm.elements.nombre.value = product.nombre ?? '';
  productForm.elements.descripcion.value = product.descripcion ?? '';
  productForm.elements.precio.value = product.precio ?? '';
  productForm.elements.color.value = product.color ?? '';
  productForm.elements.disponible.checked = Boolean(product.disponible);
  productForm.elements.destacado.checked = Boolean(product.destacado);
  setEditingMode(product);
  productForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const resetProductForm = () => {
  productForm.reset();
  productForm.elements.disponible.checked = true;
  setEditingMode();
};

const showLogin = () => {
  loginForm.hidden = false;
  productForm.hidden = true;
  inventoryPanel.hidden = true;
  logoutButton.hidden = true;
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
    '/rest/v1/productos?select=id,tipo_calzado_id,nombre,slug,descripcion,precio,color,etiqueta,imagen_url,imagen_hover_url,disponible,destacado,tipos_calzado(nombre)&order=created_at.desc',
    { headers: headers() },
  );

  productCache = products;

  inventoryList.innerHTML = products
    .map(
      (product) => `
        <article class="inventory-item" data-product-id="${product.id}">
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
          <div class="inventory-actions">
            <span class="status-pill">${product.disponible ? 'Activo' : 'Oculto'}</span>
            ${product.destacado ? '<span class="status-pill muted-pill">Destacado</span>' : ''}
            <button class="text-button" type="button" data-action="edit">Editar</button>
            <button class="text-button" type="button" data-action="toggle-visible">
              ${product.disponible ? 'Ocultar' : 'Activar'}
            </button>
            <button class="text-button" type="button" data-action="toggle-featured">
              ${product.destacado ? 'Quitar destacado' : 'Destacar'}
            </button>
            <button class="text-button danger-link" type="button" data-action="delete">Eliminar</button>
          </div>
        </article>
      `,
    )
    .join('') || '<p class="empty-state">Todavia no hay productos cargados.</p>';
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
    localStorage.removeItem('induprot_session');
    session = null;
    showLogin();
    setMessage(loginMessage, 'No se pudo iniciar sesion. Revisa el correo y la contrasena.', 'error');
    console.error(error);
  }
});

recoveryButton.addEventListener('click', async () => {
  const email = loginForm.elements.email.value.trim();

  if (!email) {
    setMessage(loginMessage, 'Escribe el correo primero.', 'error');
    return;
  }

  setMessage(loginMessage, 'Enviando enlace de recuperacion...');

  try {
    const redirectTo = `${window.location.origin}/restablecer-contrasena`;
    const recoverPath = `/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`;

    await apiFetch(recoverPath, {
      method: 'POST',
      headers: headers(false),
      body: JSON.stringify({ email }),
    });

    setMessage(loginMessage, 'Revisa el correo. El enlace abrira la pantalla para cambiar contrasena.', 'success');
  } catch (error) {
    setMessage(loginMessage, `No se pudo enviar: ${error.message}`, 'error');
    console.error(error);
  }
});

productForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const data = new FormData(productForm);
  const name = data.get('nombre').toString().trim();
  const productId = data.get('id');
  const isEditing = Boolean(productId);
  const currentProduct = productCache.find((product) => String(product.id) === String(productId));
  const slug = currentProduct?.slug ?? `${slugify(name)}-${Date.now()}`;

  setMessage(productMessage, isEditing ? 'Actualizando producto...' : 'Guardando producto...');

  try {
    const imageUrl = await uploadImage(data.get('imagen'), `${slug}-principal`);
    const hoverImageUrl = await uploadImage(data.get('imagen_hover'), `${slug}-alternativa`);
    const payload = {
      tipo_calzado_id: Number(data.get('tipo_calzado_id')),
      nombre: name,
      slug,
      descripcion: data.get('descripcion') || null,
      precio: data.get('precio') ? Number(data.get('precio')) : null,
      color: data.get('color') || null,
      etiqueta: data.get('etiqueta') || null,
      imagen_url: imageUrl || data.get('imagen_url_actual') || null,
      imagen_hover_url: hoverImageUrl || data.get('imagen_hover_url_actual') || null,
      disponible: data.get('disponible') === 'on',
      destacado: data.get('destacado') === 'on',
    };

    if (isEditing) {
      await apiFetch(`/rest/v1/productos?id=eq.${productId}`, {
        method: 'PATCH',
        headers: {
          ...headers(),
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(payload),
      });
    } else {
      await apiFetch('/rest/v1/productos', {
        method: 'POST',
        headers: {
          ...headers(),
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(payload),
      });
    }

    resetProductForm();
    setMessage(productMessage, isEditing ? 'Producto actualizado.' : 'Producto guardado.', 'success');
    await loadProducts();
  } catch (error) {
    setMessage(productMessage, `No se pudo guardar: ${error.message}`, 'error');
    console.error(error);
  }
});

inventoryList.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const item = button.closest('[data-product-id]');
  const product = productCache.find((entry) => String(entry.id) === item.dataset.productId);
  if (!product) return;

  const action = button.dataset.action;

  if (action === 'edit') {
    fillProductForm(product);
    return;
  }

  if (action === 'delete' && !window.confirm(`Eliminar "${product.nombre}" del catalogo?`)) {
    return;
  }

  try {
    if (action === 'toggle-visible') {
      await apiFetch(`/rest/v1/productos?id=eq.${product.id}`, {
        method: 'PATCH',
        headers: {
          ...headers(),
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ disponible: !product.disponible }),
      });
    }

    if (action === 'toggle-featured') {
      await apiFetch(`/rest/v1/productos?id=eq.${product.id}`, {
        method: 'PATCH',
        headers: {
          ...headers(),
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ destacado: !product.destacado }),
      });
    }

    if (action === 'delete') {
      await apiFetch(`/rest/v1/productos?id=eq.${product.id}`, {
        method: 'DELETE',
        headers: {
          ...headers(),
          Prefer: 'return=minimal',
        },
      });
    }

    await loadProducts();
    setMessage(productMessage, 'Inventario actualizado.', 'success');
  } catch (error) {
    setMessage(productMessage, `No se pudo actualizar: ${error.message}`, 'error');
    console.error(error);
  }
});

cancelEditButton.addEventListener('click', () => {
  resetProductForm();
  setMessage(productMessage, '');
});

logoutButton.addEventListener('click', () => {
  localStorage.removeItem('induprot_session');
  session = null;
  showLogin();
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
    session = null;
    showLogin();
  });
}
