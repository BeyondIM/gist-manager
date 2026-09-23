// Cloudflare Worker — GitHub Gist Manager
// Serves the SPA, stores the GitHub token in an httpOnly cookie, proxies API calls.

const COOKIE_NAME = 'gh_token';
const GITHUB_API = 'https://api.github.com';

function getToken(request) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setTokenCookie(headers, token) {
  headers.append('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=31536000`);
}

function clearTokenCookie(headers) {
  headers.append('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
}

async function proxyApi(request, path) {
  const token = getToken(request);
  if (!token) {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const url = GITHUB_API + path + (request.url.includes('?') ? '?' + request.url.split('?')[1] : '');
  const headers = new Headers();
  headers.set('Authorization', `token ${token}`);
  headers.set('Accept', 'application/vnd.github+json');
  headers.set('X-GitHub-Api-Version', '2022-11-28');
  headers.set('User-Agent', 'gist-manager');

  let body = null;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = await request.text();
    if (body) headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, { method: request.method, headers, body });
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
}

async function handleLogin(request) {
  let token;
  try {
    const body = await request.json();
    token = body.token;
  } catch {
    return new Response(JSON.stringify({ message: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!token) {
    return new Response(JSON.stringify({ message: 'Token required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const check = await fetch(`${GITHUB_API}/user`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'gist-manager',
    },
  });
  if (!check.ok) {
    const err = await check.json().catch(() => ({}));
    return new Response(
      JSON.stringify({ message: err.message || `GitHub API error: ${check.status}` }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
  const res = new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
  setTokenCookie(res.headers, token);
  return res;
}

function handleLogout() {
  const res = new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
  clearTokenCookie(res.headers);
  return res;
}

/* ── Inline HTML ──────────────────────────────────── */
const HTML = `<!DOCTYPE html>
<html lang="zh-CN" class="h-full">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GitHub Gist Manager</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<!-- Highlight.js GitHub Dark CSS -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
<!-- Highlight.js Core Bundle -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"><\/script>
<style>
/*! tailwindcss v4.2.4 | MIT License | https://tailwindcss.com */
@layer properties{@supports (((-webkit-hyphens:none)) and (not (margin-trim:inline))) or ((-moz-orient:inline) and (not (color:rgb(from red r g b)))){*,:before,:after,::backdrop{--tw-translate-x:0;--tw-translate-y:0;--tw-translate-z:0;--tw-rotate-x:initial;--tw-rotate-y:initial;--tw-rotate-z:initial;--tw-skew-x:initial;--tw-skew-y:initial;--tw-space-y-reverse:0;--tw-divide-y-reverse:0;--tw-border-style:solid;--tw-leading:initial;--tw-font-weight:initial;--tw-shadow:0 0 #0000;--tw-shadow-color:initial;--tw-shadow-alpha:100%;--tw-inset-shadow:0 0 #0000;--tw-inset-shadow-color:initial;--tw-inset-shadow-alpha:100%;--tw-ring-color:initial;--tw-ring-shadow:0 0 #0000;--tw-inset-ring-color:initial;--tw-inset-ring-shadow:0 0 #0000;--tw-ring-inset:initial;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-offset-shadow:0 0 #0000;--tw-duration:initial}}}@layer theme{:root,:host{--font-sans:ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";--font-mono:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;--color-red-400:oklch(70.4% .191 22.216);--color-red-600:oklch(57.7% .245 27.325);--color-red-700:oklch(50.5% .213 27.518);--color-yellow-400:oklch(85.2% .199 91.936);--color-yellow-500:oklch(79.5% .184 86.047);--color-green-600:oklch(62.7% .194 149.214);--color-green-700:oklch(52.7% .154 150.069);--color-blue-400:oklch(70.7% .165 254.624);--color-blue-500:oklch(62.3% .214 259.815);--color-blue-600:oklch(54.6% .245 262.881);--color-blue-700:oklch(48.8% .243 264.376);--color-gray-100:oklch(96.7% .003 264.542);--color-gray-200:oklch(92.8% .006 264.531);--color-gray-300:oklch(87.2% .01 258.338);--color-gray-400:oklch(70.7% .022 261.325);--color-gray-500:oklch(55.1% .027 264.364);--color-gray-600:oklch(44.6% .03 256.802);--color-gray-700:oklch(37.3% .034 259.733);--color-gray-800:oklch(27.8% .033 256.848);--color-gray-900:oklch(21% .034 264.665);--color-gray-950:oklch(13% .028 261.692);--color-black:#000;--color-white:#fff;--spacing:.25rem;--container-sm:24rem;--container-md:28rem;--text-xs:.75rem;--text-xs--line-height:calc(1 / .75);--text-sm:.875rem;--text-sm--line-height:calc(1.25 / .875);--text-xl:1.25rem;--text-xl--line-height:calc(1.75 / 1.25);--font-weight-medium:500;--font-weight-semibold:600;--leading-relaxed:1.625;--radius-md:.375rem;--radius-lg:.5rem;--radius-xl:.75rem;--animate-spin:spin 1s linear infinite;--default-transition-duration:.15s;--default-transition-timing-function:cubic-bezier(.4, 0, .2, 1);--default-font-family:var(--font-sans);--default-mono-font-family:var(--font-mono)}}@layer base{*,:after,:before,::backdrop{box-sizing:border-box;border:0 solid;margin:0;padding:0}::file-selector-button{box-sizing:border-box;border:0 solid;margin:0;padding:0}html,:host{-webkit-text-size-adjust:100%;tab-size:4;line-height:1.5;font-family:var(--default-font-family,ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji");font-feature-settings:var(--default-font-feature-settings,normal);font-variation-settings:var(--default-font-variation-settings,normal);-webkit-tap-highlight-color:transparent}hr{height:0;color:inherit;border-top-width:1px}abbr:where([title]){-webkit-text-decoration:underline dotted;text-decoration:underline dotted}h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}a{color:inherit;-webkit-text-decoration:inherit;-webkit-text-decoration:inherit;-webkit-text-decoration:inherit;text-decoration:inherit}b,strong{font-weight:bolder}code,kbd,samp,pre{font-family:var(--default-mono-font-family,ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace);font-feature-settings:var(--default-mono-font-feature-settings,normal);font-variation-settings:var(--default-mono-font-variation-settings,normal);font-size:1em}small{font-size:80%}sub,sup{vertical-align:baseline;font-size:75%;line-height:0;position:relative}sub{bottom:-.25em}sup{top:-.5em}table{text-indent:0;border-color:inherit;border-collapse:collapse}:-moz-focusring{outline:auto}progress{vertical-align:baseline}summary{display:list-item}ol,ul,menu{list-style:none}img,svg,video,canvas,audio,iframe,embed,object{vertical-align:middle;display:block}img,video{max-width:100%;height:auto}button,input,select,optgroup,textarea{font:inherit;font-feature-settings:inherit;font-variation-settings:inherit;letter-spacing:inherit;color:inherit;opacity:1;background-color:#0000;border-radius:0}::file-selector-button{font:inherit;font-feature-settings:inherit;font-variation-settings:inherit;letter-spacing:inherit;color:inherit;opacity:1;background-color:#0000;border-radius:0}:where(select:is([multiple],[size])) optgroup{font-weight:bolder}:where(select:is([multiple],[size])) optgroup option{padding-inline-start:20px}::file-selector-button{margin-inline-end:4px}::placeholder{opacity:1}@supports (not ((-webkit-appearance:-apple-pay-button))) or (contain-intrinsic-size:1px){::placeholder{color:currentColor}@supports (color:color-mix(in lab, red, red)){::placeholder{color:color-mix(in oklab, currentcolor 50%, transparent)}}}textarea{resize:vertical}::-webkit-search-decoration{-webkit-appearance:none}::-webkit-date-and-time-value{min-height:1lh;text-align:inherit}::-webkit-datetime-edit{display:inline-flex}::-webkit-datetime-edit-fields-wrapper{padding:0}::-webkit-datetime-edit{padding-block:0}::-webkit-datetime-edit-year-field{padding-block:0}::-webkit-datetime-edit-month-field{padding-block:0}::-webkit-datetime-edit-day-field{padding-block:0}::-webkit-datetime-edit-hour-field{padding-block:0}::-webkit-datetime-edit-minute-field{padding-block:0}::-webkit-datetime-edit-second-field{padding-block:0}::-webkit-datetime-edit-millisecond-field{padding-block:0}::-webkit-datetime-edit-meridiem-field{padding-block:0}::-webkit-calendar-picker-indicator{line-height:1}:-moz-ui-invalid{box-shadow:none}button,input:where([type=button],[type=reset],[type=submit]){appearance:button}::file-selector-button{appearance:button}::-webkit-inner-spin-button{height:auto}::-webkit-outer-spin-button{height:auto}[hidden]:where(:not([hidden=until-found])){display:none!important}}@layer components;@layer utilities{.pointer-events-none{pointer-events:none}.absolute{position:absolute}.fixed{position:fixed}.relative{position:relative}.static{position:static}.inset-0{inset:calc(var(--spacing) * 0)}.right-4{right:calc(var(--spacing) * 4)}.bottom-4{bottom:calc(var(--spacing) * 4)}.z-20{z-index:20}.z-50{z-index:50}.mx-4{margin-inline:calc(var(--spacing) * 4)}.mx-auto{margin-inline:auto}.mt-0\\.5{margin-top:calc(var(--spacing) * .5)}.mt-1{margin-top:calc(var(--spacing) * 1)}.mt-1\\.5{margin-top:calc(var(--spacing) * 1.5)}.mt-2{margin-top:calc(var(--spacing) * 2)}.mb-1{margin-bottom:calc(var(--spacing) * 1)}.mb-1\\.5{margin-bottom:calc(var(--spacing) * 1.5)}.mb-3{margin-bottom:calc(var(--spacing) * 3)}.mb-4{margin-bottom:calc(var(--spacing) * 4)}.mb-6{margin-bottom:calc(var(--spacing) * 6)}.ml-7{margin-left:calc(var(--spacing) * 7)}.flex{display:flex}.hidden{display:none}.inline{display:inline}.h-3{height:calc(var(--spacing) * 3)}.h-3\\.5{height:calc(var(--spacing) * 3.5)}.h-4{height:calc(var(--spacing) * 4)}.h-5{height:calc(var(--spacing) * 5)}.h-8{height:calc(var(--spacing) * 8)}.h-12{height:calc(var(--spacing) * 12)}.h-16{height:calc(var(--spacing) * 16)}.h-full{height:100%}.w-3{width:calc(var(--spacing) * 3)}.w-3\\.5{width:calc(var(--spacing) * 3.5)}.w-4{width:calc(var(--spacing) * 4)}.w-5{width:calc(var(--spacing) * 5)}.w-8{width:calc(var(--spacing) * 8)}.w-12{width:calc(var(--spacing) * 12)}.w-16{width:calc(var(--spacing) * 16)}.w-28{width:calc(var(--spacing) * 28)}.w-72{width:calc(var(--spacing) * 72)}.w-full{width:100%}.max-w-md{max-width:var(--container-md)}.max-w-sm{max-width:var(--container-sm)}.flex-1{flex:1}.shrink-0{flex-shrink:0}.translate-y-20{--tw-translate-y:calc(var(--spacing) * 20);translate:var(--tw-translate-x) var(--tw-translate-y)}.transform{transform:var(--tw-rotate-x,) var(--tw-rotate-y,) var(--tw-rotate-z,) var(--tw-skew-x,) var(--tw-skew-y,)}.animate-spin{animation:var(--animate-spin)}.cursor-not-allowed{cursor:not-allowed}.cursor-pointer{cursor:pointer}.resize-none{resize:none}.flex-col{flex-direction:column}.items-center{align-items:center}.justify-between{justify-content:space-between}.justify-center{justify-content:center}.justify-end{justify-content:flex-end}.gap-0{gap:calc(var(--spacing) * 0)}.gap-0\\.5{gap:calc(var(--spacing) * .5)}.gap-1{gap:calc(var(--spacing) * 1)}.gap-1\\.5{gap:calc(var(--spacing) * 1.5)}.gap-2{gap:calc(var(--spacing) * 2)}.gap-3{gap:calc(var(--spacing) * 3)}:where(.space-y-4>:not(:last-child)){--tw-space-y-reverse:0;margin-block-start:calc(calc(var(--spacing) * 4) * var(--tw-space-y-reverse));margin-block-end:calc(calc(var(--spacing) * 4) * calc(1 - var(--tw-space-y-reverse)))}:where(.divide-y>:not(:last-child)){--tw-divide-y-reverse:0;border-bottom-style:var(--tw-border-style);border-top-style:var(--tw-border-style);border-top-width:calc(1px * var(--tw-divide-y-reverse));border-bottom-width:calc(1px * calc(1 - var(--tw-divide-y-reverse)))}:where(.divide-gray-800>:not(:last-child)){border-color:var(--color-gray-800)}.truncate{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.overflow-auto{overflow:auto}.overflow-hidden{overflow:hidden}.overflow-x-auto{overflow-x:auto}.overflow-y-auto{overflow-y:auto}.rounded{border-radius:.25rem}.rounded-full{border-radius:3.40282e38px}.rounded-lg{border-radius:var(--radius-lg)}.rounded-md{border-radius:var(--radius-md)}.rounded-xl{border-radius:var(--radius-xl)}.border{border-style:var(--tw-border-style);border-width:1px}.border-t{border-top-style:var(--tw-border-style);border-top-width:1px}.border-r{border-right-style:var(--tw-border-style);border-right-width:1px}.border-b{border-bottom-style:var(--tw-border-style);border-bottom-width:1px}.border-b-2{border-bottom-style:var(--tw-border-style);border-bottom-width:2px}.border-none{--tw-border-style:none;border-style:none}.border-blue-500{border-color:var(--color-blue-500)}.border-gray-700{border-color:var(--color-gray-700)}.border-gray-800{border-color:var(--color-gray-800)}.border-gray-800\\/50{border-color:#1e293980}@supports (color:color-mix(in lab, red, red)){.border-gray-800\\/50{border-color:color-mix(in oklab, var(--color-gray-800) 50%, transparent)}}.border-transparent{border-color:#0000}.bg-black\\/70{background-color:#000000b3}@supports (color:color-mix(in lab, red, red)){.bg-black\\/70{background-color:color-mix(in oklab, var(--color-black) 70%, transparent)}}.bg-blue-600{background-color:var(--color-blue-600)}.bg-gray-700{background-color:var(--color-gray-700)}.bg-gray-800{background-color:var(--color-gray-800)}.bg-gray-900{background-color:var(--color-gray-900)}.bg-gray-950{background-color:var(--color-gray-950)}.bg-gray-950\\/80{background-color:#030712cc}@supports (color:color-mix(in lab, red, red)){.bg-gray-950\\/80{background-color:color-mix(in oklab, var(--color-gray-950) 80%, transparent)}}.bg-green-600{background-color:var(--color-green-600)}.bg-green-700{background-color:var(--color-green-700)}.bg-red-600{background-color:var(--color-red-600)}.bg-transparent{background-color:#0000}.p-3{padding:calc(var(--spacing) * 3)}.p-4{padding:calc(var(--spacing) * 4)}.p-6{padding:calc(var(--spacing) * 6)}.px-1{padding-inline:calc(var(--spacing) * 1)}.px-2{padding-inline:calc(var(--spacing) * 2)}.px-3{padding-inline:calc(var(--spacing) * 3)}.px-4{padding-inline:calc(var(--spacing) * 4)}.py-1{padding-block:calc(var(--spacing) * 1)}.py-1\\.5{padding-block:calc(var(--spacing) * 1.5)}.py-2{padding-block:calc(var(--spacing) * 2)}.py-2\\.5{padding-block:calc(var(--spacing) * 2.5)}.py-3{padding-block:calc(var(--spacing) * 3)}.py-12{padding-block:calc(var(--spacing) * 12)}.pb-2{padding-bottom:calc(var(--spacing) * 2)}.text-center{text-align:center}.text-sm{font-size:var(--text-sm);line-height:var(--tw-leading,var(--text-sm--line-height))}.text-xl{font-size:var(--text-xl);line-height:var(--tw-leading,var(--text-xl--line-height))}.text-xs{font-size:var(--text-xs);line-height:var(--tw-leading,var(--text-xs--line-height))}.text-\\[10px\\]{font-size:10px}.leading-relaxed{--tw-leading:var(--leading-relaxed);line-height:var(--leading-relaxed)}.font-medium{--tw-font-weight:var(--font-weight-medium);font-weight:var(--font-weight-medium)}.font-semibold{--tw-font-weight:var(--font-weight-semibold);font-weight:var(--font-weight-semibold)}.text-blue-400{color:var(--color-blue-400)}.text-blue-500{color:var(--color-blue-500)}.text-gray-100{color:var(--color-gray-100)}.text-gray-200{color:var(--color-gray-200)}.text-gray-300{color:var(--color-gray-300)}.text-gray-400{color:var(--color-gray-400)}.text-gray-500{color:var(--color-gray-500)}.text-gray-600{color:var(--color-gray-600)}.text-gray-700{color:var(--color-gray-700)}.text-red-400{color:var(--color-red-400)}.text-white{color:var(--color-white)}.text-yellow-400{color:var(--color-yellow-400)}.text-yellow-500{color:var(--color-yellow-500)}.uppercase{text-transform:uppercase}.opacity-0{opacity:0}.opacity-25{opacity:.25}.opacity-50{opacity:.5}.opacity-70{opacity:.7}.opacity-75{opacity:.75}.shadow-2xl{--tw-shadow:0 25px 50px -12px var(--tw-shadow-color,#00000040);box-shadow:var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)}.shadow-lg{--tw-shadow:0 10px 15px -3px var(--tw-shadow-color,#0000001a), 0 4px 6px -4px var(--tw-shadow-color,#0000001a);box-shadow:var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)}.transition{transition-property:color,background-color,border-color,outline-color,text-decoration-color,fill,stroke,--tw-gradient-from,--tw-gradient-via,--tw-gradient-to,opacity,box-shadow,transform,translate,scale,rotate,filter,-webkit-backdrop-filter,backdrop-filter,display,content-visibility,overlay,pointer-events;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-all{transition-property:all;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-colors{transition-property:color,background-color,border-color,outline-color,text-decoration-color,fill,stroke,--tw-gradient-from,--tw-gradient-via,--tw-gradient-to;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-transform{transition-property:transform,translate,scale,rotate;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.duration-300{--tw-duration:.3s;transition-duration:.3s}.outline-none{--tw-outline-style:none;outline-style:none}@media (hover:hover){.hover\\:bg-blue-700:hover{background-color:var(--color-blue-700)}.hover\\:bg-gray-700:hover{background-color:var(--color-gray-700)}.hover\\:bg-green-600:hover{background-color:var(--color-green-600)}.hover\\:bg-red-700:hover{background-color:var(--color-red-700)}.hover\\:text-gray-200:hover{color:var(--color-gray-200)}.hover\\:text-red-400:hover{color:var(--color-red-400)}.hover\\:underline:hover{text-decoration-line:underline}}.focus\\:border-transparent:focus{border-color:#0000}.focus\\:ring-1:focus{--tw-ring-shadow:var(--tw-ring-inset,) 0 0 0 calc(1px + var(--tw-ring-offset-width)) var(--tw-ring-color,currentcolor);box-shadow:var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)}.focus\\:ring-2:focus{--tw-ring-shadow:var(--tw-ring-inset,) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color,currentcolor);box-shadow:var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)}.focus\\:ring-blue-500:focus{--tw-ring-color:var(--color-blue-500)}.focus\\:outline-none:focus{--tw-outline-style:none;outline-style:none}.disabled\\:cursor-not-allowed:disabled{cursor:not-allowed}.disabled\\:opacity-60:disabled{opacity:.6}}@property --tw-translate-x{syntax:"*";inherits:false;initial-value:0}@property --tw-translate-y{syntax:"*";inherits:false;initial-value:0}@property --tw-translate-z{syntax:"*";inherits:false;initial-value:0}@property --tw-rotate-x{syntax:"*";inherits:false}@property --tw-rotate-y{syntax:"*";inherits:false}@property --tw-rotate-z{syntax:"*";inherits:false}@property --tw-skew-x{syntax:"*";inherits:false}@property --tw-skew-y{syntax:"*";inherits:false}@property --tw-space-y-reverse{syntax:"*";inherits:false;initial-value:0}@property --tw-divide-y-reverse{syntax:"*";inherits:false;initial-value:0}@property --tw-border-style{syntax:"*";inherits:false;initial-value:solid}@property --tw-leading{syntax:"*";inherits:false}@property --tw-font-weight{syntax:"*";inherits:false}@property --tw-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-shadow-color{syntax:"*";inherits:false}@property --tw-shadow-alpha{syntax:"<percentage>";inherits:false;initial-value:100%}@property --tw-inset-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-inset-shadow-color{syntax:"*";inherits:false}@property --tw-inset-shadow-alpha{syntax:"<percentage>";inherits:false;initial-value:100%}@property --tw-ring-color{syntax:"*";inherits:false}@property --tw-ring-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-inset-ring-color{syntax:"*";inherits:false}@property --tw-inset-ring-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-ring-inset{syntax:"*";inherits:false}@property --tw-ring-offset-width{syntax:"<length>";inherits:false;initial-value:0}@property --tw-ring-offset-color{syntax:"*";inherits:false;initial-value:#fff}@property --tw-ring-offset-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-duration{syntax:"*";inherits:false}@keyframes spin{to{transform:rotate(360deg)}}

  body { font-family: 'Inter', sans-serif; }
  .mono { font-family: 'JetBrains Mono', monospace; }
  .gist-item { transition: all 0.15s ease; }
  .gist-item:hover { background-color: rgba(255,255,255,0.05); }
  .gist-item.active { background-color: rgba(59,130,246,0.15); border-left: 3px solid #3b82f6; }
  pre { white-space: pre-wrap; word-break: break-word; }
  pre code.hljs { background: transparent !important; padding: 0 !important; font-family: 'JetBrains Mono', monospace; }
  textarea.code-editor { font-family: 'JetBrains Mono', monospace; tab-size: 2; }
  .spinner { animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  #saving-overlay { transition: opacity 0.2s ease; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 3px; }
  .lang-toggle { display: inline-flex; background: #1e293b; border-radius: 9999px; padding: 2px; gap: 1px; }
  .lang-btn { padding: 3px 10px; border-radius: 9999px; font-size: 11px; color: #94a3b8; transition: all 0.2s; border: none; cursor: pointer; background: transparent; line-height: 1.5; font-family: inherit; }
  .lang-btn:hover { color: #e2e8f0; }
  .lang-btn.active { background: #3b82f6; color: #fff; }
  ::-webkit-scrollbar-thumb:hover { background: #6b7280; }
</style>
</head>
<body class="h-full bg-gray-950 text-gray-100">

<!-- Token Setup Modal -->
<div id="token-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
  <div class="bg-gray-900 rounded-xl shadow-2xl w-full max-w-md p-6 mx-4 border border-gray-800">
    <div class="text-center mb-6">
      <svg class="w-12 h-12 mx-auto mb-3 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
      <h2 class="text-xl font-semibold" data-i18n="app.title">GitHub Gist Manager</h2>
      <p id="token-modal-desc" class="text-gray-400 text-sm mt-1" data-i18n="auth.desc">输入你的 GitHub Token 以开始</p>
    </div>
    <div id="remembered-user" class="hidden text-center mb-4">
      <button id="switch-account-btn" class="text-xs text-blue-400 hover:underline mt-1" data-i18n="auth.switchAccount">使用其他账号</button>
    </div>
    <div class="space-y-4">
      <div id="token-input-group">
        <div class="flex items-center justify-between mb-1">
          <label class="text-sm font-medium text-gray-300" data-i18n="auth.tokenLabel">Personal Access Token</label>
          <span id="token-error" class="text-sm text-red-400 hidden"></span>
        </div>
        <input id="token-input" type="password" data-i18n="[placeholder]auth.tokenPlaceholder" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
          class="mono w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        <p class="text-xs text-gray-500 mt-1.5">
          <span data-i18n="[html]auth.tokenHint">需要 <code class="text-gray-400">gist</code> 权限。去 <a href="https://github.com/settings/tokens" target="_blank" class="text-blue-400 hover:underline">GitHub Settings</a> 创建 token</span>
        </p>
      </div>
      <button id="token-save-btn" class="w-full py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
        <svg id="token-btn-spinner" class="hidden animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
        <span id="token-btn-text" data-i18n="auth.confirm">确认</span>
      </button>
    </div>
  </div>
</div>

<!-- Delete Confirmation Modal -->
<div id="delete-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 hidden">
  <div class="bg-gray-900 rounded-xl shadow-2xl w-full max-w-sm p-6 mx-4 border border-gray-800">
    <p class="text-sm text-gray-300 text-center mb-4" data-i18n="delete.confirmTitle">确认删除此gist？</p>
    <p id="delete-error" class="text-sm text-red-400 text-center mb-3 hidden"></p>
    <div class="flex items-center gap-3">
      <button id="delete-cancel-btn" class="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors" data-i18n="delete.cancelText">取消</button>
      <button id="delete-confirm-btn" class="flex-1 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
        <svg id="delete-spinner" class="hidden animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
        <span id="delete-confirm-text" data-i18n="delete.confirmText">确认</span>
      </button>
    </div>
  </div>
</div>

<!-- Main App -->
<div id="app" class="h-full flex flex-col hidden">
  <header class="flex items-center justify-between px-4 py-2.5 bg-gray-900 border-b border-gray-800 shrink-0">
    <div class="flex items-center gap-2">
      <svg class="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
      <span class="font-semibold text-sm" data-i18n="nav.appName">Gist Manager</span>
    </div>
    <div class="flex items-center gap-3">
      <span id="user-info" class="text-sm text-gray-400"></span>
      <span id="lang-toggle" class="lang-toggle">
        <button class="lang-btn" data-lang="zh-CN">中文</button>
        <button class="lang-btn" data-lang="en">EN</button>
        <button class="lang-btn" data-lang="ja">日本語</button>
      </span>
      <button id="refresh-btn" class="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 rounded-md transition-colors flex items-center gap-1">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
        <span data-i18n="nav.refresh">刷新</span>
      </button>
      <button id="logout-btn" class="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 rounded-md transition-colors" data-i18n="nav.changeToken">
        更换Token
      </button>
    </div>
  </header>

  <div class="flex flex-1 overflow-hidden">
    <aside class="w-72 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
      <div class="px-3 py-3 border-b border-gray-800 flex gap-2">
        <input id="search-input" type="text" data-i18n="[placeholder]sidebar.searchPlaceholder" placeholder="搜索 Gist..."
          class="flex-1 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500">
        <button id="new-gist-btn" class="shrink-0 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 rounded-md transition-colors flex items-center gap-1">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span data-i18n="sidebar.new">新建</span>
        </button>
      </div>
      <div id="gist-list" class="flex-1 overflow-y-auto">
        <div class="flex items-center justify-center py-12 text-gray-500 text-sm">加载中...</div>
      </div>
    </aside>

    <main class="flex-1 flex flex-col overflow-hidden bg-gray-950">
      <div id="empty-state" class="flex-1 flex items-center justify-center">
        <div class="text-center text-gray-500">
          <svg class="w-16 h-16 mx-auto mb-4 text-gray-700" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
          <p class="text-sm" data-i18n="emptyState.hint">选择左侧的 Gist 查看内容</p>
        </div>
      </div>

      <div id="gist-content" class="flex-1 flex flex-col overflow-hidden hidden relative">
        <div id="saving-overlay" class="absolute inset-0 z-20 bg-gray-950/80 flex items-center justify-center hidden">
          <div class="flex flex-col items-center gap-3">
            <svg class="spinner w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            <span class="text-sm text-gray-300" data-i18n="overlay.saving">正在保存...</span>
          </div>
        </div>
        <div id="loading-overlay" class="absolute inset-0 z-20 bg-gray-950/80 flex items-center justify-center hidden">
          <div class="flex flex-col items-center gap-3">
            <svg class="spinner w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            <span class="text-sm text-gray-300" data-i18n="overlay.loading">正在加载...</span>
          </div>
        </div>

        <div class="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-900 shrink-0">
          <div>
            <h2 id="gist-title" class="text-sm font-semibold text-gray-200"></h2>
            <p id="gist-meta" class="text-xs text-gray-500 mt-0.5"></p>
          </div>
          <div class="flex items-center gap-2">
            <button id="edit-btn" class="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 rounded-md transition-colors flex items-center gap-1">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              <span data-i18n="editor.edit">编辑</span>
            </button>
            <button id="delete-btn" class="px-3 py-1.5 text-xs bg-gray-800 hover:bg-red-700 rounded-md transition-colors flex items-center gap-1">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              <span data-i18n="editor.delete">删除</span>
            </button>
            <button id="save-btn" class="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 rounded-md transition-colors flex items-center gap-1 hidden">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              <span data-i18n="editor.save">保存</span>
            </button>
            <button id="cancel-edit-btn" class="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 rounded-md transition-colors hidden" data-i18n="editor.cancel">
              取消
            </button>
            <button id="visibility-btn" class="px-2 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 rounded-md transition-colors hidden" data-i18n="[title]editor.toggleVisibility" title="切换可见性">
              <svg id="visibility-icon-lock" class="w-3.5 h-3.5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z"/></svg>
              <svg id="visibility-icon-globe" class="w-3.5 h-3.5 text-gray-400 hidden" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
            </button>
            <a id="gist-link" href="#" target="_blank" class="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors flex items-center gap-1">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              <span data-i18n="editor.github">GitHub</span>
            </a>
          </div>
        </div>

        <div id="file-tabs" class="flex gap-0 px-4 bg-gray-900 border-b border-gray-800 shrink-0 overflow-x-auto"></div>
        <div id="editor-area" class="flex-1 overflow-hidden flex flex-col"></div>

        <div id="comments-section" class="border-t border-gray-800 bg-gray-900 shrink-0" style="max-height: 40%;">
          <div class="flex items-center justify-between px-4 py-2 border-b border-gray-800">
            <span class="text-xs font-semibold text-gray-300"><span data-i18n="comments.title">评论</span> (<span id="comment-count">0</span>)</span>
            <button id="toggle-comments-btn" class="text-xs text-gray-400 hover:text-gray-200">
              <svg id="comments-chevron" class="w-4 h-4 transition-transform" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </div>
          <div id="comments-body" class="overflow-y-auto" style="max-height: 300px;">
            <div id="comments-list" class="divide-y divide-gray-800"></div>
            <div class="p-3 border-t border-gray-800">
              <textarea id="comment-input" rows="2" data-i18n="[placeholder]comments.placeholder" placeholder="写评论..."
                class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-xs resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"></textarea>
              <div class="flex justify-center mt-2">
                <button id="post-comment-btn" class="px-3 py-1.5 text-xs bg-green-700 hover:bg-green-600 rounded-md transition-colors">
                  <span data-i18n="comments.submit">提交评论</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>

  <div id="toast" class="fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg transition-all duration-300 translate-y-20 opacity-0 pointer-events-none"></div>
</div>

<script>
/* ── I18N ──────────────────────────────────── */
var I18N={lang:"zh-CN",resources:null,
init:function(l,r){this.lang=l;this.resources=r;},
t:function(k,v){var p=k.split("."),a=this.resources[this.lang];
for(var i=0;a&&i<p.length;i++)a=a[p[i]];
if(typeof a!=="string")return k;
if(v)for(var x in v)a=a.split("{{"+x+"}}").join(v[x]);
return a;},
changeLanguage:function(l,cb){this.lang=l;if(cb)cb();}};
var RES={"zh-CN":{"app":{"title":"GitHub Gist Manager"},"auth":{"desc":"输入你的 GitHub Token 以开始","switchAccount":"使用其他账号","tokenLabel":"Personal Access Token","tokenPlaceholder":"ghp_xxxxxxxxxxxxxxxxxxxx","tokenHint":"需要 <code>gist</code> 权限。去 <a>GitHub Settings</a> 创建 token","confirm":"确认","loginAs":"以 {{login}} 身份登录","confirmLogin":"确认登录","verifying":"验证中...","enterToken":"请输入 Token","tokenInvalid":"Token 无效: {{message}}"},"nav":{"appName":"Gist Manager","refresh":"刷新","changeToken":"更换Token"},"sidebar":{"searchPlaceholder":"搜索 Gist...","new":"新建","loading":"加载中...","notFound":"没有找到 Gist"},"emptyState":{"hint":"选择左侧的 Gist 查看内容","loadFailed":"加载失败: {{message}}"},"editor":{"edit":"编辑","delete":"删除","save":"保存","saving":"保存中...","cancel":"取消","toggleVisibility":"切换可见性","github":"GitHub"},"gistMeta":{"descPlaceholder":"Gist 描述","unsaved":"未保存的 Gist","created":"创建于","updated":"更新于","noDesc":"(无描述)","newGist":"(新建 Gist)","unsavedBadge":"未保存"},"files":{"deleteFile":"删除文件","addFile":"添加文件"},"viewer":{"truncated":"⚠ 此文件内容被截断，编辑并保存可能丢失数据","lines":"行"},"overlay":{"saving":"正在保存...","loading":"正在加载..."},"comments":{"title":"评论","placeholder":"写评论...","submit":"提交评论","saveFirst":"保存后才可以评论","noComments":"暂无评论","enterContent":"请输入评论内容","posted":"评论已提交","postFailed":"评论失败: {{message}}"},"toast":{"loadFailed":"加载 Gist 失败: {{message}}","filenameEmpty":"文件名不能为空","fileContentEmpty":"文件 \\\"{{name}}\\\" 内容不能为空","gistCreated":"Gist 已创建","gistSaved":"Gist 已保存","saveFailed":"保存失败: {{message}}"},"delete":{"confirmTitle":"确认删除此gist？","confirmText":"确认","cancelText":"取消","deleting":"删除中...","deleteFailed":"删除失败: {{message}}"},"lang":{"zh-CN":"中文","en":"English","ja":"日本語"}},"en":{"app":{"title":"GitHub Gist Manager"},"auth":{"desc":"Enter your GitHub Token to get started","switchAccount":"Use another account","tokenLabel":"Personal Access Token","tokenPlaceholder":"ghp_xxxxxxxxxxxxxxxxxxxx","tokenHint":"Requires <code>gist</code> scope. Create a token at <a>GitHub Settings</a>","confirm":"Confirm","loginAs":"Login as {{login}}","confirmLogin":"Confirm Login","verifying":"Verifying...","enterToken":"Please enter a Token","tokenInvalid":"Invalid Token: {{message}}"},"nav":{"appName":"Gist Manager","refresh":"Refresh","changeToken":"Change Token"},"sidebar":{"searchPlaceholder":"Search Gists...","new":"New","loading":"Loading...","notFound":"No Gists found"},"emptyState":{"hint":"Select a Gist from the left to view","loadFailed":"Load failed: {{message}}"},"editor":{"edit":"Edit","delete":"Delete","save":"Save","saving":"Saving...","cancel":"Cancel","toggleVisibility":"Toggle visibility","github":"GitHub"},"gistMeta":{"descPlaceholder":"Gist description","unsaved":"Unsaved Gist","created":"Created","updated":"Updated","noDesc":"(no description)","newGist":"(New Gist)","unsavedBadge":"Unsaved"},"files":{"deleteFile":"Delete file","addFile":"Add file"},"viewer":{"truncated":"⚠ File content is truncated. Editing and saving may lose data.","lines":"lines"},"overlay":{"saving":"Saving...","loading":"Loading..."},"comments":{"title":"Comments","placeholder":"Write a comment...","submit":"Submit Comment","saveFirst":"Save before commenting","noComments":"No comments yet","enterContent":"Please enter a comment","posted":"Comment posted","postFailed":"Comment failed: {{message}}"},"toast":{"loadFailed":"Failed to load Gist: {{message}}","filenameEmpty":"Filename cannot be empty","fileContentEmpty":"File \\\"{{name}}\\\" content cannot be empty","gistCreated":"Gist created","gistSaved":"Gist saved","saveFailed":"Save failed: {{message}}"},"delete":{"confirmTitle":"Confirm delete this gist?","confirmText":"Confirm","cancelText":"Cancel","deleting":"Deleting...","deleteFailed":"Delete failed: {{message}}"},"lang":{"zh-CN":"中文","en":"English","ja":"日本語"}},"ja":{"app":{"title":"GitHub Gist Manager"},"auth":{"desc":"GitHubトークンを入力して開始","switchAccount":"別のアカウントを使用","tokenLabel":"Personal Access Token","tokenPlaceholder":"ghp_xxxxxxxxxxxxxxxxxxxx","tokenHint":"<code>gist</code> スコープが必要です。<a>GitHub Settings</a> でトークンを作成してください","confirm":"確認","loginAs":"{{login}} 作为登录","confirmLogin":"ログイン確認","verifying":"検証中...","enterToken":"トークンを入力してください","tokenInvalid":"無効なトークン: {{message}}"},"nav":{"appName":"Gist Manager","refresh":"更新","changeToken":"トークン変更"},"sidebar":{"searchPlaceholder":"Gistを検索...","new":"新規","loading":"読み込み中...","notFound":"Gistが見つかりません"},"emptyState":{"hint":"左側からGistを選択して表示","loadFailed":"読み込み失敗: {{message}}"},"editor":{"edit":"編集","delete":"削除","save":"保存","saving":"保存中...","cancel":"キャンセル","toggleVisibility":"公開設定切り替え","github":"GitHub"},"gistMeta":{"descPlaceholder":"Gistの説明","unsaved":"未保存のGist","created":"作成日","updated":"更新日","noDesc":"(説明なし)","newGist":"(新規Gist)","unsavedBadge":"未保存"},"files":{"deleteFile":"ファイルを削除","addFile":"ファイルを追加"},"viewer":{"truncated":"⚠ ファイルの内容が切り詰められています。編集して保存するとデータが失われる可能性があります","lines":"行"},"overlay":{"saving":"保存中...","loading":"読み込み中..."},"comments":{"title":"コメント","placeholder":"コメントを書く...","submit":"コメントを送信","saveFirst":"保存後にコメントできます","noComments":"まだコメントはありません","enterContent":"コメントを入力してください","posted":"コメントを投稿しました","postFailed":"コメント失敗: {{message}}"},"toast":{"loadFailed":"Gistの読み込みに失敗: {{message}}","filenameEmpty":"ファイル名を空にすることはできません","fileContentEmpty":"ファイル \\\"{{name}}\\\" の内容を空にすることはできません","gistCreated":"Gistを作成しました","gistSaved":"Gistを保存しました","saveFailed":"保存失敗: {{message}}"},"delete":{"confirmTitle":"このGistを削除しますか？","confirmText":"確認","cancelText":"キャンセル","deleting":"削除中...","deleteFailed":"削除失敗: {{message}}"},"lang":{"zh-CN":"中文","en":"English","ja":"日本語"}}};
(function(){var s=localStorage.getItem("gist_manager_lang");
var n=(navigator.language||"zh-CN").split("-")[0];
var l=s&&RES[s]?s:(n==="zh"?"zh-CN":n==="ja"?"ja":n==="en"?"en":"zh-CN");
I18N.init(l,RES);
window.applyTranslations=function(){document.querySelectorAll("[data-i18n]").forEach(function(el){var k=el.getAttribute("data-i18n"),r=k,p=k.indexOf("[placeholder]")===0,t=k.indexOf("[title]")===0,h=k.indexOf("[html]")===0;
if(p)r=k.slice("[placeholder]".length);else if(t)r=k.slice("[title]".length);else if(h)r=k.slice("[html]".length);
var v=I18N.t(r);if(p)el.setAttribute("placeholder",v);else if(t)el.setAttribute("title",v);else if(h)el.innerHTML=v;else el.textContent=v;});};
applyTranslations();
(function(){var btns=document.querySelectorAll("#lang-toggle .lang-btn");btns.forEach(function(b){if(b.getAttribute("data-lang")===I18N.lang)b.classList.add("active");b.addEventListener("click",function(){var ln=b.getAttribute("data-lang");if(ln===I18N.lang)return;btns.forEach(function(x){x.classList.remove("active")});b.classList.add("active");localStorage.setItem("gist_manager_lang",ln);I18N.changeLanguage(ln,function(){applyTranslations();if(typeof window._rerender==="function")window._rerender();});});});})();
})();

(function() {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const tokenModal = $('#token-modal');
  const tokenInput = $('#token-input');
  const tokenSaveBtn = $('#token-save-btn');
  const tokenBtnText = $('#token-btn-text');
  const tokenBtnSpinner = $('#token-btn-spinner');
  const tokenError = $('#token-error');
  const tokenModalDesc = $('#token-modal-desc');
  const rememberedUser = $('#remembered-user');
  const switchAccountBtn = $('#switch-account-btn');
  const tokenInputGroup = $('#token-input-group');
  const app = $('#app');
  const refreshBtn = $('#refresh-btn');
  const logoutBtn = $('#logout-btn');
  const userInfo = $('#user-info');
  const searchInput = $('#search-input');
  const newGistBtn = $('#new-gist-btn');
  const gistList = $('#gist-list');
  const emptyState = $('#empty-state');
  const gistContent = $('#gist-content');
  const gistTitle = $('#gist-title');
  const gistMeta = $('#gist-meta');
  const gistLink = $('#gist-link');
  const editBtn = $('#edit-btn');
  const deleteBtn = $('#delete-btn');
  const saveBtn = $('#save-btn');
  const cancelEditBtn = $('#cancel-edit-btn');
  const visibilityBtn = $('#visibility-btn');
  const deleteModal = $('#delete-modal');
  const deleteCancelBtn = $('#delete-cancel-btn');
  const deleteConfirmBtn = $('#delete-confirm-btn');
  const deleteConfirmText = $('#delete-confirm-text');
  const deleteSpinner = $('#delete-spinner');
  const deleteError = $('#delete-error');
  const visibilityLock = $('#visibility-icon-lock');
  const visibilityGlobe = $('#visibility-icon-globe');
  const savingOverlay = $('#saving-overlay');
  const loadingOverlay = $('#loading-overlay');
  const fileTabs = $('#file-tabs');
  const editorArea = $('#editor-area');
  const commentsSection = $('#comments-section');
  const commentsList = $('#comments-list');
  const commentCount = $('#comment-count');
  const commentInput = $('#comment-input');
  const postCommentBtn = $('#post-comment-btn');
  const toggleCommentsBtn = $('#toggle-comments-btn');
  const commentsChevron = $('#comments-chevron');
  const commentsBody = $('#comments-body');
  const toast = $('#toast');

  let gists = [];
  let selectedGist = null;
  let selectedGistDetail = null;
  let isEditing = false;
  let editContent = {};
  let editFileNames = [];
  let editPublic = false;
  let activeFileName = null;
  let allGists = [];
  let rememberedUserData = null;

  function setSaving(active) {
    if (active) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<svg class="spinner w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/><\/svg> ' + I18N.t('editor.saving');
      saveBtn.classList.add('opacity-70', 'cursor-not-allowed');
      cancelEditBtn.disabled = true;
      cancelEditBtn.classList.add('opacity-50', 'cursor-not-allowed');
      savingOverlay.classList.remove('hidden');
    } else {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/><\/svg> ' + I18N.t('editor.save');
      saveBtn.classList.remove('opacity-70', 'cursor-not-allowed');
      cancelEditBtn.disabled = false;
      cancelEditBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      savingOverlay.classList.add('hidden');
    }
  }

  function showToast(msg, type) {
    type = type || 'info';
    var colors = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-gray-700' };
    toast.className = 'fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg transition-all duration-300 ' + colors[type] + ' text-white';
    toast.textContent = msg;
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
    clearTimeout(toast._t);
    toast._t = setTimeout(function() {
      toast.style.transform = 'translateY(80px)';
      toast.style.opacity = '0';
    }, 2500);
  }

  async function api(path, opts) {
    opts = opts || {};
    var headers = {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (opts.body) headers['Content-Type'] = 'application/json';
    var res = await fetch('/api' + path, { method: opts.method || 'GET', headers: headers, body: opts.body || undefined });
    if (!res.ok) {
      var err = await res.json().catch(function() { return {}; });
      throw new Error(err.message || 'HTTP ' + res.status);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  async function initAuth() {
    try {
      var user = await api('/user');
      rememberedUserData = { login: user.login, avatar_url: user.avatar_url };
      tokenModalDesc.textContent = I18N.t('auth.loginAs', { login: user.login });
      rememberedUser.classList.remove('hidden');
      tokenInputGroup.classList.add('hidden');
      tokenBtnText.textContent = I18N.t('auth.confirmLogin');
    } catch (e) {
      showFreshLogin();
    }
  }

  function showFreshLogin() {
    rememberedUserData = null;
    tokenInput.value = '';
    tokenModalDesc.textContent = I18N.t('auth.desc');
    rememberedUser.classList.add('hidden');
    tokenInputGroup.classList.remove('hidden');
    tokenBtnText.textContent = I18N.t('auth.confirm');
    tokenError.classList.add('hidden');
  }

  tokenSaveBtn.addEventListener('click', async function() {
    if (rememberedUserData) {
      tokenError.classList.add('hidden');
      tokenSaveBtn.disabled = true;
      tokenBtnText.textContent = I18N.t('auth.verifying');
      tokenBtnSpinner.classList.remove('hidden');
      try {
        var user = await api('/user');
        userInfo.textContent = user.login;
        tokenModal.classList.add('hidden');
        app.classList.remove('hidden');
        loadGists();
      } catch (e) {
        showFreshLogin();
      } finally {
        tokenSaveBtn.disabled = false;
        tokenBtnText.textContent = I18N.t('auth.confirm');
        tokenBtnSpinner.classList.add('hidden');
      }
      return;
    }
    var val = tokenInput.value.trim();
    if (!val) { tokenError.textContent = I18N.t('auth.enterToken'); tokenError.classList.remove('hidden'); return; }
    tokenError.classList.add('hidden');
    tokenSaveBtn.disabled = true;
    tokenBtnText.textContent = I18N.t('auth.verifying');
    tokenBtnSpinner.classList.remove('hidden');
    try {
      var res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: val }),
      });
      if (!res.ok) {
        var err = await res.json().catch(function() { return {}; });
        throw new Error(err.message || 'Invalid token');
      }
      tokenInput.value = '';
      var user = await api('/user');
      userInfo.textContent = user.login;
      tokenModal.classList.add('hidden');
      app.classList.remove('hidden');
      loadGists();
    } catch (e) {
      tokenError.textContent = I18N.t('auth.tokenInvalid', { message: e.message });
      tokenError.classList.remove('hidden');
      tokenInput.value = '';
    } finally {
      tokenSaveBtn.disabled = false;
      tokenBtnText.textContent = I18N.t('auth.confirm');
      tokenBtnSpinner.classList.add('hidden');
    }
  });

  tokenInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') tokenSaveBtn.click();
  });

  switchAccountBtn.addEventListener('click', async function() {
    await fetch('/logout', { method: 'POST' });
    showFreshLogin();
  });

  logoutBtn.addEventListener('click', async function() {
    await fetch('/logout', { method: 'POST' });
    gists = [];
    allGists = [];
    selectedGist = null;
    selectedGistDetail = null;
    isEditing = false;
    tokenModal.classList.remove('hidden');
    app.classList.add('hidden');
    tokenInput.value = '';
    resetContent();
    showFreshLogin();
  });

  refreshBtn.addEventListener('click', loadGists);

  async function loadGists() {
    gistList.innerHTML = '<div class="flex items-center justify-center py-12 text-gray-500 text-sm">' + I18N.t('sidebar.loading') + '</div>';
    try {
      allGists = await api('/gists?per_page=100');
      gists = allGists;
      renderGistList();
    } catch (e) {
      gistList.innerHTML = '<div class="flex items-center justify-center py-12 text-red-400 text-sm">' + e.message + '</div>';
    }
  }

  function renderGistList() {
    if (gists.length === 0) {
      gistList.innerHTML = '<div class="flex items-center justify-center py-12 text-gray-500 text-sm">' + I18N.t('sidebar.notFound') + '</div>';
      return;
    }
    var selectedId = selectedGistDetail ? selectedGistDetail.id : null;
    gistList.innerHTML = gists.map(function(g) {
      var desc = g.description || (g.isNew ? I18N.t('gistMeta.newGist') : I18N.t('gistMeta.noDesc'));
      var filename = Object.keys(g.files)[0] || '?';
      var active = g.id === selectedId ? ' active' : '';
      var lockIcon = (!g.public && !g.isNew)
        ? '<svg class="w-3 h-3 text-yellow-500 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z"/></svg>'
        : '';
      var badge = g.isNew
        ? '<span class="text-[10px] text-blue-400">' + I18N.t('gistMeta.unsavedBadge') + '</span>'
        : '';
      return '<div class="gist-item px-3 py-2.5 cursor-pointer border-b border-gray-800/50' + active + '" data-id="' + g.id + '"><div class="text-xs font-medium text-gray-200 truncate flex items-center gap-1.5">' + lockIcon + escHtml(desc) + '</div><div class="text-xs text-gray-500 mt-0.5 flex items-center gap-2"><span class="mono text-[10px]">' + escHtml(filename) + '</span>' + badge + '</div></div>';
    }).join('');
    gistList.querySelectorAll('.gist-item').forEach(function(el) {
      el.addEventListener('click', function() { selectGist(el.dataset.id); });
    });
  }

  searchInput.addEventListener('input', function() {
    var q = searchInput.value.toLowerCase();
    gists = allGists.filter(function(g) {
      return (g.description || '').toLowerCase().indexOf(q) !== -1 ||
        Object.keys(g.files).some(function(f) { return f.toLowerCase().indexOf(q) !== -1; });
    });
    renderGistList();
  });

  newGistBtn.addEventListener('click', function() {
    var draft = {
      isNew: true, id: '__new__', description: '', public: false, html_url: '',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      files: { 'new-file.txt': { content: '', language: 'Text', truncated: false } },
    };
    selectedGistDetail = draft;
    selectedGist = draft;
    isEditing = true;
    editContent = {};
    editFileNames = Object.keys(draft.files);
    editPublic = false;
    for (var name in draft.files) { editContent[name] = draft.files[name].content; }
    allGists.unshift(draft);
    if (searchInput.value.trim()) { gists.unshift(draft); } else { gists = allGists; }
    renderGistList();
    editBtn.classList.add('hidden'); deleteBtn.classList.add('hidden');
    saveBtn.classList.remove('hidden');
    cancelEditBtn.classList.remove('hidden');
    visibilityBtn.classList.remove('hidden');
    updateVisibilityIcon();
    renderContent();
    commentsList.innerHTML = '<div class="p-4 text-xs text-gray-500 text-center">' + I18N.t('comments.saveFirst') + '</div>';
    commentCount.textContent = '0';
  });

  async function selectGist(id) {
    gistList.querySelectorAll('.gist-item').forEach(function(el) { el.classList.remove('active'); });
    var target = gistList.querySelector('[data-id="' + id + '"]');
    if (target) target.classList.add('active');
    var draft = allGists.find(function(g) { return g.id === id && g.isNew; });
    if (draft) {
      selectedGistDetail = draft; selectedGist = draft;
      isEditing = true; editContent = {}; editFileNames = Object.keys(draft.files); editPublic = false;
      for (var name in draft.files) { editContent[name] = draft.files[name].content; }
      editBtn.classList.add('hidden'); deleteBtn.classList.add('hidden'); saveBtn.classList.remove('hidden'); cancelEditBtn.classList.remove('hidden');
      visibilityBtn.classList.remove('hidden'); updateVisibilityIcon(); renderContent();
      commentsList.innerHTML = '<div class="p-4 text-xs text-gray-500 text-center">' + I18N.t('comments.saveFirst') + '</div>';
      commentCount.textContent = '0';
      return;
    }
    emptyState.classList.add('hidden'); gistContent.classList.remove('hidden'); loadingOverlay.classList.remove('hidden');
    try {
      selectedGistDetail = await api('/gists/' + id);
      selectedGist = selectedGistDetail;
      isEditing = false;
      editBtn.classList.remove('hidden'); deleteBtn.classList.remove('hidden'); saveBtn.classList.add('hidden'); cancelEditBtn.classList.add('hidden');
      visibilityBtn.classList.add('hidden');
      renderContent();
      loadComments();
      loadingOverlay.classList.add('hidden');
    } catch (e) {
      loadingOverlay.classList.add('hidden');
      gistContent.classList.add('hidden');
      emptyState.classList.remove('hidden');
      emptyState.innerHTML = '<div class="text-center text-red-400"><p class="text-sm">' + I18N.t('emptyState.loadFailed', { message: e.message }) + '</p></div>';
      showToast(I18N.t('toast.loadFailed', { message: e.message }), 'error');
    }
  }

  function renderContent() {
    var g = selectedGistDetail;
    if (!g) return;
    emptyState.classList.add('hidden'); gistContent.classList.remove('hidden');
    var desc = g.description || (g.isNew ? I18N.t('gistMeta.newGist') : I18N.t('gistMeta.noDesc'));
    if (isEditing) {
      gistTitle.innerHTML = '<input id="desc-input" class="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm font-semibold text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500" value="' + escAttr(g.description || '') + '" placeholder="' + I18N.t('gistMeta.descPlaceholder') + '">';
    } else {
      gistTitle.textContent = desc;
    }
    if (g.isNew) {
      gistMeta.textContent = I18N.t('gistMeta.unsaved'); gistLink.href = '#'; gistLink.classList.add('hidden');
    } else {
      var locale = I18N.lang || 'zh-CN';
      gistMeta.textContent = I18N.t('gistMeta.created') + ' ' + new Date(g.created_at).toLocaleString(locale) + ' · ' + I18N.t('gistMeta.updated') + ' ' + new Date(g.updated_at).toLocaleString(locale);
      gistLink.href = g.html_url; gistLink.classList.remove('hidden');
    }
    var files = g.files;
    var fileNames = isEditing ? editFileNames : Object.keys(files);
    if (isEditing) {
      fileTabs.innerHTML = fileNames.map(function(name, i) {
        var active = i === 0 ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400';
        return '<div class="flex items-center gap-0.5 shrink-0 border-b-2 ' + active + ' transition-colors" data-file="' + escAttr(name) + '"><input class="file-name-input bg-transparent text-xs mono px-2 py-1.5 outline-none text-gray-200 w-28" value="' + escAttr(name) + '" data-file="' + escAttr(name) + '" spellcheck="false">' + (fileNames.length > 1 ? '<button class="delete-file-btn text-gray-500 hover:text-red-400 px-1" data-file="' + escAttr(name) + '" title="' + I18N.t('files.deleteFile') + '">&times;</button>' : '') + '</div>';
      }).join('') + '<button id="add-file-btn" class="shrink-0 px-2 py-1.5 text-xs text-gray-400 hover:text-gray-200 border-b-2 border-transparent" title="' + I18N.t('files.addFile') + '">+</button>';
    } else {
      fileTabs.innerHTML = fileNames.map(function(name, i) {
        var active = i === 0 ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200';
        return '<button class="file-tab px-3 py-1.5 text-xs border-b-2 ' + active + ' transition-colors shrink-0" data-file="' + escAttr(name) + '">' + escHtml(name) + '</button>';
      }).join('');
    }
    var renderName = (activeFileName && fileNames.indexOf(activeFileName) !== -1) ? activeFileName : fileNames[0];
    var fileData = g.files[renderName] || { content: '', language: 'Text', truncated: false };
    renderFileViewer(renderName, fileData);
    highlightActiveTab(renderName);
  }

  function highlightActiveTab(name) {
    activeFileName = name;
    if (isEditing) {
      fileTabs.querySelectorAll('[data-file]').forEach(function(el) {
        if (el.dataset.file === name) { el.classList.add('border-blue-500'); el.classList.remove('border-transparent', 'text-gray-400'); }
        else { el.classList.remove('border-blue-500'); el.classList.add('border-transparent', 'text-gray-400'); }
      });
    } else {
      fileTabs.querySelectorAll('.file-tab').forEach(function(t) {
        if (t.dataset.file === name) { t.classList.add('border-blue-500', 'text-blue-400'); t.classList.remove('border-transparent', 'text-gray-400', 'hover:text-gray-200'); }
        else { t.classList.remove('border-blue-500', 'text-blue-400'); t.classList.add('border-transparent', 'text-gray-400', 'hover:text-gray-200'); }
      });
    }
  }

  function switchFile(name) {
    var g = selectedGistDetail;
    if (!g) return;
    var file = g.files[name];
    if (!file) return;
    renderFileViewer(name, file);
    highlightActiveTab(name);
  }

  function renderFileViewer(name, file) {
    var content = isEditing ? (editContent[name] !== undefined ? editContent[name] : file.content) : file.content;
    var truncated = file.truncated;
    if (isEditing) {
      editorArea.innerHTML = '<textarea class="code-editor w-full flex-1 p-4 bg-gray-900 text-gray-200 text-sm resize-none focus:outline-none border-none" style="flex:1;" data-file="' + escAttr(name) + '">' + escHtml(content) + '</textarea>' + (truncated ? '<p class="text-xs text-yellow-400 px-4 pb-2">' + I18N.t('viewer.truncated') + '</p>' : '');
    } else {
      var rawLang = (file.language || '').toLowerCase().trim();
      var langClass = (typeof hljs !== 'undefined' && rawLang && hljs.getLanguage(rawLang)) ? 'language-' + rawLang : '';
      var linesCount = content ? content.split('\\n').length : 0;
      
      editorArea.innerHTML = '<div class="flex items-center justify-between px-4 py-1.5 bg-gray-900 shrink-0"><span class="text-[10px] text-gray-500 uppercase">' + escHtml(file.language || 'plaintext') + '</span><span class="text-[10px] text-gray-600">' + linesCount + ' ' + I18N.t('viewer.lines') + '</span></div><div class="flex-1 overflow-auto"><pre class="p-4 text-sm mono text-gray-300 leading-relaxed"><code id="code-viewer" class="' + langClass + '">' + escHtml(content) + '</code></pre></div>';
      
      if (typeof hljs !== 'undefined') {
        var codeEl = document.getElementById('code-viewer');
        if (codeEl) {
          hljs.highlightElement(codeEl);
        }
      }
    }
  }

  editBtn.addEventListener('click', function() {
    isEditing = true;
    editContent = {};
    var g = selectedGistDetail;
    if (!g) return;
    editFileNames = Object.keys(g.files);
    editPublic = g.public;
    for (var name in g.files) { editContent[name] = g.files[name].content; }
    editBtn.classList.add('hidden'); deleteBtn.classList.add('hidden'); saveBtn.classList.remove('hidden'); cancelEditBtn.classList.remove('hidden');
    visibilityBtn.classList.remove('hidden'); updateVisibilityIcon(); renderContent();
  });

  deleteBtn.addEventListener('click', function() {
    deleteError.classList.add('hidden');
    deleteModal.classList.remove('hidden');
  });

  function closeDeleteModal() {
    deleteModal.classList.add('hidden');
    deleteConfirmBtn.disabled = false;
    deleteConfirmText.textContent = I18N.t('delete.confirmText');
    deleteSpinner.classList.add('hidden');
  }

  deleteModal.addEventListener('click', function(e) {
    if (e.target === deleteModal) closeDeleteModal();
  });

  deleteCancelBtn.addEventListener('click', closeDeleteModal);

  deleteConfirmBtn.addEventListener('click', async function() {
    var g = selectedGistDetail;
    if (!g || g.isNew) return;
    deleteConfirmBtn.disabled = true;
    deleteConfirmText.textContent = I18N.t('delete.deleting');
    deleteSpinner.classList.remove('hidden');
    deleteError.classList.add('hidden');
    try {
      await api('/gists/' + g.id, { method: 'DELETE' });
      closeDeleteModal();
      selectedGistDetail = null;
      selectedGist = null;
      allGists = allGists.filter(function(x) { return x.id !== g.id; });
      gists = gists.filter(function(x) { return x.id !== g.id; });
      if (!searchInput.value.trim()) gists = allGists;
      resetContent();
      renderGistList();
    } catch (e) {
      deleteError.textContent = I18N.t('delete.deleteFailed', { message: e.message });
      deleteError.classList.remove('hidden');
    } finally {
      deleteConfirmBtn.disabled = false;
      deleteConfirmText.textContent = I18N.t('delete.confirmText');
      deleteSpinner.classList.add('hidden');
    }
  });

  cancelEditBtn.addEventListener('click', function() {
    var g = selectedGistDetail;
    if (g && g.isNew) {
      allGists = allGists.filter(function(x) { return x.id !== '__new__'; });
      gists = gists.filter(function(x) { return x.id !== '__new__'; });
      if (!searchInput.value.trim()) gists = allGists;
      selectedGistDetail = null; selectedGist = null;
      isEditing = false; editContent = {};
      editBtn.classList.remove('hidden'); deleteBtn.classList.remove('hidden'); saveBtn.classList.add('hidden'); cancelEditBtn.classList.add('hidden');
      visibilityBtn.classList.add('hidden'); renderGistList(); resetContent();
      return;
    }
    isEditing = false; editContent = {}; editFileNames = [];
    editBtn.classList.remove('hidden'); deleteBtn.classList.remove('hidden'); saveBtn.classList.add('hidden'); cancelEditBtn.classList.add('hidden');
    visibilityBtn.classList.add('hidden'); renderContent();
  });

  function updateVisibilityIcon() {
    if (editPublic) { visibilityLock.classList.add('hidden'); visibilityGlobe.classList.remove('hidden'); }
    else { visibilityLock.classList.remove('hidden'); visibilityGlobe.classList.add('hidden'); }
  }

  visibilityBtn.addEventListener('click', function() {
    editPublic = !editPublic;
    updateVisibilityIcon();
  });

  saveBtn.addEventListener('click', async function() {
    var g = selectedGistDetail;
    if (!g || saveBtn.disabled) return;
    var textareas = editorArea.querySelectorAll('textarea');
    textareas.forEach(function(ta) { editContent[ta.dataset.file] = ta.value; });
    if (isEditing) { collectFileNames(); }
    for (var i = 0; i < editFileNames.length; i++) {
      var fn = editFileNames[i];
      if (!fn.trim()) { showToast(I18N.t('toast.filenameEmpty'), 'error'); return; }
      if (!(editContent[fn] || '').trim()) { showToast(I18N.t('toast.fileContentEmpty', { name: fn }), 'error'); return; }
    }

    var files = {};
    if (g.isNew) {
      editFileNames.forEach(function(name) { files[name] = { content: editContent[name] || '' }; });
    } else {
      Object.keys(g.files).forEach(function(oldName) {
        if (editFileNames.indexOf(oldName) === -1) { files[oldName] = null; }
      });
      editFileNames.forEach(function(name) { files[name] = { content: editContent[name] || '' }; });
    }
    var descInput = document.getElementById('desc-input');
    var description = descInput ? descInput.value.trim() : g.description;
    setSaving(true);
    try {
      if (g.isNew) {
        var created = await api('/gists', { method: 'POST', body: JSON.stringify({ description: description, public: editPublic, files: files }) });
        allGists = allGists.filter(function(x) { return x.id !== '__new__'; });
        gists = gists.filter(function(x) { return x.id !== '__new__'; });
        allGists.unshift(created);
        if (searchInput.value.trim()) { gists.unshift(created); } else { gists = allGists; }
        selectedGistDetail = created; selectedGist = created;
        isEditing = false; editContent = {}; editFileNames = []; editPublic = false;
        editBtn.classList.remove('hidden'); deleteBtn.classList.remove('hidden'); saveBtn.classList.add('hidden'); cancelEditBtn.classList.add('hidden');
        visibilityBtn.classList.add('hidden'); setSaving(false);
        renderGistList(); renderContent(); loadComments();
        showToast(I18N.t('toast.gistCreated'), 'success');
      } else {
        var updated = await api('/gists/' + g.id, { method: 'PATCH', body: JSON.stringify({ description: description, public: editPublic, files: files }) });
        selectedGistDetail = updated; selectedGist = updated;
        isEditing = false; editContent = {}; editFileNames = []; editPublic = false;
        editBtn.classList.remove('hidden'); deleteBtn.classList.remove('hidden'); saveBtn.classList.add('hidden'); cancelEditBtn.classList.add('hidden');
        visibilityBtn.classList.add('hidden'); setSaving(false);
        renderContent(); loadGists();
        showToast(I18N.t('toast.gistSaved'), 'success');
      }
    } catch (e) {
      setSaving(false);
      showToast(I18N.t('toast.saveFailed', { message: e.message }), 'error');
    }
  });

  fileTabs.addEventListener('click', function(e) {
    var g = selectedGistDetail;
    if (!g) return;
    if (e.target.closest('#add-file-btn')) {
      var base = 'new-file', newName = base + '.txt', n = 1;
      while (editFileNames.indexOf(newName) !== -1) { newName = base + '-' + n + '.txt'; n++; }
      editFileNames.push(newName); editContent[newName] = '';
      var ta = editorArea.querySelector('textarea');
      if (ta) editContent[ta.dataset.file] = ta.value;
      renderContent();
      renderFileViewer(newName, { content: '', language: 'Text', truncated: false });
      highlightActiveTab(newName);
      return;
    }
    var delBtn = e.target.closest('.delete-file-btn');
    if (delBtn) {
      var name = delBtn.dataset.file;
      editFileNames = editFileNames.filter(function(f) { return f !== name; });
      delete editContent[name];
      var ta2 = editorArea.querySelector('textarea');
      if (ta2) editContent[ta2.dataset.file] = ta2.value;
      renderContent();
      var first = editFileNames[0];
      if (first) { renderFileViewer(first, { content: editContent[first] || '', language: 'Text', truncated: false }); highlightActiveTab(first); }
      return;
    }
    if (isEditing) {
      var wrapper = e.target.closest('[data-file]');
      if (!wrapper || e.target.tagName === 'INPUT' || e.target.closest('button')) return;
      var fname = wrapper.dataset.file;
      var ta3 = editorArea.querySelector('textarea');
      if (ta3) editContent[ta3.dataset.file] = ta3.value;
      renderFileViewer(fname, { content: editContent[fname] || '', language: 'Text', truncated: false });
      highlightActiveTab(fname);
    } else {
      var tab = e.target.closest('.file-tab');
      if (!tab) return;
      switchFile(tab.dataset.file);
    }
  });

  fileTabs.addEventListener('input', function(e) {
    if (!e.target.classList.contains('file-name-input')) return;
    var oldName = e.target.dataset.file;
    var newName = e.target.value;
    var idx = editFileNames.indexOf(oldName);
    if (idx !== -1) {
      editFileNames[idx] = newName;
      e.target.dataset.file = newName;
      if (editContent[oldName] !== undefined) { editContent[newName] = editContent[oldName]; delete editContent[oldName]; }
      var ta = editorArea.querySelector('textarea');
      if (ta && ta.dataset.file === oldName) { ta.dataset.file = newName; }
      var wrapper = e.target.closest('[data-file]');
      if (wrapper) wrapper.dataset.file = newName;
      var delBtn = wrapper ? wrapper.querySelector('.delete-file-btn') : null;
      if (delBtn) delBtn.dataset.file = newName;
    }
  });

  function collectFileNames() {
    document.querySelectorAll('.file-name-input').forEach(function(inp) {
      var oldName = inp.dataset.file;
      var newName = inp.value;
      if (oldName !== newName) {
        var idx = editFileNames.indexOf(oldName);
        if (idx !== -1) editFileNames[idx] = newName;
        if (editContent[oldName] !== undefined) { editContent[newName] = editContent[oldName]; delete editContent[oldName]; }
        inp.dataset.file = newName;
      }
    });
  }

  async function loadComments() {
    var g = selectedGistDetail;
    if (!g) return;
    try {
      var comments = await api('/gists/' + g.id + '/comments?per_page=100');
      renderComments(comments);
    } catch (e) {
      commentsList.innerHTML = '<div class="p-4 text-xs text-red-400">' + e.message + '</div>';
    }
  }

  function renderComments(comments) {
    commentCount.textContent = comments.length;
    if (comments.length === 0) {
      commentsList.innerHTML = '<div class="p-4 text-xs text-gray-500 text-center">' + I18N.t('comments.noComments') + '</div>';
      return;
    }
    var locale = I18N.lang || 'zh-CN';
    commentsList.innerHTML = comments.map(function(c) {
      return '<div class="px-4 py-3"><div class="flex items-center gap-2 mb-1.5"><img src="' + escAttr(c.user ? c.user.avatar_url : '') + '" class="w-5 h-5 rounded-full" alt=""><span class="text-xs font-medium text-gray-300">' + escHtml(c.user ? c.user.login : '?') + '</span><span class="text-[10px] text-gray-600">' + new Date(c.created_at).toLocaleString(locale) + '</span></div><div class="text-xs text-gray-400 leading-relaxed ml-7">' + escHtml(c.body) + '</div></div>';
    }).join('');
  }

  postCommentBtn.addEventListener('click', async function() {
    var g = selectedGistDetail;
    if (!g) return;
    var body = commentInput.value.trim();
    if (!body) { showToast(I18N.t('comments.enterContent'), 'error'); return; }
    try {
      await api('/gists/' + g.id + '/comments', { method: 'POST', body: JSON.stringify({ body: body }) });
      commentInput.value = '';
      showToast(I18N.t('comments.posted'), 'success');
      loadComments();
    } catch (e) {
      showToast(I18N.t('comments.postFailed', { message: e.message }), 'error');
    }
  });

  toggleCommentsBtn.addEventListener('click', function() {
    var hidden = commentsBody.style.display === 'none';
    commentsBody.style.display = hidden ? '' : 'none';
    commentsChevron.style.transform = hidden ? '' : 'rotate(180deg)';
  });

  function escHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function escAttr(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function resetContent() {
    emptyState.classList.remove('hidden');
    gistContent.classList.add('hidden');
  }

  window._rerender = function() {
    if (selectedGistDetail) {
      renderContent();
      renderGistList();
      loadComments();
    }
  };
  initAuth();
})();
<\/script>
</body>
</html>`;

/* ── Request router ──────────────────────────────── */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/login' && request.method === 'POST') {
      return handleLogin(request);
    }

    if (path === '/logout' && request.method === 'POST') {
      return handleLogout();
    }

    if (path.startsWith('/api/')) {
      const apiPath = path.replace('/api', '');
      return proxyApi(request, apiPath);
    }

    return new Response(HTML, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  },
};
