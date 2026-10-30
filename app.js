/* gástalo — domain functions are also exported for node --test. No runtime dependencies. */
(function (root) {
  "use strict";
  const SCHEMA_VERSION = 1;
  const TYPES = ["sources", "accounts", "categories"];
  // Local SVG symbols; brand artwork credits/licenses: icons/NOTICE.txt.
  // Persist only their keys, never SVG from user data.
  const ENTITY_ICONS = {
    income: {
      label: "Ingresos",
      path: '<path d="M12 19V5m-5 5 5-5 5 5M5 19h14"/>',
    },
    wallet: {
      label: "Billetera",
      path: '<path d="M20 8V6a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v10H5a3 3 0 0 1-3-3V7m18 6h-5a2 2 0 0 0 0 4h5"/><circle cx="16" cy="15" r=".5" fill="currentColor" stroke="none"/>',
    },
    tag: {
      label: "Etiqueta",
      path: '<path d="m3 12 9 9 9-9V3h-9L3 12Z"/><circle cx="16" cy="8" r="1"/>',
    },
    bank: {
      label: "Banco",
      path: '<path d="m3 8 9-5 9 5H3Zm2 3v7m5-7v7m4-7v7m5-7v7M3 21h18"/>',
    },
    card: {
      label: "Tarjeta",
      path: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20M6 15h4"/>',
    },
    home: {
      label: "Hogar",
      path: '<path d="m3 11 9-8 9 8M5 10v11h14V10M10 21v-7h4v7"/>',
    },
    food: {
      label: "Comida",
      path: '<path d="M5 3v6m3-6v6M3 3v6a3 3 0 0 0 6 0M6 12v9M18 3c-4 2-4 9 0 9h2M20 3v18"/>',
    },
    coffee: {
      label: "Café",
      path: '<path d="M3 8h13v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8Zm13 1h2a3 3 0 0 1 0 6h-2M6 3v2m4-2v2"/>',
    },
    car: {
      label: "Auto",
      path: '<path d="m4 9 2-5h12l2 5M3 10h18v8H3v-8Zm2 8v3m14-3v3M6 13h2m8 0h2"/>',
    },
    bus: {
      label: "Transporte",
      path: '<rect x="5" y="2" width="14" height="18" rx="3"/><path d="M5 10h14M8 20l-2 2m10-2 2 2M8 15h1m6 0h1M9 5h6"/>',
    },
    health: {
      label: "Salud",
      path: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z"/>',
    },
    gym: {
      label: "Gimnasio",
      path: '<path d="M7 8h10M7 16h10M3 7h4v10H3V7Zm14 0h4v10h-4V7ZM1 10v4m22-4v4"/>',
    },
    education: {
      label: "Estudios",
      path: '<path d="m2 8 10-5 10 5-10 5L2 8Zm4 2v7c4 3 8 3 12 0v-7m4-2v9"/>',
    },
    travel: {
      label: "Viajes",
      path: '<path d="m3 10 7 2 3 9 2-1-1-8 6-6a2 2 0 0 0-2-2l-6 6-8-1-1 1Z"/>',
    },
    gift: {
      label: "Regalo",
      path: '<path d="M3 8h18v5H3V8Zm2 5v8h14v-8M12 8v13M12 8C4 8 5 1 9 3l3 5Zm0 0c8 0 7-7 3-5l-3 5Z"/>',
    },
    work: {
      label: "Trabajo",
      path: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V3h8v4M3 12c5 3 13 3 18 0M10 13h4v4h-4z"/>',
    },
    shopping: {
      label: "Compras",
      path: '<path d="M4 7h16l-1 14H5L4 7Zm4 0V5a4 4 0 0 1 8 0v2"/>',
    },
    phone: {
      label: "Teléfono",
      path: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4m-3 14h2"/>',
    },
    spark: {
      label: "Tecnología",
      path: '<path d="m12 2-2 8-8 2 8 2 2 8 2-8 8-2-8-2-2-8Z"/>',
    },
    pet: {
      label: "Mascota",
      path: '<ellipse cx="6" cy="7" rx="2" ry="3"/><ellipse cx="18" cy="7" rx="2" ry="3"/><path d="M5 18c0-3 5-8 7-8s7 5 7 8c0 4-5 1-7 1s-7 3-7-1Z"/>',
    },
    bills: {
      label: "Servicios",
      path: '<path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2Zm3 5h6m-6 4h6m-6 4h3"/>',
    },
    bike: {
      label: "Bicicleta",
      path: '<circle cx="5" cy="16" r="4"/><circle cx="19" cy="16" r="4"/><path d="m5 16 5-9 5 9H5Zm5-9h6m-2-4h3l2 13M8 4h4"/>',
    },
    music: {
      label: "Música",
      path: '<path d="M9 18V5l12-2v13M9 8l12-2"/><ellipse cx="6" cy="19" rx="3" ry="2"/><ellipse cx="18" cy="17" rx="3" ry="2"/>',
    },
    shield: {
      label: "Seguro",
      path: '<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4Zm-4 10 3 3 5-6"/>',
    },
    groceries: {
      label: "Supermercado",
      path: '<path d="M2 3h3l3 13h11l3-9H6M9 20h.01M18 20h.01M10 7V4m5 3V4"/>',
    },
    fuel: {
      label: "Combustible",
      path: '<path d="M3 21h12M5 21V4h8v17M5 10h8m0 3h3v5a2 2 0 0 0 4 0V8l-3-3m1 1v4h2"/>',
    },
    parking: {
      label: "Estacionamiento",
      path: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/>',
    },
    taxi: {
      label: "Taxi",
      path: '<path d="M9 6V3h6v3M4 11l2-5h12l2 5M3 11h18v7H3v-7Zm2 7v3m14-3v3M6 14h2m8 0h2"/>',
    },
    electricity: {
      label: "Electricidad",
      path: '<path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z"/>',
    },
    water: {
      label: "Agua",
      path: '<path d="M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13ZM8 15a4 4 0 0 0 4 4"/>',
    },
    gas: {
      label: "Gas",
      path: '<path d="M13 2c2 7-4 7-3 12-3-1-4-3-4-5-5 7-1 13 6 13 8 0 12-10 1-20Zm-1 12c-5 5-2 8 1 7 3-1 2-4-1-7Z"/>',
    },
    internet: {
      label: "Internet",
      path: '<path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8 16a6 6 0 0 1 8 0"/><circle cx="12" cy="20" r="1"/>',
    },
    clothing: {
      label: "Ropa",
      path: '<path d="m8 3-6 4 3 5 3-2v11h8V10l3 2 3-5-6-4a4 4 0 0 1-8 0Z"/>',
    },
    beauty: {
      label: "Cuidado personal",
      path: '<circle cx="5" cy="6" r="3"/><circle cx="5" cy="18" r="3"/><path d="m8 8 13 13M8 16 21 3M12 12l-4-4"/>',
    },
    pharmacy: {
      label: "Farmacia",
      path: '<path d="m9 5-4 4a6 6 0 0 0 10 10l4-4A6 6 0 0 0 9 5Zm-2 2 10 10"/>',
    },
    dental: {
      label: "Dentista",
      path: '<path d="M12 5C3-1 2 7 5 13c1 2 1 8 3 8s2-7 4-7 2 7 4 7 2-6 3-8c3-6 2-14-7-8Zm0 0 3 2"/>',
    },
    baby: {
      label: "Bebé",
      path: '<circle cx="12" cy="13" r="9"/><path d="M12 4c4-3 5 3 1 3M8 12h.01M16 12h.01M9 16c2 2 4 2 6 0"/>',
    },
    family: {
      label: "Familia",
      path: '<circle cx="8" cy="6" r="3"/><circle cx="18" cy="8" r="2"/><path d="M2 21v-4a6 6 0 0 1 12 0v4m2-7a4 4 0 0 1 6 3v4"/>',
    },
    cinema: {
      label: "Cine",
      path: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 8h4m-4 8h4m10-8h4m-4 8h4m-14-4h10"/>',
    },
    games: {
      label: "Videojuegos",
      path: '<path d="M7 7h10c4 0 7 13 3 13l-5-4H9l-5 4C0 20 3 7 7 7ZM7 10v4m-2-2h4m7-1h.01M18 14h.01M12 7V3"/>',
    },
    drinks: {
      label: "Salidas y bebidas",
      path: '<path d="m3 3 9 10 9-10H3Zm9 10v8m-5 0h10M7 7h10"/>',
    },
    books: {
      label: "Libros",
      path: '<path d="M12 6C8 3 5 3 2 4v16c3-1 6-1 10 2 4-3 7-3 10-2V4c-3-1-6-1-10 2Zm0 0v16"/>',
    },
    repair: {
      label: "Reparaciones",
      path: '<path d="M21 3a6 6 0 0 1-8 8l-9 9a2 2 0 0 1-3-3l9-9a6 6 0 0 1 8-8l-4 4 3 3 4-4Z"/>',
    },
    furniture: {
      label: "Muebles",
      path: '<path d="M5 11V6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v5M5 16v-3a2 2 0 0 0-4 0v6h22v-6a2 2 0 0 0-4 0v3H5Zm-2 3v3m18-3v3"/>',
    },
    laundry: {
      label: "Lavandería",
      path: '<rect x="3" y="2" width="18" height="20" rx="2"/><circle cx="12" cy="14" r="5"/><path d="M3 7h18M6 4.5h.01M9 4.5h.01M8 14c3-3 5 3 8 0"/>',
    },
    charity: {
      label: "Donaciones",
      path: '<path d="M12 11 6 6a3 3 0 0 1 6-3 3 3 0 0 1 6 3l-6 5ZM2 16h4l4-3h5a2 2 0 0 1 0 4h-4m6-1 3-2a2 2 0 0 1 2 3l-7 5H8l-6-3"/>',
    },
    taxes: {
      label: "Impuestos",
      path: '<path d="M5 2h10l4 4v16H5V2Zm10 0v5h4M8 10h8m-7 9 6-6"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="18" r="1"/>',
    },
    subscriptions: {
      label: "Suscripciones",
      path: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="m10 9 5 3-5 3V9ZM7 2h10M7 22h10"/>',
    },
    investments: {
      label: "Inversiones",
      path: '<path d="M3 3v18h18M6 16l5-5 4 3 6-9m-6 0h6v6"/>',
    },
    loan: {
      label: "Crédito y deudas",
      path: '<circle cx="15" cy="6" r="4"/><path d="M15 4v4m-1-3h2m-2 2h2M2 14h4l4-3h4a2 2 0 0 1 0 4h-3m5-1 3-2a2 2 0 0 1 2 3l-7 5H8l-6-3"/>',
    },
    unexpected: {
      label: "Imprevistos",
      path: '<path d="m10 4-8 14a2 2 0 0 0 2 3h16a2 2 0 0 0 2-3L14 4a2 2 0 0 0-4 0ZM12 9v5m0 3h.01"/>',
    },
    chatgpt: {
      label: "ChatGPT",
      path: '<g fill="currentColor" stroke="none" fill-rule="evenodd"><path d="M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z"/></g>',
    },
    apple: {
      label: "Apple",
      path: '<g fill="currentColor" stroke="none" fill-rule="evenodd"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/></g>',
    },
    revolut: {
      label: "Revolut",
      path: '<g fill="currentColor" stroke="none" fill-rule="evenodd"><path d="M20.9133 6.9566C20.9133 3.1208 17.7898 0 13.9503 0H2.424v3.8605h10.9782c1.7376 0 3.177 1.3651 3.2087 3.043.016.84-.2994 1.633-.8878 2.2324-.5886.5998-1.375.9303-2.2144.9303H9.2322a.2756.2756 0 0 0-.2755.2752v3.431c0 .0585.018.1142.052.1612L16.2646 24h5.3114l-7.2727-10.094c3.6625-.1838 6.61-3.2612 6.61-6.9494zM6.8943 5.9229H2.424V24h4.4704z"/></g>',
    },
    binance: {
      label: "Binance",
      path: '<g fill="currentColor" stroke="none" fill-rule="evenodd"><path d="M16.624 13.9202l2.7175 2.7154-7.353 7.353-7.353-7.352 2.7175-2.7164 4.6355 4.6595 4.6356-4.6595zm4.6366-4.6366L24 12l-2.7154 2.7164L18.5682 12l2.6924-2.7164zm-9.272.001l2.7163 2.6914-2.7164 2.7174v-.001L9.2721 12l2.7164-2.7154zm-9.2722-.001L5.4088 12l-2.6914 2.6924L0 12l2.7164-2.7164zM11.9885.0115l7.353 7.329-2.7174 2.7154-4.6356-4.6356-4.6355 4.6595-2.7174-2.7154 7.353-7.353z"/></g>',
    },
    grok: {
      label: "Grok",
      path: '<g fill="currentColor" stroke="none" fill-rule="evenodd"><path d="M9.27 15.29l7.978-5.897c.391-.29.95-.177 1.137.272.98 2.369.542 5.215-1.41 7.169-1.951 1.954-4.667 2.382-7.149 1.406l-2.711 1.257c3.889 2.661 8.611 2.003 11.562-.953 2.341-2.344 3.066-5.539 2.388-8.42l.006.007c-.983-4.232.242-5.924 2.75-9.383.06-.082.12-.164.179-.248l-3.301 3.305v-.01L9.267 15.292M7.623 16.723c-2.792-2.67-2.31-6.801.071-9.184 1.761-1.763 4.647-2.483 7.166-1.425l2.705-1.25a7.808 7.808 0 00-1.829-1A8.975 8.975 0 005.984 5.83c-2.533 2.536-3.33 6.436-1.962 9.764 1.022 2.487-.653 4.246-2.34 6.022-.599.63-1.199 1.259-1.682 1.925l7.62-6.815"/></g>',
    },
    robot: {
      label: "Robot",
      path: '<rect x="4" y="7" width="16" height="14" rx="4"/><path d="M12 7V4M1 12v5m22-5v5M9 17h6"/><circle cx="12" cy="3" r="1"/><circle cx="8" cy="12" r="1"/><circle cx="16" cy="12" r="1"/>',
    },
    skull: {
      label: "Calavera",
      path: '<path d="M8 17H6a2 2 0 0 1-2-2v-4a8 8 0 0 1 16 0v4a2 2 0 0 1-2 2h-2v4H8v-4Zm3 0v4m2-4v4m-2-7 1-2 1 2"/><circle cx="8" cy="11" r="2"/><circle cx="16" cy="11" r="2"/>',
    },
    etoro: {
      label: "eToro",
      path: '<g fill="currentColor" stroke="none" fill-rule="evenodd" transform="translate(1 1) scale(.2444)"><path d="M54.894 53.4c0 .161 0 .161-.16.322 0 .162-.16.162-.321.162H35.499v-3.386c0-4.676 5.61-6.933 9.938-6.933 4.167 0 9.457 2.257 9.457 6.933V53.4Zm-9.457-20.314c-9.777.16-20.516 5.804-20.516 17.25V67.75c0 11.608 10.739 17.09 20.516 17.251 7.052 0 14.906-2.902 18.753-9.19.16-.161 0-.483-.16-.645-3.366-1.934-5.29-3.063-8.655-4.836-.16 0-.16 0-.321.16-1.763 3.064-6.411 4.676-9.617 4.676-4.328 0-9.938-2.74-9.938-7.416v-5.16h27.088c1.443 0 2.565-1.128 2.565-2.579v-9.512c0-11.608-10.098-17.251-19.715-17.412m-18.555 2.257c.642-.645 1.122-1.129.481-1.129-1.122 0-8.334 1.129-9.777-4.353-1.443-5.481 6.411-21.765 6.732-22.41.16-.645-.32-1.451-1.282-1.451-.802 0-1.443.967-1.603.967C13.419 17.124 2.038 29.7.596 35.182-3.091 48.886 11.175 54.529 20.15 55.496c.16 0 .16-.161.16-.161v-4.837c.16-6.61 2.564-11.608 6.571-15.155m62.511-.161C87.951 29.7 76.731 17.124 68.556 6.967c-.16-.16-.64-.967-1.603-.967-.8 0-1.442.806-1.121 1.451.32.645 8.174 17.09 6.731 22.41-1.442 5.482-8.655 4.353-9.777 4.353-.641 0-.16.484.481 1.129 4.007 3.547 6.572 8.545 6.572 14.994v4.836c0 .162 0 .162.16.162 9.136-.806 23.08-6.45 19.394-20.153"/></g>',
    },
    playstation: {
      label: "PlayStation",
      path: '<g fill="currentColor" stroke="none" fill-rule="evenodd"><path d="M8.984 2.596v17.547l3.915 1.261V6.688c0-.69.304-1.151.794-.991.636.18.76.814.76 1.505v5.875c2.441 1.193 4.362-.002 4.362-3.152 0-3.237-1.126-4.675-4.438-5.827-1.307-.448-3.728-1.186-5.39-1.502zm4.656 16.241l6.296-2.275c.715-.258.826-.625.246-.818-.586-.192-1.637-.139-2.357.123l-4.205 1.5V14.98l.24-.085s1.201-.42 2.913-.615c1.696-.18 3.785.03 5.437.661 1.848.601 2.04 1.472 1.576 2.072-.465.6-1.622 1.036-1.622 1.036l-8.544 3.107V18.86zM1.807 18.6c-1.9-.545-2.214-1.668-1.352-2.32.801-.586 2.16-1.052 2.16-1.052l5.615-2.013v2.313L4.205 17c-.705.271-.825.632-.239.826.586.195 1.637.15 2.343-.12L8.247 17v2.074c-.12.03-.256.044-.39.073-1.939.331-3.996.196-6.038-.479z"/></g>',
    },
    hbo: {
      label: "HBO",
      path: '<g fill="currentColor" stroke="none" fill-rule="evenodd"><path d="M7.042 16.896H4.414v-3.754H2.708v3.754H.01L0 7.22h2.708v3.6h1.706v-3.6h2.628zm12.043.046C21.795 16.94 24 14.689 24 11.978a4.89 4.89 0 0 0-4.915-4.92c-2.707-.002-4.09 1.991-4.432 2.795.003-1.207-1.187-2.632-2.58-2.634H7.59v9.674l4.181.001c1.686 0 2.886-1.46 2.888-2.713.385.788 1.72 2.762 4.427 2.76zm-7.665-3.936c.387 0 .692.382.692.817 0 .435-.305.817-.692.817h-1.33v-1.634zm.005-3.633c.387 0 .692.382.692.817 0 .436-.305.818-.692.818h-1.33V9.373zm1.77 2.607c.305-.039.813-.387.992-.61-.063.276-.068 1.074.006 1.35-.204-.314-.688-.701-.998-.74zm3.43 0a2.462 2.462 0 1 1 4.924 0 2.462 2.462 0 0 1-4.925 0zm2.462 1.936a1.936 1.936 0 1 0 0-3.872 1.936 1.936 0 0 0 0 3.872Z"/></g>',
    },
    banco_union: {
      label: "Banco Unión",
      path: '<g stroke-width="1.35"><rect x="3" y="3" width="18" height="18"/><path d="M10 3C5 10 8 18 17 19M3 8c9-1 14 5 14 13M6 21c4-6 9-8 15-6"/></g>',
    },
    banco_bisa: {
      label: "Banco BISA",
      path: '<g fill="currentColor" stroke="none" fill-rule="evenodd" transform="translate(1 6.4) scale(.2)"><path d="M0 0 C3.3 0 6.6 0 10 0 C10.01 0.98 10.03 1.96 10.04 2.97 C10.1 6.6 10.18 10.24 10.26 13.88 C10.3 15.45 10.32 17.03 10.35 18.6 C10.38 20.86 10.43 23.13 10.49 25.39 C10.49 26.09 10.5 26.79 10.51 27.52 C10.6 30.58 10.86 32.74 12.34 35.45 C14 37 14 37 17 37.44 C20 37 20 37 21.94 35.94 C23.67 32.78 22.86 30.37 22 27 C18.56 24.71 17.01 24.82 13 25 C13 21.37 13 17.74 13 14 C22.93 13.52 22.93 13.52 27.44 15.56 C32.15 20.05 34.52 24.59 35.04 31.02 C34.93 36.76 32.94 40.94 29 45 C23.75 48.68 19.39 49.53 13 49 C7.73 47.19 4.06 44.77 1 40 C-0.27 36.18 -0.12 32.59 -0.1 28.61 C-0.1 27.8 -0.09 26.98 -0.09 26.14 C-0.09 23.53 -0.08 20.92 -0.06 18.31 C-0.06 16.54 -0.05 14.77 -0.05 13.01 C-0.04 8.67 -0.02 4.34 0 0 Z " transform="translate(3,4)"/><path d="M0 0 C3.62 0.38 3.62 0.38 7 1 C7.33 3.31 7.66 5.62 8 8 C6.31 9.56 6.31 9.56 4 11 C1.38 10.88 1.38 10.88 -1 10 C-3 7 -3 7 -2.75 4.44 C-2 2 -2 2 0 0 Z " transform="translate(43,4)"/><path d="M0 0 C0.48 3.44 0.68 6.57 0 10 C-1.74 11.53 -3.56 12.31 -5.64 13.32 C-9.46 16.04 -11.45 19.92 -13.77 23.92 C-16.68 28.87 -19.48 32.16 -25 34 C-26.56 34.07 -28.13 34.09 -29.69 34.06 C-31.11 34.04 -32.53 34.02 -34 34 C-34 30.7 -34 27.4 -34 24 C-32.76 23.61 -31.52 23.22 -30.25 22.81 C-25.2 20.88 -23.35 18.06 -20.42 13.59 C-15.37 6.11 -9.78 0 0 0 Z " transform="translate(88,3)"/><path d="M0 0 C3.63 0 7.26 0 11 0 C11 11.22 11 22.44 11 34 C7.37 34 3.74 34 0 34 C0 22.78 0 11.56 0 0 Z " transform="translate(40,18)"/><path d="M0 0 C3.92 3.47 6.37 6.78 7.01 12.01 C7.08 14.95 7.04 17.87 6.94 20.81 C6.92 21.83 6.9 22.85 6.88 23.9 C6.84 26.39 6.76 28.88 6.69 31.38 C3.39 31.38 0.09 31.38 -3.31 31.38 C-3.34 30.04 -3.36 28.7 -3.39 27.32 C-3.45 25.57 -3.5 23.82 -3.56 22.06 C-3.58 21.18 -3.59 20.3 -3.61 19.39 C-3.85 12.9 -3.85 12.9 -6.16 10.26 C-9.24 8.99 -11.17 9.42 -14.31 10.38 C-16.31 13.38 -16.31 13.38 -16.06 17 C-15.81 18.11 -15.57 19.23 -15.31 20.38 C-12.36 21.85 -9.57 21.44 -6.31 21.38 C-6.29 23.19 -6.27 25 -6.25 26.81 C-6.24 27.82 -6.23 28.83 -6.21 29.87 C-6.31 32.38 -6.31 32.38 -7.31 33.38 C-13.09 33.53 -18.29 32.82 -22.84 29.09 C-26.23 25.15 -28.1 20.37 -28.47 15.2 C-28.09 10.37 -26.43 6.05 -23.31 2.38 C-16.07 -3.19 -8.15 -4 0 0 Z " transform="translate(101.3125,20.625)"/></g>',
    },
    banco_ganadero: {
      label: "Banco Ganadero",
      path: '<g fill="currentColor" stroke="none" fill-rule="evenodd" transform="translate(3 0) scale(.88)"><path d="m9.3 3.5 13.2 9-4 2.4L5.3 6Zm-4.5 3 13.2 9-4 2.4L.8 9Zm-4.5 3 13.2 9-4 2.4L-3.7 12Z"/></g>',
    },
    banco_mercantil: {
      label: "Banco Mercantil Santa Cruz",
      path: '<circle cx="12" cy="12" r="10.5" stroke-width="1.2"/><g fill="currentColor" stroke="none" fill-rule="evenodd" transform="translate(-16.15 -11.5) scale(1.35)"><path d="M19.748,19.024c0,0.36,0,0.905,0.181,1.447c0,0.182,0,0.182,0,0.182c-0.363-0.182-0.543-0.543-0.725-0.905 c0-0.183-0.181-0.543-0.181-0.906c0-0.724,0.181-1.449,0.181-1.449c0.182-1.087,0.906-2.898,0.906-2.898s0-0.182,0,0l0,0 c-1.45,1.812-2.355,3.261-2.355,3.261c-0.181,0.182-0.181,0-0.181,0c0-0.725,0.181-3.261,0.181-3.261l0,0l0,0 c0,0-0.725,2.175-1.268,3.442c-0.363,1.088-0.544,1.269-0.544,1.269c-0.181,0.18-0.362,0.18-0.543,0.36 c-0.363,0.183-0.543,0-0.543,0c-0.182,0,0-0.181,0-0.181c0.362-0.18,1.086-1.267,1.449-2.354c0.725-1.63,1.269-3.442,1.269-3.442 c0-0.181,0-0.181,0-0.362h-0.181c-0.906,0-1.45,1.087-1.45,1.087c-0.362,0.725,0,1.269,0,1.269c0,0.182,0,0,0,0 c-0.725-0.181-0.362-1.087-0.362-1.087s0.362-1.631,3.08-1.449l0,0c0,0-0.181,2.355-0.181,2.898c0,0,0,0.181,0.181,0 c0,0,1.269-1.992,1.993-2.898c0,0,0,0,0.181,0c0,0,0.543,0,1.087,0l0,0l0,0c0,0-0.182,0-0.544,0.543 c-0.181,0.182-0.181,0.363-0.362,0.725c0,0-0.725,1.812-1.087,3.262C19.929,17.574,19.748,18.298,19.748,19.024"/><path d="M17.936,19.748c0-0.724,0.363-1.088,0.725-1.269c0.544-0.361,1.087-0.361,1.087-0.361 c0.362,0,0.544,0,0.724,0.181c0.363,0.181,0.544,0.543,0.544,0.543c0,0.183,0,0.363,0,0.543c-0.182,0.363-0.544,0.545-0.544,0.545 c-0.18,0,0,0,0,0c0.182-0.182,0.182-0.364,0.182-0.545c0-0.725-0.543-0.905-0.543-0.905c-0.362,0-0.544,0-0.724,0 c-0.726,0.181-0.726,1.086-0.726,1.086c-0.181,1.271,0.906,1.632,0.906,1.632c1.269,0.362,2.174-0.361,2.174-0.361 c0.906-0.726,0.543-1.812,0.543-1.812c-0.181-0.364-0.725-1.27-0.725-1.27c-0.362-0.362-0.362-0.725-0.543-1.086 c-0.182-0.363,0-0.726,0-1.088c0.181-0.362,0.543-0.905,1.63-1.087c0,0,0.724-0.182,1.269,0.182l0,0c0,0-0.182,0.543-0.363,0.905 l0,0h-0.182c0,0,0.182-0.905-0.724-0.725c0,0-0.543,0-0.906,0.725c0,0.182-0.181,0.543,0,0.906c0,0.182,0.363,0.725,0.543,1.087 c0,0,0.725,1.086,0.725,1.631c0,0,0.181,1.448-1.45,2.354c0,0-1.449,0.724-2.536,0C18.66,21.197,17.936,20.835,17.936,19.748"/><path d="M24.458,19.565c-0.906,0-1.269-0.541-1.449-1.267c-0.181-1.087,0.362-2.355,0.362-2.355 s0.906-3.08,2.899-2.898c0,0,0.543,0,0.906,0.181c0,0,0,0,0,0.182c0,0-0.362,0.905-0.543,1.449c0,0,0,0-0.181,0 c-0.363-0.181-0.544-0.544-0.363-0.725c0-0.181,0-0.181,0.181-0.362c0-0.182,0-0.182,0-0.182l0,0h-0.181 c-0.182,0-0.362,0.182-0.362,0.182c-0.906,0.182-1.631,2.536-1.631,2.536s-0.906,2.899,0.182,2.899c0,0,0.724,0.18,1.269-1.087 c0,0,0.361-0.726,0.543-1.631c0,0,0,0,0-0.182c0,0,0,0,0.181,0.182c0,0,0.363,0.725-0.181,1.812 C26.088,18.479,25.727,19.565,24.458,19.565"/></g>',
    },
    yango: {
      label: "Yango · espiral",
      path: '<path stroke-width="2.2" d="M12 12c-1.5 0-1.5-2.5.5-2.5 4 0 4.5 6.5-.5 6.5-7.5 0-8-11-.5-11 11 0 12 16 .5 16C5 21 1.5 16 2 10.5"/>',
    },
  };
  // Frequent everyday choices first; keep every persisted icon key available.
  const ENTITY_ICON_PAGES = [
    ["bank", "card", "wallet", "banco_union", "banco_bisa", "banco_ganadero", "banco_mercantil", "etoro", "revolut", "binance", "income", "tag", "drinks", "loan", "fuel", "unexpected", "investments", "home", "food", "subscriptions", "chatgpt", "apple", "health", "beauty"],
    ["gym", "shopping", "groceries", "coffee", "work", "travel", "bills", "phone", "internet", "spark", "games", "gift", "education", "pet", "repair", "bus", "grok", "robot", "playstation", "hbo", "yango", "car", "clothing", "shield"],
    ["parking", "electricity", "bike", "music", "water", "gas", "dental", "baby", "family", "cinema", "books", "furniture", "laundry", "charity", "taxi", "skull", "taxes", "pharmacy"],
  ];
  function entityIconKey(item, type) {
    return Object.hasOwn(ENTITY_ICONS, item?.icon)
      ? item.icon
      : { sources: "income", accounts: "wallet", categories: "tag" }[type];
  }
  const uid = () => globalThis.crypto.randomUUID();
  const copy = (value) => JSON.parse(JSON.stringify(value));
  const assert = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  function cents(value) {
    const match = /^(-?)(\d+)(?:[.,](\d{1,2}))?$/.exec(String(value).trim());
    assert(
      match,
      "Importe inválido. Usa hasta dos decimales, sin separador de miles.",
    );
    const n = BigInt(match[2]) * 100n + BigInt((match[3] || "").padEnd(2, "0"));
    const signed = match[1] ? -n : n;
    assert(
      signed <= BigInt(Number.MAX_SAFE_INTEGER) &&
        signed >= BigInt(Number.MIN_SAFE_INTEGER),
      "Importe demasiado grande.",
    );
    return Number(signed);
  }
  function sum(values) {
    let n = 0n;
    for (const value of values) n += BigInt(value);
    assert(
      n <= BigInt(Number.MAX_SAFE_INTEGER) &&
        n >= BigInt(Number.MIN_SAFE_INTEGER),
      "Total fuera del rango seguro.",
    );
    return Number(n);
  }
  function dateOK(s) {
    return (
      typeof s === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(s) &&
      s.slice(0, 4) !== "0000" &&
      Number.isFinite(new Date(s + "T12:00:00Z").getTime()) &&
      new Date(s + "T12:00:00Z").toISOString().slice(0, 10) === s
    );
  }
  function monthOK(s) {
    return (
      typeof s === "string" &&
      /^\d{4}-(0[1-9]|1[0-2])$/.test(s) &&
      s.slice(0, 4) !== "0000"
    );
  }
  function timeOK(value) {
    return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);
  }
  function formatDate(value) {
    return dateOK(value) ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(2, 4)}` : "";
  }
  function formatMonth(value) {
    return monthOK(value) ? `${value.slice(5, 7)}/${value.slice(2, 4)}` : "";
  }
  function localClock(now, timezone) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date(now));
    const p = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return { date: `${p.year.padStart(4, "0")}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}:${p.second}` };
  }
  function formatTimestamp(value, timezone) {
    const clock = localClock(value, timezone);
    return formatDate(clock.date) + " " + clock.time;
  }
  const movementTimezones = new Set();
  function transactionTimeFields(time, timezone) {
    if (time === "" || time == null) return { occurred_time: null, occurred_timezone: null };
    assert(timeOK(time), "Hora inválida. Usa el formato de 24 horas.");
    assert(typeof timezone === "string" && timezone, "Falta la zona horaria del movimiento.");
    if (!movementTimezones.has(timezone)) {
      try { new Intl.DateTimeFormat("es", { timeZone: timezone }); }
      catch { throw new Error("Zona horaria del movimiento inválida."); }
      movementTimezones.add(timezone);
    }
    return { occurred_time: time.length === 5 ? time + ":00" : time, occurred_timezone: timezone };
  }
  function compareTransactionDates(a, b) {
    const aTime = a.occurred_time ? a.occurred_time.padEnd(8, ":00") : "";
    const bTime = b.occurred_time ? b.occurred_time.padEnd(8, ":00") : "";
    return b.occurred_on.localeCompare(a.occurred_on) ||
      bTime.localeCompare(aTime) ||
      b.created_at.localeCompare(a.created_at);
  }
  function shiftMonth(month, offset) {
    const d = new Date(month + "-15T12:00:00Z");
    d.setUTCMonth(d.getUTCMonth() + offset);
    return d.toISOString().slice(0, 7);
  }
  function emptyState() {
    return {
      schemaVersion: SCHEMA_VERSION,
      profile: {
        id: "personal",
        base_currency: "BOB",
        timezone: "America/La_Paz",
      },
      sources: [],
      accounts: [],
      categories: [],
      tags: [],
      budgets: [],
      transactions: [],
      review: [],
      imports: [],
    };
  }
  // Fictional data only. Dates are relative to the visitor's first open/reset.
  function demoState(date) {
    assert(dateOK(date), "Fecha de demo inválida.");
    const s = emptyState(), month = date.slice(0, 7), previous = shiftMonth(month, -1);
    const entity = (id, name, icon) => ({ id: "demo-" + id, name, icon, currency: "BOB", archived_at: null });
    s.sources = [{ ...entity("salary", "Salary / Ingresos", "income"), expected_cents: 650000 }];
    s.accounts = [
      ["wallet", "Wallet", "wallet", 85000],
      ["bmsc", "BMSC (Banco Mercantil Santa Cruz)", "bank", 420000],
      ["ganadero", "Banco Ganadero", "bank", 680000],
      ["economico", "Banco Económico", "bank", 235000],
    ].map(([id, name, icon, opening_balance_cents]) => ({
      ...entity(id, name, icon), opening_balance_cents,
      opening_date: previous + "-01", exclude_from_total: false,
    }));
    s.categories = [
      ["food", "Comida", "food"], ["transport", "Transporte", "bus"],
      ["housing", "Vivienda", "home"], ["health", "Salud", "health"],
      ["entertainment", "Entretenimiento", "cinema"], ["services", "Servicios", "bills"],
    ].map(([id, name, icon]) => entity(id, name, icon));
    s.tags = [{ id: "demo-sample", name: "Datos de ejemplo", archived_at: null }];
    const limits = [140000, 45000, 200000, 50000, 60000, 40000];
    // Use the existing effective-month limits, with an explicit current-month plan.
    // Comida exceeds its new Bs 700 plan; the other five categories stay under.
    s.budgets = [previous, month].flatMap(period => s.categories.map((c, i) => ({
      id: `demo-budget-${period}-${i}`, category_id: c.id, month: period,
      limit_cents: period === month && i === 0 ? 70000 : limits[i],
    })));
    // Fifteen movements per month, including income and cash transfers.
    const movements = [
      ["salary", "bmsc", 650000, "Sueldo mensual"],
      ["bmsc", "housing", 180000, "Alquiler"],
      ["bmsc", "wallet", 50000, "Retiro de efectivo"],
      ["wallet", "food", 8500, "Almuerzo"],
      ["wallet", "transport", 1200, "Transporte urbano"],
      ["ganadero", "food", 32550, "Supermercado"],
      ["economico", "health", 18500, "Consulta médica"],
      ["wallet", "entertainment", 6500, "Cine"],
      ["bmsc", "services", 24000, "Internet y servicios"],
      ["wallet", "food", 6200, "Café y merienda"],
      ["ganadero", "transport", 18000, "Combustible"],
      ["economico", "entertainment", 12500, "Cena con amigos"],
      ["wallet", "health", 4800, "Farmacia"],
      ["ganadero", "food", 27800, "Compras de la semana"],
      ["bmsc", "economico", 45000, "Ahorro del mes"],
    ];
    for (const [periodIndex, period] of [previous, month].entries()) {
      const days = periodIndex === 0
        ? new Date(new Date(month + "-01T12:00:00Z").getTime() - 86400000).getUTCDate()
        : Number(date.slice(8));
      movements.forEach(([from, to, amount, note], i) => {
        const occurred_on = period + "-" + String(1 + Math.floor(i * (days - 1) / (movements.length - 1))).padStart(2, "0");
        const from_id = "demo-" + from, to_id = "demo-" + to;
        const timestamp = occurred_on + "T16:00:00Z", kind = direction(s, from_id, to_id);
        s.transactions.push({
          id: `demo-transaction-${periodIndex}-${i}`, kind,
          from_id, to_id, amount_cents: amount + (periodIndex && kind === "expense" ? 350 : 0),
          occurred_on, occurred_time: "12:00:00", occurred_timezone: s.profile.timezone,
          currency: "BOB", tag_ids: ["demo-sample"], note: "Ejemplo · " + note,
          status: "posted", created_at: timestamp, updated_at: timestamp,
        });
      });
    }
    return validateState(s);
  }
  function movementTagSuggestions(state, selected = [], limit = 6) {
    const counts = new Map();
    for (const t of state.transactions) if (t.status === "posted")
      for (const id of t.tag_ids) counts.set(id, (counts.get(id) || 0) + 1);
    const available = state.tags.filter((tag) => !tag.archived_at || selected.includes(tag.id));
    const popular = available.filter((tag) => !tag.archived_at).sort((a, b) =>
      (counts.get(b.id) || 0) - (counts.get(a.id) || 0) || a.name.localeCompare(b.name, "es") || a.id.localeCompare(b.id),
    ).slice(0, limit);
    return [...popular, ...available.filter((tag) => selected.includes(tag.id) && !popular.includes(tag))];
  }
  // Pure gesture rule. Entity types use the same keys as the stored collections.
  function canDrop(from, to) {
    if (!from || !to || from.id === to.id) return false;
    return (
      (from.type === "sources" && to.type === "accounts") ||
      (from.type === "accounts" &&
        (to.type === "categories" || to.type === "accounts"))
    );
  }
  // Decide before capturing the pointer or blocking native page scrolling.
  function gestureIntent({ dx, dy, onCircle, canDrag, canPan }) {
    const vertical = Math.abs(dy),
      horizontal = Math.abs(dx);
    if (onCircle && canDrag)
      return dx !== 0 || dy !== 0 ? "drag" : "pending";
    if (Math.hypot(dx, dy) <= 6) return "pending";
    if (onCircle && canPan && horizontal > vertical * 1.25)
      return "pan";
    return "scroll";
  }
  function transactionSwipeOutcome(offset, width) {
    if (offset >= -32) return "closed";
    return -offset >= Math.max(140, width * 0.65) ? "delete" : "revealed";
  }
  function backSwipeOutcome({ dx, dy, width, samples }) {
    const end = samples.at(-1);
    const start = samples.find(sample => sample.time >= end.time - 120);
    const elapsed = end.time - start.time;
    const velocity = elapsed > 0 ? (end.x - start.x) / elapsed : 0;
    // A short flick projects forward; holding still removes momentum, and a
    // deliberate reversal cancels even after passing the distance threshold.
    if (dx < 36 || Math.abs(dy) > 64 || dx <= Math.abs(dy) * 1.7 || velocity < -.15) return "cancel";
    const threshold = Math.min(110, Math.max(64, width * .22));
    return dx + Math.max(0, velocity) * 180 >= threshold ? "back" : "cancel";
  }
  function scrollEntityStrip({ x, y, left, right, top, bottom,
    scrollLeft, scrollWidth, clientWidth }, elapsedMs) {
    const max = Math.max(0, scrollWidth - clientWidth);
    const current = Math.max(0, Math.min(max, scrollLeft));
    if (!max || right <= left || x < left || x > right || y < top || y > bottom)
      return current;
    const edge = Math.min(48, (right - left) / 3);
    let strength = 0;
    if (x < left + edge) strength = -Math.pow(1 - (x - left) / edge, 2);
    else if (x > right - edge) strength = Math.pow(1 - (right - x) / edge, 2);
    // Bound elapsed time so a delayed frame cannot jump past several entities.
    const distance = strength * 0.7 * Math.max(0, Math.min(32, elapsedMs));
    return Math.max(0, Math.min(max, current + distance));
  }
  function direction(state, fromId, toId, index = null) {
    const resolve = (id) => {
      if (index) return index.get(id) || null;
      const type = TYPES.find((key) => state[key].some((e) => e.id === id));
      return type ? { id, type } : null;
    };
    const from = resolve(fromId),
      to = resolve(toId);
    if (!canDrop(from, to)) return null;
    return from.type === "sources"
      ? "income"
      : to.type === "categories"
        ? "expense"
        : "transfer";
  }
  const posted = (state) =>
    state.transactions.filter((t) => t.status === "posted");
  function balances(state) {
    const totals = new Map(state.accounts.map(a => [a.id, BigInt(a.opening_balance_cents)]));
    for (const t of state.transactions) {
      if (t.status !== "posted") continue;
      if (totals.has(t.to_id)) totals.set(t.to_id, totals.get(t.to_id) + BigInt(t.amount_cents));
      if (totals.has(t.from_id)) totals.set(t.from_id, totals.get(t.from_id) - BigInt(t.amount_cents));
    }
    return Object.fromEntries([...totals].map(([id, value]) => [id, sum([value])]));
  }
  function filterTransactions(state, filters = {}) {
    return posted(state).filter(
      (t) =>
        (!filters.start || t.occurred_on >= filters.start) &&
        (!filters.end || t.occurred_on <= filters.end) &&
        (!filters.kind || t.kind === filters.kind) &&
        (!filters.entities?.length ||
          filters.entities.includes(t.from_id) ||
          filters.entities.includes(t.to_id)) &&
        (!filters.tags?.length ||
          (filters.tagMode === "all"
            ? filters.tags.every((id) => t.tag_ids.includes(id))
            : filters.tags.some((id) => t.tag_ids.includes(id)))) &&
        (!filters.text ||
          t.note
            .toLocaleLowerCase("es")
            .includes(filters.text.toLocaleLowerCase("es"))),
    );
  }
  function entityMovementAmount(transaction, entityId) {
    if (transaction.from_id !== entityId && transaction.to_id !== entityId) return 0;
    const positive = transaction.kind !== "expense" &&
      (transaction.kind === "income" || transaction.to_id === entityId);
    return positive ? transaction.amount_cents : -transaction.amount_cents;
  }
  function entityDayTotals(state, entityId) {
    const days = new Map();
    for (const transaction of filterTransactions(state, { entities: [entityId] })) {
      if (!days.has(transaction.occurred_on)) days.set(transaction.occurred_on, []);
      days.get(transaction.occurred_on).push(entityMovementAmount(transaction, entityId));
    }
    return new Map([...days].map(([date, amounts]) => [date, sum(amounts)]));
  }
  function report(state, month, filters = {}) {
    const ts = filterTransactions(state, filters).filter(
      (t) => t.occurred_on.slice(0, 7) === month,
    );
    const income = sum(
      ts.filter((t) => t.kind === "income").map((t) => t.amount_cents),
    );
    const expense = sum(
      ts.filter((t) => t.kind === "expense").map((t) => t.amount_cents),
    );
    const byCategory = new Map(state.categories.map((c) => [c.id, []]));
    for (const t of ts)
      if (t.kind === "expense") byCategory.get(t.to_id)?.push(t.amount_cents);
    return {
      income,
      expense,
      net: sum([income, -expense]),
      categories: state.categories.map((c) => ({
        id: c.id,
        name: c.name,
        spent: sum(byCategory.get(c.id)),
      })),
    };
  }
  function budgetLimit(state, categoryId, month) {
    let latest = null;
    for (const record of state.budgets) {
      if (record.category_id === categoryId && record.month <= month &&
          (!latest || record.month > latest.month)) latest = record;
    }
    return latest?.limit_cents ?? null;
  }
  function budget(state, categoryId, month, monthly = report(state, month)) {
    const limit = budgetLimit(state, categoryId, month);
    const spent =
      monthly.categories.find((c) => c.id === categoryId)?.spent ||
      0;
    return {
      limit,
      spent,
      remaining: limit === null ? null : sum([limit, -spent]),
    };
  }
  function budgetTotals(state, month, monthly = report(state, month)) {
    const categories = monthly.categories.map((c) => {
      const limit = budgetLimit(state, c.id, month) ?? 0;
      return { limit, remaining: Math.max(0, sum([limit, -c.spent])) };
    });
    return {
      limit: sum(categories.map((c) => c.limit)),
      remaining: sum(categories.map((c) => c.remaining)),
    };
  }
  function budgetVisual(limit, spent) {
    if (limit === null || spent === 0) return { fill: 0, tone: "gray" };
    if (spent > limit) return { fill: 100, tone: "red" };
    // Compare integer cents exactly, including budgets near MAX_SAFE_INTEGER.
    const used = BigInt(spent),
      total = BigInt(limit);
    return {
      fill: Number((used * 10000n) / total) / 100,
      tone: used * 100n <= total * 65n ? "green" : "orange",
    };
  }
  function eraseEntity(state, key, id) {
    assert(TYPES.includes(key) && state[key].some((e) => e.id === id),
      "Entidad inexistente.");
    const next = copy(state);
    next[key] = next[key].filter((e) => e.id !== id);
    next.transactions = next.transactions.filter(
      (t) => t.from_id !== id && t.to_id !== id,
    );
    next.budgets = next.budgets.filter((b) => b.category_id !== id);
    return validateState(next);
  }
  function reorderEntities(state, key, orderedIds) {
    assert(TYPES.includes(key) && Array.isArray(orderedIds), "Orden de entidades inválido.");
    const visible = state[key].filter((item) => !item.archived_at);
    const ids = new Set(visible.map((item) => item.id));
    assert(orderedIds.length === visible.length && new Set(orderedIds).size === ids.size &&
      orderedIds.every((id) => ids.has(id)), "Orden de entidades inválido.");
    const next = copy(state), byId = new Map(next[key].map((item) => [item.id, item]));
    let index = 0;
    next[key] = next[key].map((item) => item.archived_at ? item : byId.get(orderedIds[index++]));
    return validateState(next);
  }
  function evolution(state, month, filters = {}) {
    return Array.from({ length: 12 }, (_, i) => {
      const m = shiftMonth(month, i - 11);
      return { month: m, ...report(state, m, filters) };
    });
  }
  // Read-only monthly history: flows for sources/categories, closing balance for accounts.
  function entityEvolution(state, id, month) {
    const type = TYPES.find((key) => state[key].some((e) => e.id === id));
    assert(type, "Entidad inexistente.");
    const item = state[type].find((e) => e.id === id);
    const ts = filterTransactions(state, { entities: [id] });
    return Array.from({ length: 12 }, (_, i) => {
      const m = shiftMonth(month, i - 11);
      const end = shiftMonth(m, 1) + "-01";
      const value =
        type === "accounts"
          ? sum([
              item.opening_date < end ? item.opening_balance_cents : 0,
              ...ts
                .filter((t) => t.occurred_on < end)
                .map((t) =>
                  t.to_id === id ? t.amount_cents : -t.amount_cents,
                ),
            ])
          : sum(
              ts
                .filter((t) => t.occurred_on.startsWith(m))
                .map((t) => t.amount_cents),
            );
      return { month: m, value };
    });
  }
  function validateState(s) {
    assert(
      s && s.schemaVersion === SCHEMA_VERSION,
      "Versión de respaldo no compatible.",
    );
    assert(
      s.profile?.base_currency === "BOB" &&
        typeof s.profile.id === "string" &&
        typeof s.profile.timezone === "string",
      "Perfil inválido: v1 usa BOB.",
    );
    try {
      new Intl.DateTimeFormat("es", { timeZone: s.profile.timezone });
    } catch {
      throw new Error("Zona horaria inválida.");
    }
    const collections = [
      ...TYPES,
      "tags",
      "budgets",
      "transactions",
      "review",
      "imports",
    ];
    for (const key of collections)
      assert(Array.isArray(s[key]), `Falta la colección ${key}.`);
    const ids = new Set();
    const integer = (n) => Number.isSafeInteger(n);
    for (const key of collections)
      for (const e of s[key]) {
        assert(
          e && typeof e.id === "string" && e.id.length > 0 && !ids.has(e.id),
          `ID inválido o duplicado en ${key}.`,
        );
        ids.add(e.id);
      }
    for (const key of [...TYPES, "tags"])
      for (const e of s[key]) {
        assert(
          typeof e.name === "string" &&
            e.name.trim() &&
            (e.archived_at === null || typeof e.archived_at === "string"),
          "Entidad inválida.",
        );
        if (key !== "tags") assert(e.currency === "BOB", "v1 solo admite BOB.");
        if (key !== "tags" && e.icon !== undefined)
          assert(
            typeof e.icon === "string" && Object.hasOwn(ENTITY_ICONS, e.icon),
            "Icono de entidad inválido.",
          );
        if (key === "accounts")
          assert(
            integer(e.opening_balance_cents) &&
              dateOK(e.opening_date) &&
              typeof e.exclude_from_total === "boolean",
            "Saldo inicial inválido.",
          );
        if (key === "sources")
          assert(
            e.expected_cents === null ||
              (integer(e.expected_cents) && e.expected_cents >= 0),
            "Meta de ingreso inválida.",
          );
      }
    const months = new Set();
    for (const b of s.budgets) {
      const k = b.category_id + "/" + b.month;
      assert(
        s.categories.some((c) => c.id === b.category_id) &&
          monthOK(b.month) &&
          !months.has(k) &&
          (b.limit_cents === null ||
            (integer(b.limit_cents) && b.limit_cents >= 0)),
        "Presupuesto inválido o duplicado.",
      );
      months.add(k);
    }
    const entityIndex = new Map(TYPES.flatMap(type => s[type].map(e => [e.id, { id: e.id, type }])));
    const tagIndex = new Set(s.tags.map(tag => tag.id));
    const validatedDates = new Set();
    const validTransactionDate = value => {
      if (validatedDates.has(value)) return true;
      if (!dateOK(value)) return false;
      validatedDates.add(value);
      return true;
    };
    for (const t of s.transactions) {
      assert(
        direction(s, t.from_id, t.to_id, entityIndex) === t.kind && t.kind !== null,
        "Dirección de movimiento inválida.",
      );
      assert(
        integer(t.amount_cents) &&
          t.amount_cents > 0 &&
          validTransactionDate(t.occurred_on) &&
          t.currency === "BOB",
        "Importe, moneda o fecha inválida.",
      );
      assert(
        ["posted", "deleted"].includes(t.status) &&
          typeof t.note === "string" &&
          typeof t.created_at === "string" &&
          typeof t.updated_at === "string",
        "Movimiento inválido.",
      );
      if (t.occurred_time != null) assert(timeOK(t.occurred_time), "Hora del movimiento inválida.");
      transactionTimeFields(t.occurred_time, t.occurred_timezone);
      assert(t.occurred_time != null || t.occurred_timezone == null,
        "La zona horaria requiere una hora del movimiento.");
      assert(
        Array.isArray(t.tag_ids) &&
          new Set(t.tag_ids).size === t.tag_ids.length &&
          t.tag_ids.every((id) => tagIndex.has(id)),
        "Etiquetas inválidas.",
      );
    }
    for (const r of s.review)
      assert(
        typeof r.reason === "string" &&
          Array.isArray(r.raw) &&
          r.raw.every((v) => typeof v === "string") &&
          Number.isSafeInteger(r.record),
        "Fila de revisión inválida.",
      );
    for (const i of s.imports)
      assert(
        typeof i.fingerprint === "string" && typeof i.imported_at === "string",
        "Metadatos de importación inválidos.",
      );
    balances(s); // Reject overflow before a replacement is committed.
    for (const m of new Set(
      s.transactions.map((t) => t.occurred_on.slice(0, 7)),
    )) {
      const r = report(s, m);
      for (const c of r.categories) {
        const limit = budgetLimit(s, c.id, m);
        if (limit !== null) sum([limit, -c.spent]);
      }
    }
    return s;
  }
  function backup(state, now = new Date().toISOString()) {
    validateState(state);
    return JSON.stringify({ ...state, exported_at: now }, null, 2);
  }
  function restore(text) {
    const s = JSON.parse(text);
    validateState(s);
    delete s.exported_at;
    return s;
  }

  async function backupHash(payload) {
    const data = JSON.parse(payload);
    delete data.exported_at;
    const digest = await globalThis.crypto.subtle.digest(
      "SHA-256", new TextEncoder().encode(JSON.stringify(data)),
    );
    return Array.from(new Uint8Array(digest), (v) =>
      v.toString(16).padStart(2, "0")).join("");
  }
  function utf8Base64(text) {
    return btoa(Array.from(new TextEncoder().encode(text), (v) =>
      String.fromCharCode(v)).join(""));
  }
  function shouldSync(config, online, hash) {
    return !!config.token && online && !config.paused &&
      (config.checkAfterReset || hash !== config.lastHash);
  }
  function syncErrorMessage(status) {
    if (status === 401 || status === 403) return "Token inválido o sin permiso";
    if (status == null) return "Sin conexión, se reintentará";
    if (status === 0) return "Revisa Repo, Branch y Path";
    return "No se pudo sincronizar. Revisa el repositorio y sus permisos";
  }
  function syncRequest(config, payload, sha) {
    const { repo, branch, path, token } = config;
    // Encode each segment and forbid traversal; credentials only go to this host.
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo) || !branch || !path ||
        [...repo.split("/"), ...path.split("/")].some((s) => !s || s === "." || s === ".."))
      throw { status: 0 };
    const url = "https://api.github.com/repos/" +
      repo.split("/").map(encodeURIComponent).join("/") + "/contents/" +
      path.split("/").map(encodeURIComponent).join("/");
    const options = {
      method: payload === undefined ? "GET" : "PUT",
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
    };
    if (payload === undefined)
      return { url: url + "?ref=" + encodeURIComponent(branch), options };
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify({
      message: "sync: backup " + JSON.parse(payload).exported_at,
      content: utf8Base64(payload),
      branch,
      ...(sha ? { sha } : {}),
    });
    return { url, options };
  }
  async function uploadBackup(config, payload, signal, fetcher = globalThis.fetch, replacementSha) {
    const request = (data, sha) => {
      const { url, options } = syncRequest(config, data, sha);
      return fetcher(url, { ...options, signal });
    };
    const localCount = JSON.parse(payload).transactions.filter((t) => t.status === "posted").length;
    // Check contents with their SHA (via Git Blobs for large files), including conflict retries.
    // Remote contents never enter the app state; unreadable backups are not overwritten.
    for (let attempt = 0; attempt < 2; attempt++) {
      const metadata = await request();
      if (!metadata.ok && metadata.status !== 404)
        throw { status: metadata.status };
      let sha;
      if (metadata.status !== 404) {
        let remote = await metadata.json();
        sha = remote.sha;
        assert(sha, "No se pudo leer el respaldo remoto.");
        if (remote.encoding === "none" || remote.content === "") {
          const { url, options } = syncRequest(config);
          const blob = await fetcher(url.split("/contents/")[0] + "/git/blobs/" + encodeURIComponent(sha),
            { ...options, signal });
          if (!blob.ok) throw { status: blob.status };
          remote = await blob.json();
        }
        assert(remote.encoding === "base64" && typeof remote.content === "string", "No se pudo leer el respaldo remoto.");
        const data = restore(new TextDecoder("utf-8", { fatal: true }).decode(
          Uint8Array.from(atob(remote.content.replace(/[\r\n]/g, "")), (c) => c.charCodeAt(0)),
        ));
        const remoteCount = data.transactions.filter((t) => t.status === "posted").length;
        if ((config.checkAfterReset || (localCount === 0 && remoteCount > 0) ||
            (remoteCount >= 20 && localCount < remoteCount / 2)) && sha !== replacementSha)
          throw { replacementRequired: true, localCount, remoteCount, sha };
      }
      signal?.throwIfAborted();
      const result = await request(payload, sha);
      if (result.ok) return;
      if (attempt === 0 && [409, 422].includes(result.status)) continue;
      throw { status: result.status };
    }
  }

  // RFC 4180 records, including escaped quotes and embedded CR/LF. Blank records delimit sections.
  function csvRecords(input) {
    let text = input.replace(/^\uFEFF/, "").replace(/^sep=,\r?\n/, "");
    const rows = [];
    let row = [],
      field = "",
      quoted = false,
      closed = false;
    const cell = () => {
      row.push(field);
      field = "";
      closed = false;
    };
    const record = () => {
      cell();
      rows.push(row);
      row = [];
    };
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quoted) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            quoted = false;
            closed = true;
          }
        } else field += ch;
      } else if (ch === '"') {
        assert(!field && !closed, "Comillas CSV inválidas.");
        quoted = true;
      } else if (ch === ",") cell();
      else if (ch === "\r" || ch === "\n") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        record();
      } else {
        assert(!closed, "Texto después del cierre de comillas.");
        field += ch;
      }
    }
    assert(!quoted, "El CSV termina dentro de una celda entre comillas.");
    if (field || row.length || closed) record();
    return rows;
  }
  const HEADERS = [
    [
      "Data",
      "Type",
      "From",
      "To",
      "Tags",
      "Amount",
      "Currency",
      "Amount converted",
      "Currency of conversion",
      "Recurrence",
      "Note",
    ],
    ["Name", "Budget", "Received to date", "Icon", "Currency"],
    ["Name", "Current amount", "Icon", "Currency"],
    ["Name", "Budget", "Received to date", "Icon", "Currency"],
    ["Name", "Received to date"],
  ];
  function importCSV(
    text,
    month = null,
    fingerprint = "csv",
    now = new Date().toISOString(),
  ) {
    month = month === "" ? null : month;
    assert(month === null || monthOK(month), "El mes de los límites del CSV es inválido.");
    const fallbackDate = month ? month + "-01" : now.slice(0, 10);
    const groups = [];
    let group = [];
    for (const row of csvRecords(text)) {
      if (row.every((v) => v === "")) {
        if (group.length) {
          groups.push(group);
          group = [];
        }
      } else group.push(row);
    }
    if (group.length) groups.push(group);
    assert(
      groups.length === 5,
      "Se esperan transacciones y las cuatro secciones: fuentes, cuentas, categorías y etiquetas.",
    );
    groups.forEach((g, i) =>
      assert(
        JSON.stringify(g[0]) === JSON.stringify(HEADERS[i]),
        `Cabecera inesperada en sección ${i + 1}.`,
      ),
    );
    const s = emptyState(),
      current = new Map();
    let sequence = 0;
    const id = () => "csv-" + ++sequence;
    for (const [index, key] of [
      [1, "sources"],
      [2, "accounts"],
      [3, "categories"],
      [4, "tags"],
    ]) {
      for (const row of groups[index].slice(1)) {
        assert(
          row.length === HEADERS[index].length && row[0].trim(),
          `Entidad incompleta en ${key}.`,
        );
        const e = {
          id: id(),
          name: row[0],
          archived_at: null,
          import_metadata: { raw: row, section: key },
        };
        if (key !== "tags") {
          assert(
            row.at(-1) === "BOB",
            `La entidad «${row[0]}» usa ${row.at(-1)}. v1 solo admite BOB.`,
          );
          e.currency = "BOB";
        }
        if (key === "sources") {
          e.expected_cents = row[1] === "" ? null : cents(row[1]);
          assert(
            e.expected_cents === null || e.expected_cents >= 0,
            "Meta negativa.",
          );
        }
        if (key === "accounts") {
          current.set(e.id, cents(row[1]));
          e.opening_balance_cents = 0;
          e.opening_date = fallbackDate;
          e.exclude_from_total = false;
        }
        s[key].push(e);
        if (key === "categories") {
          const n = row[1] === "" ? null : cents(row[1]);
          assert(n === null || n >= 0, "Presupuesto negativo.");
          if (month !== null) s.budgets.push({
            id: id(),
            category_id: e.id,
            month,
            limit_cents: n,
          });
        }
      }
    }
    const entities = [...s.sources, ...s.accounts, ...s.categories];
    const resolve = (name) => {
      const matches = entities.filter((e) => e.name === name);
      assert(matches.length === 1, `Extremo ausente o ambiguo: ${name}`);
      return matches[0].id;
    };
    for (const [idx, row] of groups[0].slice(1).entries()) {
      try {
        assert(row.length === 11, "Cantidad de columnas inválida.");
        const [
          rawDate,
          type,
          from,
          to,
          tag,
          amount,
          currency,
          converted,
          convertedCurrency,
          recurrence,
          note,
        ] = row;
        assert(
          type === "Expense" || type === "Transfer",
          "Tipo externo desconocido.",
        );
        assert(recurrence === "None", "Recurrencia no compatible.");
        const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(rawDate);
        assert(match, "Fecha inválida; se espera M/D/YYYY.");
        const date = `${match[3]}-${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}`;
        assert(dateOK(date), "Fecha inexistente.");
        assert(
          currency === "BOB" &&
            (!convertedCurrency || convertedCurrency === "BOB"),
          "Moneda no compatible.",
        );
        const n = cents(amount);
        assert(n > 0, "El importe debe ser positivo.");
        if (converted !== "")
          assert(
            cents(converted) === n,
            "Importe convertido BOB inconsistente.",
          );
        const fromId = resolve(from),
          toId = resolve(to),
          kind = direction(s, fromId, toId);
        assert(
          kind && (type === "Expense") === (kind === "expense"),
          "Tipo y dirección incompatibles.",
        );
        let tagIds = [];
        if (tag) {
          const matches = s.tags.filter((e) => e.name === tag);
          assert(matches.length <= 1, "Etiqueta ambigua.");
          if (!matches.length)
            s.tags.push({ id: id(), name: tag, archived_at: null });
          tagIds = [s.tags.find((e) => e.name === tag).id];
        }
        s.transactions.push({
          id: id(),
          kind,
          from_id: fromId,
          to_id: toId,
          occurred_on: date,
          amount_cents: n,
          currency: "BOB",
          tag_ids: tagIds,
          note,
          status: "posted",
          created_at: now,
          updated_at: now,
          import_metadata: { fingerprint, record: idx + 2, raw: row },
        });
      } catch (e) {
        s.review.push({
          id: id(),
          record: idx + 2,
          raw: row,
          reason: e.message,
        });
      }
    }
    const net = balances(s);
    const earliest =
      s.transactions.map((t) => t.occurred_on).sort()[0] || fallbackDate;
    for (const a of s.accounts) {
      a.opening_balance_cents = sum([current.get(a.id), -net[a.id]]);
      a.opening_date = earliest;
    }
    s.imports.push({
      id: id(),
      fingerprint,
      imported_at: now,
      budget_month: month,
      accepted: s.transactions.length,
      pending: s.review.length,
    });
    return validateState(s);
  }
  const API = {
    SCHEMA_VERSION,
    ENTITY_ICONS,
    ENTITY_ICON_PAGES,
    entityIconKey,
    cents,
    sum,
    dateOK,
    timeOK,
    formatDate,
    formatMonth,
    localClock,
    transactionTimeFields,
    compareTransactionDates,
    shiftMonth,
    emptyState,
    demoState,
    movementTagSuggestions,
    direction,
    canDrop,
    gestureIntent,
    transactionSwipeOutcome,
    backSwipeOutcome,
    scrollEntityStrip,
    balances,
    filterTransactions,
    entityMovementAmount,
    entityDayTotals,
    report,
    budget,
    budgetTotals,
    budgetLimit,
    budgetVisual,
    eraseEntity,
    reorderEntities,
    evolution,
    entityEvolution,
    validateState,
    backup,
    restore,
    backupHash,
    utf8Base64,
    shouldSync,
    syncErrorMessage,
    syncRequest,
    uploadBackup,
    csvRecords,
    importCSV,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  if (typeof document !== "undefined") startApp(API);

  async function startApp() {
    const $ = (selector) => document.querySelector(selector);
    // Fixed for this document's lifetime, before any database/draft/config reads.
    const demoMode = new URL(location.href).searchParams.get("demo") === "1";
    const databaseName = demoMode ? "gastalo-demo" : "gastalo";
    const gestureHelpKey = databaseName + "-gesture-help";
    const movementDraftKey = databaseName + "-movement-draft";
    if (demoMode) {
      const banner = $("#demo-banner");
      banner.hidden = false;
      document.title = "gástalo · DEMO";
      // Modal dialogs occupy the browser's top layer, so repeat the notice there.
      const dialogBanner = banner.cloneNode(true);
      dialogBanner.id = "demo-dialog-banner";
      dialogBanner.querySelector("button").remove();
      $("#dialog").prepend(dialogBanner);
      // The personal app's install shortcut opens its real start_url. Demo stays a browser preview.
      $('link[rel="manifest"]')?.remove();
    }
    const esc = (value) =>
      String(value ?? "").replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c],
      );
    const money = (n) =>
      "Bs " +
      (n < 0 ? "−" : "") +
      Math.trunc(Math.abs(n) / 100).toLocaleString("es-BO") +
      "," +
      String(Math.abs(n) % 100).padStart(2, "0");
    const amountClass = (n) => n > 0 ? "amount-positive" : n < 0 ? "amount-negative" : "amount-neutral";
    const amountDescription = (n, label = "Importe") =>
      `${label}: ${n > 0 ? "positivo" : n < 0 ? "negativo" : "cero"}, ${money(Math.abs(n))}`;
    const decimal = (n) =>
      (n < 0 ? "-" : "") +
      Math.trunc(Math.abs(n) / 100) +
      "." +
      String(Math.abs(n) % 100).padStart(2, "0");
    const monthLabel = formatMonth;
    function dateControl({ name = "", id = "", value = "", type = "date", required = false, describedBy = "" }) {
      const display = type === "date" ? formatDate(value) : type === "month" ? formatMonth(value) : value.slice(0, 5);
      const placeholder = type === "date" ? "DD/MM/AA" : type === "month" ? "MM/AA" : "HH:MM";
      const icon = type === "time"
        ? '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
        : '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18"/>';
      return `<span class="date-control"><span class="date-value${display ? "" : " muted"}" aria-hidden="true">${esc(display || placeholder)}</span><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">${icon}</svg><input type="${type}"${name ? ` name="${esc(name)}"` : ""}${id ? ` id="${esc(id)}"` : ""} value="${esc(value)}"${required ? " required" : ""}${type === "time" ? ' step="1"' : ""}${describedBy ? ` aria-describedby="${esc(describedBy)}"` : ""}></span>`;
    }
    function updateDateControl(input) {
      const display = input.type === "date" ? formatDate(input.value)
        : input.type === "month" ? formatMonth(input.value) : input.value.slice(0, 5);
      const text = input.parentElement.querySelector(".date-value");
      text.textContent = display || (input.type === "date" ? "DD/MM/AA" : input.type === "month" ? "MM/AA" : "HH:MM");
      text.classList.toggle("muted", !display);
    }
    let state = emptyState(),
      revision = 0,
      db,
      view = "home",
      detailId = null,
      detailScope = "month",
      homeScroll = 0,
      homeStripScroll = [],
      editingEntities = false,
      undo = null,
      pendingImport = null,
      historyLimit = 100,
      busy = false;
    // Separate IndexedDB key: excluded from financial backups and entity deletion.
    const defaultSyncConfig = () => ({
      repo: "matiashaderspock-ai/gastalo-data",
      branch: "main",
      path: "gastalo-backup.json",
      token: "",
    });
    let syncConfig = demoMode ? null : defaultSyncConfig(), syncReady = false, syncFlight = null,
      syncQueued = false, syncTimer, resetting = false;
    function syncStatus() {
      return syncConfig.lastError || (syncConfig.lastSuccess
        ? "Última sincronización: " + formatTimestamp(syncConfig.lastSuccess, "America/La_Paz") + " · America/La_Paz"
        : syncConfig.token ? "Sin sincronizaciones todavía" : "Sincronización desactivada");
    }
    function updateSyncStatus() {
      const line = $("#sync-status");
      if (line) line.textContent = syncStatus();
    }
    function persistSyncConfig(config) {
      if (demoMode) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const tx = db.transaction("state", "readwrite");
        tx.objectStore("state").put(config, "sync_config");
        tx.oncomplete = resolve;
        tx.onerror = tx.onabort = () => reject(tx.error);
      });
    }
    function scheduleSync() {
      if (demoMode) return;
      clearTimeout(syncTimer);
      if (syncConfig.token && !syncConfig.paused) syncTimer = setTimeout(runSync, 30000);
    }
    function confirmSyncReplacement(error, config, hash) {
      if (demoMode) return;
      if (config !== syncConfig || !config.paused) return;
      const dialog = $("#dialog");
      if (dialog.open) {
        dialog.addEventListener("close", () => confirmSyncReplacement(error, config, hash), { once: true });
        return;
      }
      modal(
        "Confirmar reemplazo del respaldo",
        `<p>Tu respaldo en GitHub tiene ${error.remoteCount} movimientos y aquí hay ${error.localCount}. ¿Reemplazarlo con ${error.localCount === 0 ? "datos vacíos" : "los datos de este dispositivo"}?</p><div class="dialog-actions"><button type="button" data-action="close">Cancelar</button><button class="danger" type="submit">Reemplazar</button></div>`,
        async () => {
          if (config !== syncConfig) return;
          config.paused = false;
          await persistSyncConfig(config);
          // Close the prompt before starting another check; approval is tied to this payload/SHA.
          setTimeout(() => runSync({ hash, sha: error.sha }), 0);
        },
        { compact: true, focusSelector: '[data-action="close"]' },
      );
    }
    async function runSync(replacement) {
      if (demoMode || resetting || !syncReady || !syncConfig.token || syncConfig.paused || !navigator.onLine) return;
      if (syncFlight) {
        syncQueued = true;
        return;
      }
      const config = syncConfig, controller = new AbortController();
      syncFlight = controller;
      const timeout = setTimeout(() => controller.abort(), 20000);
      let hash;
      try {
        const payload = backup(state);
        hash = await backupHash(payload);
        if (controller.signal.aborted || config !== syncConfig ||
            !shouldSync(config, navigator.onLine, hash)) return;
        await uploadBackup(config, payload, controller.signal, globalThis.fetch,
          replacement?.hash === hash ? replacement.sha : undefined);
        if (controller.signal.aborted || config !== syncConfig) return;
        config.lastHash = hash;
        config.lastSuccess = new Date().toISOString();
        config.lastError = "";
        delete config.checkAfterReset;
        await persistSyncConfig(config);
      } catch (error) {
        if (!resetting && config === syncConfig) {
          if (error?.replacementRequired) {
            config.paused = true;
            clearTimeout(syncTimer);
            config.lastError = "Sincronización en pausa. Pulsa «Sincronizar ahora» para reintentar.";
          } else config.lastError = syncErrorMessage(error?.status);
          // Never display exception/response text: it may echo credentials.
          await persistSyncConfig(config).catch(() => {});
          if (error?.replacementRequired) confirmSyncReplacement(error, config, hash);
        }
      } finally {
        clearTimeout(timeout);
        syncFlight = null;
        updateSyncStatus();
        if (syncQueued) {
          syncQueued = false;
          setTimeout(runSync, 0);
        }
      }
    }
    async function saveSyncSettings(disable = false) {
      if (demoMode || !syncReady) return;
      try {
        const input = $("#sync-token");
        const next = disable ? { ...syncConfig, token: "" } : {
          ...syncConfig,
          repo: $("#sync-repo").value.trim(),
          branch: $("#sync-branch").value.trim(),
          path: $("#sync-path").value.trim(),
          token: input.value.trim() || syncConfig.token,
        };
        if (!disable) syncRequest(next);
        if (!disable) next.paused = false;
        if (["repo", "branch", "path", "token"].some((key) => next[key] !== syncConfig[key])) {
          delete next.lastHash;
          delete next.lastSuccess;
          delete next.lastError;
        }
        syncFlight?.abort();
        clearTimeout(syncTimer);
        syncConfig = next;
        input.value = "";
        input.placeholder = next.token ? "••••" + next.token.slice(-4) : "";
        await persistSyncConfig(next);
        updateSyncStatus();
        if (!disable) void runSync();
      } catch (error) {
        syncConfig.lastError = syncErrorMessage(error?.status ?? 0);
        updateSyncStatus();
      }
    }
    const today = () =>
      new Intl.DateTimeFormat("sv-SE", {
        timeZone: state.profile.timezone,
      }).format(new Date());
    let month = today().slice(0, 7);
    let budgetMonth = month;
    let archivedBudgetsOpen = false;
    const openManageGroups = new Set(), openSettingsGroups = new Set();
    const defaultFilters = () => ({
      start: "",
      end: "",
      entities: [],
      tags: [],
      tagMode: "any",
      kind: "",
      text: "",
    });
    let filters = defaultFilters(), filtersOpen = false;
    const allEntities = () => [
      ...state.sources,
      ...state.accounts,
      ...state.categories,
    ];
    let renderCache = { state: null, reports: new Map() };
    function cachedReport(period = month) {
      if (renderCache.state !== state) renderCache = { state, reports: new Map() };
      if (!renderCache.reports.has(period)) renderCache.reports.set(period, report(state, period));
      return renderCache.reports.get(period);
    }
    const currentBudget = (id, period = month) => budget(state, id, period, cachedReport(period));
    const currentBudgetTotals = (period = month) => budgetTotals(state, period, cachedReport(period));
    function currentBalances() {
      cachedReport();
      return renderCache.balances ??= balances(state);
    }
    const entity = (id) => {
      cachedReport();
      renderCache.entities ??= new Map(allEntities().map(e => [e.id, e]));
      return renderCache.entities.get(id);
    };
    const name = (id) => entity(id)?.name || "Sin entidad";
    const labels = {
      income: "Ingreso",
      expense: "Gasto",
      transfer: "Transferencia",
    };
    const active = (key) => state[key].filter((e) => !e.archived_at);
    let notificationTimer;
    function dismissNotification() {
      clearTimeout(notificationTimer);
      $("#toast").hidden = true;
    }
    function notify(message, canUndo = false) {
      clearTimeout(notificationTimer);
      $("#toast").hidden = false;
      $("#toast").innerHTML =
        `<span>${esc(message)}</span>${canUndo ? '<button data-action="undo">Deshacer</button>' : ""}<button data-action="dismiss" aria-label="Cerrar aviso">×</button>`;
      notificationTimer = setTimeout(
        dismissNotification,
        canUndo ? 8000 : 3000,
      );
    }
    async function load() {
      const record = await new Promise((resolve, reject) => {
        const tx = db.transaction("state", demoMode ? "readwrite" : "readonly");
        const store = tx.objectStore("state"), r = store.get("main");
        let loaded;
        r.onsuccess = () => {
          loaded = r.result;
          // Read and seed atomically: two first-open tabs cannot overwrite each other.
          if (demoMode && !loaded) {
            loaded = { data: demoState(today()), revision: 1 };
            store.put(loaded, "main");
          }
        };
        tx.oncomplete = () => resolve(loaded);
        tx.onerror = tx.onabort = () => reject(tx.error);
      });
      state = record?.data || emptyState();
      revision = record?.revision || 0;
      validateState(state);
    }
    async function commit(next, message, reversible = false, { reset = false, eraseSync = false } = {}) {
      assert(!busy, "Espera a que termine el guardado.");
      busy = true;
      if (reset) {
        resetting = true;
        syncFlight?.abort();
        clearTimeout(syncTimer);
        syncQueued = false;
      }
      // App writes replace state; retaining the previous snapshot keeps Undo atomic without a redundant JSON copy.
      const before = reversible ? state : null;
      try {
        validateState(next);
        await new Promise((resolve, reject) => {
          const tx = db.transaction("state", "readwrite"),
            store = tx.objectStore("state");
          let conflict = false;
          const r = store.get("main");
          r.onsuccess = () => {
            if ((r.result?.revision || 0) !== revision) {
              conflict = true;
              tx.abort();
            } else {
              if (reset && demoMode) store.clear();
              store.put({ data: next, revision: revision + 1 }, "main");
              if (reset && !demoMode) {
                if (eraseSync) store.delete("sync_config");
                else store.put({ ...syncConfig, checkAfterReset: true }, "sync_config");
              }
            }
          };
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error);
          tx.onabort = () =>
            reject(
              new Error(
                conflict
                  ? "Otra pestaña cambió tus datos. Recarga antes de guardar."
                  : "No se pudo guardar. Revisa el espacio disponible.",
              ),
            );
        });
        state = next;
        revision++;
        if (reset) {
          if (!demoMode) syncConfig = eraseSync ? defaultSyncConfig() : { ...syncConfig, checkAfterReset: true };
          pendingImport = null;
          keepMovementDraft(null);
          gestureHelpDismissed = false;
          openSettingsGroups.clear();
          try { localStorage.removeItem(gestureHelpKey); } catch {}
          detailId = null;
          detailScope = "month";
          homeScroll = 0;
          editingEntities = false;
          historyLimit = 100;
          month = today().slice(0, 7);
          filters = defaultFilters();
        } else scheduleSync();
        undo = reversible ? before : null;
        render();
        notify(message, reversible);
      } finally {
        resetting = false;
        busy = false;
      }
    }
    function options(items, value = "", blank = "") {
      return (
        (blank ? `<option value="">${esc(blank)}</option>` : "") +
        items
          .map(
            (e) =>
              `<option value="${esc(e.id)}" ${e.id === value ? "selected" : ""}>${esc(e.name)}${e.archived_at ? " (archivado)" : ""}</option>`,
          )
          .join("")
      );
    }
    function fitDialogToViewport() {
      const dialog = $("#dialog"), viewport = window.visualViewport;
      if (viewport) {
        dialog.style.setProperty("--dialog-viewport-top", `${viewport.offsetTop}px`);
        dialog.style.setProperty("--dialog-viewport-height", `${viewport.height}px`);
      }
      if (!dialog.open) return;
      requestAnimationFrame(() => {
        const field = document.activeElement;
        if (!dialog.open || !dialog.contains(field)) return;
        const bounds = dialog.getBoundingClientRect(), input = field.getBoundingClientRect();
        if (input.bottom > bounds.bottom - 16)
          dialog.scrollTop += input.bottom - bounds.bottom + 16;
        else if (input.top < bounds.top + 16)
          dialog.scrollTop += input.top - bounds.top - 16;
      });
    }
    window.visualViewport?.addEventListener("resize", fitDialogToViewport);
    window.visualViewport?.addEventListener("scroll", fitDialogToViewport);
    $("#dialog").addEventListener("focusin", fitDialogToViewport);
    function modal(
      title,
      html,
      onSubmit,
      {
        focusSelector = "input:not([type=hidden]),select,button",
        compact = false,
        hideTitle = false,
      } = {},
    ) {
      const dialog = $("#dialog");
      dialog.classList.toggle("compact-dialog", compact);
      dialog.classList.toggle("titleless-dialog", hideTitle);
      $("#dialog-title").textContent = title;
      $("#dialog-body").innerHTML = html;
      $("#modal-error").textContent = "";
      $("#modal-form").onsubmit = async (e) => {
        e.preventDefault();
        const button = $('#modal-form button[type="submit"]');
        if (button?.disabled) return;
        if (button) button.disabled = true;
        try {
          await onSubmit(new FormData(e.currentTarget));
          dialog.close();
        } catch (error) {
          $("#modal-error").textContent = error.message;
        } finally {
          if (button) button.disabled = false;
        }
      };
      const initialField = $("#dialog-body").querySelector(focusSelector);
      initialField?.setAttribute("autofocus", "");
      fitDialogToViewport();
      if (!dialog.open) dialog.showModal();
      initialField?.focus();
    }
    const actions = (save = "Guardar") =>
      `<div class="dialog-actions"><button type="button" data-action="close">Cancelar</button><button class="primary" type="submit">${save}</button></div>`;
    function resetApp() {
      if (demoMode) return resetDemo();
      modal(
        "¿Restablecer todo desde cero?",
        `<p>Se borrarán todos los movimientos, saldos, fuentes, cuentas, categorías, etiquetas, límites e importaciones de este dispositivo, junto con los ajustes de la aplicación.</p><p>Se conservarán los ajustes de sincronización y el respaldo que ya exista en GitHub.</p><button type="button" data-action="export">Descargar respaldo antes de borrar</button><label class="check"><input name="erase-sync" type="checkbox">También borrar el token de sincronización</label><p class="muted">Tendrás que crear y pegar un token nuevo</p><label class="check"><input name="confirm-reset" type="checkbox" required>Entiendo que se borrarán todos los datos de este dispositivo.</label><div class="dialog-actions"><button type="button" data-action="close">Cancelar</button><button class="danger" type="submit">Restablecer todo</button></div>`,
        async (data) => {
          assert(data.get("confirm-reset") === "on", "Confirma que quieres borrar todos los datos.");
          await commit(emptyState(), "Aplicación restablecida desde cero", false,
            { reset: true, eraseSync: data.get("erase-sync") === "on" });
        },
        { compact: true, focusSelector: '[data-action="close"]' },
      );
    }
    function resetDemo() {
      if (!demoMode) return;
      modal(
        "¿Restablecer la demo?",
        `<p>Se borrarán tus cambios en la demo y se cargarán nuevos datos de ejemplo. Tus datos personales no se modificarán.</p>${actions("Reset demo")}`,
        async () => {
          await commit(demoState(localClock(Date.now(), "America/La_Paz").date), "Demo restablecida · Datos de ejemplo", false, { reset: true });
        },
        { compact: true, focusSelector: '[data-action="close"]' },
      );
    }
    let movementDraft = null;
    try { movementDraft = JSON.parse(sessionStorage.getItem(movementDraftKey) || "null"); } catch {}
    function keepMovementDraft(value) {
      movementDraft = value;
      try {
        if (value) sessionStorage.setItem(movementDraftKey, JSON.stringify(value));
        else sessionStorage.removeItem(movementDraftKey);
      } catch { /* Keep an in-memory draft when session storage is unavailable. */ }
    }
    function movement(from = "", to = "", transaction = null, reviewId = null) {
      const t = transaction, draftOwner = uid(), pendingTags = [], returnView = view,
        scrollY = window.scrollY, scrollX = window.scrollX,
        stripScroll = [...document.querySelectorAll(".entity-strip")].map((strip) => strip.scrollLeft);
      const eventTimezone = t?.occurred_timezone || state.profile.timezone;
      const clock = localClock(new Date(), eventTimezone);
      const initialTime = t || reviewId ? t?.occurred_time || "" : clock.time;
      let selectedTags = [...(t?.tag_ids || [])], submitted = false, recovered = false;
      const draft = movementDraft?.transactionId === (t?.id || null) ? movementDraft : null;
      modal(
        t ? "Editar movimiento" : "Nuevo movimiento",
        `
        <section class="movement-tags" aria-label="Etiquetas del movimiento"><div id="movement-tag-chips" class="tag-choices"></div><button type="button" id="tag-picker-toggle" aria-label="Elegir o crear etiquetas" aria-expanded="false" aria-controls="tag-picker">+</button></section>
        <section id="tag-picker" class="movement-tag-picker" aria-label="Elegir etiquetas" hidden><div class="tag-search"><label>Buscar o crear etiqueta<input id="tag-search" type="search" maxlength="80" autocomplete="off" placeholder="Buscar o crear etiqueta"></label><button type="button" id="tag-create" aria-label="Crear etiqueta" hidden>+</button></div><div id="tag-picker-list"></div><p id="tag-search-empty" class="muted" hidden>Sin coincidencias.</p><button type="button" id="tag-picker-done">Listo</button></section>
        <div class="movement-fields">${draft ? '<aside class="draft-notice" aria-label="Borrador pendiente"><span>Tienes un borrador sin registrar.</span><button type="button" id="recover-draft">Recuperar</button><button type="button" id="discard-draft">Descartar</button></aside>' : ""}<div class="form-grid"><label>Origen<select name="from" required>${options(
          [...state.sources, ...state.accounts].filter(
            (e) => !e.archived_at || e.id === (t?.from_id || from),
          ),
          t?.from_id || from,
          "Elige origen",
        )}</select></label>
        <label>Destino<select name="to" required></select></label></div>
        <label>Importe · BOB<input name="amount" inputmode="decimal" required placeholder="0,00" value="${t ? decimal(t.amount_cents) : ""}" autocomplete="off"></label>
        <details class="movement-extras" ${t?.note ? "open" : ""}><summary>Nota</summary>
        <label>Nota<textarea name="note" rows="2" maxlength="4000">${esc(t?.note || "")}</textarea></label>
        <div id="movement-date-fields" class="form-grid" ${t || reviewId ? "" : "hidden"}><label>Fecha${dateControl({ name: "date", required: true, value: t?.occurred_on || clock.date })}</label><label>Hora${dateControl({ name: "time", type: "time", value: initialTime, describedBy: "movement-timezone" })}</label></div>
        ${t || reviewId ? "" : `<div id="movement-clock-info"><p class="movement-timestamp muted"><time datetime="${clock.date}T${initialTime}">${formatDate(clock.date)} · ${initialTime.slice(0, 5)}</time></p><button type="button" id="change-movement-clock">Cambiar fecha y hora</button></div>`}
        <p id="movement-timezone" class="movement-timezone muted">Hora local · ${esc(eventTimezone)}${t && !t.occurred_time ? " · Hora anterior no registrada" : ""}</p></details>${actions(t ? "Guardar cambios" : "Registrar")}</div>`,
        async (data) => {
          captureMovementDraft();
          // Existing records and metadata are immutable. Copy only collections
          // this form changes; the complete next state is still validated and
          // committed in one revision-checked IndexedDB transaction.
          const next = { ...state, transactions: [...state.transactions], tags: [...state.tags] },
            fromId = data.get("from"),
            toId = data.get("to"),
            kind = direction(next, fromId, toId),
            amount = cents(data.get("amount"));
          assert(kind, "Elige una dirección válida.");
          assert(amount > 0, "El importe debe ser mayor que cero.");
          const tagIds = selectedTags;
          next.tags.push(...pendingTags.filter((tag) => tagIds.includes(tag.id)));
          const now = new Date().toISOString();
          const record = {
            ...(t || {}),
            id: t?.id || uid(),
            kind,
            from_id: fromId,
            to_id: toId,
            occurred_on: data.get("date"),
            ...transactionTimeFields(data.get("time"), eventTimezone),
            amount_cents: amount,
            currency: "BOB",
            tag_ids: [...new Set(tagIds)],
            note: data.get("note"),
            status: "posted",
            created_at: t?.created_at || now,
            updated_at: now,
          };
          if (t)
            next.transactions[
              next.transactions.findIndex((e) => e.id === t.id)
            ] = record;
          else next.transactions.push(record);
          if (reviewId) {
            const r = next.review.find((r) => r.id === reviewId);
            record.import_metadata = {
              raw: r.raw,
              record: r.record,
              resolved_from_review: reviewId,
            };
            next.review = next.review.filter((r) => r.id !== reviewId);
          }
          await commit(
            next,
            t ? "Cambios guardados" : "Movimiento registrado",
            !!t,
          );
          submitted = true;
          if (movementDraft?.owner === draftOwner) keepMovementDraft(null);
        },
        {
          compact: true,
          hideTitle: !t,
          focusSelector:
            t || (from && to) ? '[name="amount"]' : '[name="from"]',
        },
      );
      const fromSelect = $('#dialog [name="from"]'),
        toSelect = $('#dialog [name="to"]');
      const update = (value) => {
        toSelect.innerHTML = options(
          [...state.accounts, ...state.categories].filter(
            (e) =>
              (!e.archived_at || e.id === t?.to_id) &&
              direction(state, fromSelect.value, e.id),
          ),
          value,
          "Elige destino",
        );
      };
      update(t?.to_id || to);
      fromSelect.onchange = () => update(toSelect.value || to);
      const availableTags = () => [...state.tags, ...pendingTags].filter((tag) => !tag.archived_at || t?.tag_ids.includes(tag.id) || selectedTags.includes(tag.id) ||
        (search.value.trim() && fold(tag.name).includes(fold(search.value))));
      const fold = (name) => name.trim().toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const tagChoice = (tag) => `<label><input type="checkbox" data-movement-tag value="${esc(tag.id)}" ${selectedTags.includes(tag.id) ? "checked" : ""}>${esc(tag.name)}</label>`;
      const search = $("#tag-search"), picker = $("#tag-picker"), toggle = $("#tag-picker-toggle"),
        dialog = $("#dialog"), title = $("#dialog-title").textContent,
        closeButton = $('#dialog .dialog-heading [data-action="close"]');
      const renderTags = () => {
        const tags = availableTags(), query = fold(search.value);
        const chips = $("#movement-tag-chips"), scrollLeft = chips.scrollLeft;
        chips.innerHTML = movementTagSuggestions({ ...state, tags }, selectedTags).map(tagChoice).join("") || '<span class="muted">Sin etiquetas</span>';
        chips.scrollLeft = scrollLeft;
        const matches = tags.filter((tag) => fold(tag.name).includes(query)).sort((a, b) => a.name.localeCompare(b.name, "es"));
        $("#tag-picker-list").innerHTML = matches.map(tagChoice).join("");
        $("#tag-search-empty").hidden = matches.length > 0;
        $("#tag-create").hidden = !query || state.tags.concat(pendingTags).some((tag) => fold(tag.name) === query);
        $("#tag-create").title = `Crear «${search.value.trim()}»`;
      };
      const chooseTag = (e) => {
        if (!e.target.matches("[data-movement-tag]")) return;
        selectedTags = e.target.checked ? [...new Set([...selectedTags, e.target.value])]
          : selectedTags.filter((id) => id !== e.target.value);
        renderTags();
      };
      $("#movement-tag-chips").onchange = picker.onchange = chooseTag;
      search.oninput = renderTags;
      const closePicker = () => {
        picker.hidden = true;
        dialog.classList.remove("choosing-tags");
        $("#dialog-title").textContent = title;
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus({ preventScroll: true });
      };
      toggle.onclick = () => {
        if (!picker.hidden) return closePicker();
        picker.hidden = false;
        dialog.classList.add("choosing-tags");
        $("#dialog-title").textContent = "Etiquetas";
        toggle.setAttribute("aria-expanded", "true");
        search.focus({ preventScroll: true });
      };
      $("#tag-picker-done").onclick = closePicker;
      const dismissPicker = (e) => {
        if (picker.hidden) return;
        e.preventDefault();
        e.stopPropagation();
        closePicker();
      };
      closeButton.addEventListener("click", dismissPicker);
      dialog.addEventListener("cancel", dismissPicker);
      $("#tag-create").onclick = () => {
        const name = search.value.trim();
        if (!name || state.tags.concat(pendingTags).some((tag) => fold(tag.name) === fold(name))) return;
        const tag = { id: uid(), name, archived_at: null };
        pendingTags.push(tag);
        selectedTags.push(tag.id);
        search.value = "";
        renderTags();
        captureMovementDraft();
        search.focus({ preventScroll: true });
      };
      search.onkeydown = (e) => {
        if (e.key === "Enter") { e.preventDefault(); if (!$("#tag-create").hidden) $("#tag-create").click(); }
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closePicker(); }
      };
      renderTags();
      const form = $("#modal-form"), initial = Object.fromEntries(new FormData(form));
      const changeClock = $("#change-movement-clock");
      if (changeClock) changeClock.onclick = () => {
        $("#movement-date-fields").hidden = false;
        $("#movement-clock-info").hidden = true;
        fitDialogToViewport();
      };
      if (draft) {
        $("#discard-draft").onclick = () => { keepMovementDraft(null); $(".draft-notice").remove(); };
        $("#recover-draft").onclick = () => {
          fromSelect.value = draft.from || "";
          update(draft.to || "");
          for (const key of ["amount", "note", "date", "time"]) if (typeof draft[key] === "string") form.elements[key].value = draft[key];
          pendingTags.push(...(Array.isArray(draft.pendingTags) ? draft.pendingTags : []).filter(tag => typeof tag?.id === "string" && typeof tag.name === "string" && !state.tags.some(e => e.id === tag.id)));
          selectedTags = (Array.isArray(draft.tagIds) ? draft.tagIds : []).filter(id => state.tags.concat(pendingTags).some(tag => tag.id === id));
          renderTags();
          if (draft.note || draft.date !== clock.date || draft.time !== initialTime) {
            $(".movement-extras").open = true;
            changeClock?.click();
          }
          document.querySelectorAll("#movement-date-fields input").forEach(updateDateControl);
          recovered = true;
          captureMovementDraft();
          $(".draft-notice").remove();
          form.elements.amount.focus();
        };
      }
      function captureMovementDraft() {
        if (submitted) return;
        const values = Object.fromEntries(new FormData(form));
        const dirty = ["amount", "note", "from", "to", "date", "time"].some(key => values[key] !== initial[key]) ||
          selectedTags.join("|") !== (t?.tag_ids || []).join("|");
        if (dirty || recovered) keepMovementDraft({ ...values, owner: draftOwner, transactionId: t?.id || null, tagIds: selectedTags, pendingTags });
      }
      const draftInput = event => {
        if (event.target.matches("[name], [data-movement-tag]")) captureMovementDraft();
      };
      form.addEventListener("input", draftInput);
      form.addEventListener("change", draftInput);
      window.addEventListener("pagehide", captureMovementDraft);
      dialog.addEventListener("close", () => {
        captureMovementDraft();
        form.removeEventListener("input", draftInput);
        form.removeEventListener("change", draftInput);
        window.removeEventListener("pagehide", captureMovementDraft);
        closeButton.removeEventListener("click", dismissPicker);
        dialog.removeEventListener("cancel", dismissPicker);
        dialog.classList.remove("choosing-tags");
        if (view !== returnView) return;
        document.querySelectorAll(".entity-strip").forEach((strip, index) => { strip.scrollLeft = stripScroll[index] || 0; });
        window.scrollTo(scrollX, scrollY);
      }, { once: true });
    }
    function editEntity(key, id = null) {
      const e = id ? state[key].find((e) => e.id === id) : null;
      const title = {
        sources: "fuente",
        accounts: "cuenta",
        categories: "categoría",
        tags: "etiqueta",
      }[key];
      modal(
        (e ? "Editar " : "Crear ") + title,
        `
        ${key !== "tags" ? iconChooser(key, e) : ""}
        <label>Nombre<input name="name" required maxlength="80" value="${esc(e?.name || "")}"></label>
        ${key === "accounts" ? `<label>Saldo inicial · BOB<input name="opening" inputmode="decimal" required value="${e ? decimal(e.opening_balance_cents) : "0.00"}"></label><label>Fecha del saldo inicial${dateControl({ name: "openingDate", required: true, value: e?.opening_date || today() })}</label><label class="check"><input type="checkbox" name="exclude" ${e?.exclude_from_total ? "checked" : ""}>Excluir del saldo total</label>` : ""}
        ${key === "sources" ? `<label>Ingreso mensual previsto · BOB (opcional)<input name="expected" inputmode="decimal" value="${e?.expected_cents == null ? "" : decimal(e.expected_cents)}"></label>` : ""}
        ${key === "categories" ? `<label>Límite mensual · desde ${esc(monthLabel(month))}<input name="limit" inputmode="decimal" value="${e && currentBudget(e.id).limit !== null ? decimal(currentBudget(e.id).limit) : ""}" placeholder="Sin límite"></label>` : ""}
        ${e ? `<label class="check"><input type="checkbox" name="archived" ${e.archived_at ? "checked" : ""}>Archivar (conserva historial)</label>` : ""}${actions()}`,
        async (data) => {
          const next = copy(state),
            n = data.get("name").trim();
          assert(n, "Escribe un nombre.");
          assert(
            !next[key].some(
              (item) =>
                item.id !== id &&
                item.name.toLocaleLowerCase("es") === n.toLocaleLowerCase("es"),
            ),
            "Ya existe ese nombre.",
          );
          const item = {
            ...(e || {}),
            id: e?.id || uid(),
            name: n,
            archived_at: data.get("archived")
              ? e?.archived_at || new Date().toISOString()
              : null,
          };
          if (key !== "tags") {
            item.currency = "BOB";
            item.icon = data.get("icon");
          }
          if (key === "accounts") {
            item.opening_balance_cents = cents(data.get("opening"));
            item.opening_date = data.get("openingDate");
            item.exclude_from_total = !!data.get("exclude");
          }
          if (key === "sources") {
            item.expected_cents = data.get("expected")
              ? cents(data.get("expected"))
              : null;
            assert(
              item.expected_cents === null || item.expected_cents >= 0,
              "La meta no puede ser negativa.",
            );
          }
          if (e)
            next[key][next[key].findIndex((item) => item.id === id)] = item;
          else next[key].push(item);
          if (key === "categories") {
            const rawLimit = data.get("limit").trim();
            const limit = rawLimit ? cents(rawLimit) : null;
            assert(
              limit === null || limit >= 0,
              "El límite no puede ser negativo.",
            );
            const record = next.budgets.find(
              (b) => b.category_id === item.id && b.month === month,
            );
            if (record) record.limit_cents = limit;
            else if (limit !== (e ? budgetLimit(state, e.id, month) : null))
              next.budgets.push({
                id: uid(),
                category_id: item.id,
                month,
                limit_cents: limit,
              });
          }
          await commit(next, "Guardado");
        },
        { compact: true, focusSelector: '[name="name"]' },
      );
    }
    function editBudget(id) {
      const period = budgetMonth, b = currentBudget(id, period);
      modal(
        "Presupuesto · " + name(id),
        `<p>${esc(monthLabel(period))}. Desde este mes, el límite se mantiene en los meses siguientes hasta que lo cambies.</p><label>Límite · BOB<input name="limit" inputmode="decimal" value="${b.limit === null ? "" : decimal(b.limit)}" placeholder="Vacío = sin límite"></label><p class="muted">Cero es un límite válido. El restante no pasa al siguiente mes.</p>${actions()}`,
        async (data) => {
          const next = copy(state),
            n =
              data.get("limit").trim() === "" ? null : cents(data.get("limit"));
          assert(n === null || n >= 0, "El límite no puede ser negativo.");
          let record = next.budgets.find(
            (b) => b.category_id === id && b.month === period,
          );
          if (record) record.limit_cents = n;
          else if (n !== b.limit)
            next.budgets.push({
              id: uid(),
              category_id: id,
              month: period,
              limit_cents: n,
            });
          await commit(next, "Presupuesto guardado");
        },
        { compact: true, focusSelector: '[name="limit"]' },
      );
    }
    const compactMoney = (n) => Math.abs(n) < 100000000 ? money(n)
      : "Bs " + new Intl.NumberFormat("es-BO", { notation: "compact", maximumFractionDigits: 2 }).format(n / 100);
    function stat(label, amount, cls = "") {
      const large = Math.abs(amount) >= 100000000;
      return `<div class="stat ${cls}"><span>${label}</span><strong title="${money(amount)}" aria-label="${money(amount)}"><small>Bs</small>${compactMoney(amount).slice(3)}</strong>${large ? `<details class="exact-amount"><summary>Ver completo</summary><span>${money(amount)}</span></details>` : ""}</div>`;
    }
    function monthNav(compact = false, showArrows = true, period = month) {
      const picker = compact
        ? `<label class="month-picker"><span aria-hidden="true">${formatMonth(period)}</span><input type="month" id="month" aria-label="Mes consultado" value="${period}" required></label>`
        : `<label><span class="sr-only">Mes consultado</span>${dateControl({ type: "month", id: "month", value: period, required: true })}</label>`;
      const arrow = (path) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`;
      return `<div class="month-nav ${compact ? "compact-month" : ""} ${showArrows ? "" : "month-only"}">${showArrows ? `<button data-action="prev" aria-label="Mes anterior">${arrow("m14 6-6 6 6 6")}</button>` : ""}${picker}${showArrows ? `<button data-action="next" aria-label="Mes siguiente">${arrow("m10 6 6 6-6 6")}</button>` : ""}</div>`;
    }
    function iconSvg(iconKey) {
      return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ENTITY_ICONS[iconKey].path}</svg>`;
    }
    function rowIcon(key, item = {}) {
      return iconSvg(entityIconKey(item, key));
    }
    function iconChooser(key, item) {
      const selectedIcon = entityIconKey(item, key);
      const pages = ENTITY_ICON_PAGES.map(page => page.map(id => [id, ENTITY_ICONS[id]]));
      return `<fieldset class="icon-field row-${TYPES.indexOf(key)}"><legend>Icono</legend><input type="hidden" name="icon" value="${selectedIcon}"><button type="button" class="icon-preview" data-action="toggle-icons" aria-expanded="false" aria-controls="icon-picker"><span class="entity-mark">${iconSvg(selectedIcon)}</span><span>Cambiar icono</span></button><div id="icon-picker" class="icon-picker" hidden><div class="icon-pages" tabindex="0" role="group" aria-label="Elegir icono: ${pages.length} páginas">${pages.map((page, index) => `<div class="icon-page" role="group" aria-label="Página ${index + 1} de ${pages.length}">${page.map(([id, icon]) => `<button type="button" data-action="select-icon" data-icon="${id}" aria-label="${icon.label}" title="${icon.label}" aria-pressed="${id === selectedIcon}">${iconSvg(id)}</button>`).join("")}</div>`).join("")}</div><div class="icon-pagination"><span>Desliza para ver más</span><div role="group" aria-label="Páginas de iconos">${pages.map((_, index) => `<button type="button" data-action="icon-page" data-page="${index}" aria-label="Página de iconos ${index + 1}" aria-current="${index === 0 ? "true" : "false"}">${index + 1}</button>`).join("")}</div></div></div></fieldset>`;
    }
    function showIconPage(index) {
      const pages = $(".icon-pages");
      const last = pages.children.length - 1;
      pages.scrollTo({ left: Math.max(0, Math.min(last, index)) * pages.clientWidth, behavior: "instant" });
      updateIconPage();
    }
    function updateIconPage() {
      const pages = $(".icon-pages");
      if (!pages || !pages.clientWidth) return;
      const index = Math.round(pages.scrollLeft / pages.clientWidth);
      document.querySelectorAll('[data-action="icon-page"]').forEach((button) => {
        button.setAttribute("aria-current", String(Number(button.dataset.page) === index));
      });
    }
    function setEntityEditing(editing) {
      editingEntities = editing;
      $("#main").classList.toggle(
        "editing-entities",
        editing && view === "home",
      );
      if ($("#entity-edit-bar")) $("#entity-edit-bar").hidden = !editing;
      document.querySelectorAll("[data-entity]").forEach((card) => {
        card.setAttribute("aria-label", `${editing ? "Reordenar" : "Ver historial de"} ${name(card.dataset.entity)}`);
        if (editing) card.setAttribute("aria-keyshortcuts", "Alt+ArrowLeft Alt+ArrowRight Alt+ArrowUp Alt+ArrowDown");
        else card.removeAttribute("aria-keyshortcuts");
      });
    }
    function removeEntity(key, id) {
      const count = state.transactions.filter(
        (t) => t.from_id === id || t.to_id === id,
      ).length;
      modal(
        "Archivar o eliminar " + name(id),
        `<fieldset class="remove-options"><legend>¿Qué quieres hacer?</legend><label class="check"><input type="radio" name="removal" value="archive" checked>Archivar (conservar historial)</label><p class="muted">Conserva movimientos, saldos y límites. Puedes restaurarla en Importar/Exportar o, si es una categoría, en Límites de categoría.</p><label class="check"><input type="radio" name="removal" value="erase">Eliminar completamente</label></fieldset><div id="erase-warning" hidden><p>Se eliminará la entidad, sus ${count} movimientos de todos los meses y sus presupuestos. Esto puede cambiar los saldos de las cuentas relacionadas.</p><label class="check"><input type="checkbox" name="confirmErase" disabled>Confirmo que quiero eliminar la entidad y su historial.</label></div>${actions("Archivar")}`,
        async (data) => {
          if (data.get("removal") === "erase") {
            assert(data.get("confirmErase"), "Confirma la eliminación del historial.");
            await commit(eraseEntity(state, key, id), "Entidad e historial eliminados", true);
            filters.entities = filters.entities.filter((entityId) => entityId !== id);
          } else {
            const next = copy(state);
            next[key].find((e) => e.id === id).archived_at =
              new Date().toISOString();
            await commit(next, "Entidad archivada", true);
          }
        },
        { compact: true, focusSelector: 'button[data-action="close"]' },
      );
      document.querySelectorAll('[name="removal"]').forEach((radio) => {
        radio.onchange = () => {
          const erase = $('#dialog [name="removal"]:checked').value === "erase";
          $("#erase-warning").hidden = !erase;
          const confirmation = $('#dialog [name="confirmErase"]');
          confirmation.disabled = !erase;
          confirmation.required = erase;
          $('#modal-form button[type="submit"]').textContent =
            erase ? "Eliminar completamente" : "Archivar";
        };
      });
    }
    async function restoreEntity(key, id) {
      assert([...TYPES, "tags"].includes(key), "Tipo de entidad inválido.");
      const next = copy(state);
      const item = next[key].find((e) => e.id === id);
      assert(item?.archived_at, "La entidad no está archivada.");
      item.archived_at = null;
      await commit(next, "Entidad restaurada en Inicio", true);
    }
    function homeTotals() {
      const r = cachedReport(),
        bs = currentBalances();
      const balance = sum(
        state.accounts
          .filter((a) => !a.exclude_from_total)
          .map((a) => bs[a.id]),
      );
      const remaining = currentBudgetTotals().remaining;
      return `<section class="home-totals stats" aria-label="Totales de ${esc(monthLabel(month))}">${stat("Balance actual", balance)}${stat("Gastos efectuados", r.expense)}${stat("Gastos planeados", remaining)}</section>`;
    }
    let gestureHelpDismissed = false;
    try { gestureHelpDismissed = localStorage.getItem(gestureHelpKey) === "dismissed"; } catch {}
    const gestureGuide = () => '<p>Arrastra el círculo de una cuenta hacia una categoría para registrar un gasto, o hacia otra cuenta para transferir. Desde una fuente hacia una cuenta registras un ingreso. Mantén pulsado un círculo para ordenar entidades. También puedes usar + Movimiento en el menú.</p>';
    function home() {
      const bs = currentBalances();
      return `<h1 class="sr-only">Un mes más claro.</h1>${!gestureHelpDismissed && state.transactions.length === 0 && state.accounts.length ? `<aside class="gesture-help">${gestureGuide()}<button data-action="dismiss-gesture-help">Entendido</button></aside>` : ""}
        <div id="entity-edit-bar" ${editingEntities ? "" : "hidden"}><span>Arrastra los círculos para ordenar</span><button data-action="finish-editing">Listo</button></div>
        ${TYPES.map((key, idx) => {
          const carousel = key !== "categories";
          const createLabel = `Crear ${key === "sources" ? "fuente" : key === "accounts" ? "cuenta" : "categoría"}`;
          return `<section class="entity-section row-${idx}" aria-label="${{ sources: "Fuentes de ingreso", accounts: "Cuentas", categories: "Categorías de gasto" }[key]}"><div class="entity-grid">${carousel ? '<div class="entity-strip" tabindex="0" role="group" aria-label="Entidades: desliza horizontalmente para ver más" aria-description="Arrastra desde el círculo. Desliza sobre nombres, importes o espacios para ver más entidades.">' : ""}${active(
            key,
          )
            .map((e) => {
              const value =
                key === "accounts"
                  ? bs[e.id]
                  : key === "sources"
                    ? sum(
                        posted(state)
                          .filter(
                            (t) =>
                              t.kind === "income" &&
                              t.from_id === e.id &&
                              t.occurred_on.startsWith(month),
                          )
                          .map((t) => t.amount_cents),
                      )
                    : currentBudget(e.id).spent;
              const b =
                key === "categories" ? currentBudget(e.id) : null;
              const progress = b ? budgetVisual(b.limit, b.spent) : null;
              const plannedLabel = b && b.limit !== null
                ? `Gastos planeados: ${money(b.limit)}` : "";
              const progressLabel = progress
                ? b.limit === null
                  ? "Sin presupuesto este mes"
                  : progress.tone === "red"
                    ? "Presupuesto excedido"
                    : `${progress.fill}% del presupuesto utilizado`
                : "";
              return `<div class="entity-wrap"><button class="entity-card" data-entity="${esc(e.id)}" data-key="${key}" aria-label="Ver historial de ${esc(e.name)}"${progress ? ` aria-description="${plannedLabel ? plannedLabel + ". " : ""}${progressLabel}"` : ""}><span class="entity-name" title="${esc(e.name)}">${esc(e.name)}</span><span class="entity-mark${progress ? ` budget-mark budget-${progress.tone}` : ""}"${progress ? ` style="--budget-fill:${progress.fill}%" title="${progressLabel}"` : ""}>${rowIcon(key, e)}</span><strong${progress ? ` class="budget-amount budget-${progress.tone}"` : ""} title="${money(value)}">${compactMoney(value)}</strong>${plannedLabel ? `<small class="entity-planned" title="${plannedLabel}">${money(b.limit).slice(3)}</small>` : ""}${e.exclude_from_total ? '<span class="sr-only">Excluida del balance</span>' : ""}</button><div class="entity-tools"><button class="entity-remove" data-action="remove-entity" data-key="${key}" data-id="${esc(e.id)}" aria-label="Eliminar ${esc(e.name)}"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="m7 7 10 10M17 7 7 17"/></svg></button><button class="entity-pencil" data-action="edit-entity" data-key="${key}" data-id="${esc(e.id)}" aria-label="Editar ${esc(e.name)}"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="m4 16 12-12 4 4L8 20H4v-4Zm10-10 4 4"/></svg></button></div></div>`;
            })
            .join(
              "",
            )}<button class="entity-add" data-action="add" data-key="${key}" aria-label="${createLabel}" title="${createLabel}"><span class="entity-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></span></button>${carousel ? "</div>" : ""}</div></section>`;
        }).join(
          "",
        )}`;
    }
    function filterPanel() {
      const selected = [filters.start || filters.end ? `${formatDate(filters.start) || "Sin inicio"}–${formatDate(filters.end) || "Sin final"}` : "Todas las fechas",
        filters.entities.length ? filters.entities.slice(0, 2).map(name).join(", ") + (filters.entities.length > 2 ? ` +${filters.entities.length - 2}` : "") : "Todas las entidades",
        filters.tags.length ? `${filters.tagMode === "all" ? "Todas" : "Cualquiera"}: ` + filters.tags.slice(0, 2).map(id => state.tags.find(t => t.id === id)?.name || "Etiqueta").join(", ") + (filters.tags.length > 2 ? ` +${filters.tags.length - 2}` : "") : "",
        filters.kind ? labels[filters.kind] : "", filters.text ? `Nota: ${filters.text.slice(0, 40)}${filters.text.length > 40 ? "…" : ""}` : ""].filter(Boolean).join(" · ");
      return `<details id="shared-filters" class="panel filters" ${filtersOpen ? "open" : ""}><summary><span>Filtros</span><small>${esc(selected)}</small></summary><p class="muted filter-sharing">Compartidos con Gráficos e Historial.</p><div class="form-grid">
        <label>Desde${dateControl({ id: "f-start", value: filters.start })}</label><label>Hasta${dateControl({ id: "f-end", value: filters.end })}</label>
        <label>Cuentas, fuentes o categorías<select multiple size="1" id="f-entities">${allEntities()
          .map(
            (e) =>
              `<option value="${esc(e.id)}" ${filters.entities.includes(e.id) ? "selected" : ""}>${esc(e.name)}</option>`,
          )
          .join("")}</select></label>
        <label>Etiquetas<select multiple size="1" id="f-tags">${state.tags.map((e) => `<option value="${esc(e.id)}" ${filters.tags.includes(e.id) ? "selected" : ""}>${esc(e.name)}</option>`).join("")}</select></label>
        <label>Coincidencia de etiquetas<select id="f-tagMode"><option value="any" ${filters.tagMode === "any" ? "selected" : ""}>Cualquiera</option><option value="all" ${filters.tagMode === "all" ? "selected" : ""}>Todas</option></select></label>
        <label>Tipo<select id="f-kind"><option value="">Todos</option>${Object.entries(
          labels,
        )
          .map(
            ([k, v]) =>
              `<option value="${k}" ${filters.kind === k ? "selected" : ""}>${v}</option>`,
          )
          .join("")}</select></label>
        <label class="wide">Buscar en nota<input id="f-text" type="search" value="${esc(filters.text)}" placeholder="Ej. almuerzo"></label></div><div class="inline-actions"><button data-action="apply-filters" class="primary">Aplicar filtros</button><button data-action="clear-filters">Ver todo</button></div></details>`;
    }
    function groupByDay(transactions) {
      const groups = new Map();
      for (const t of transactions) {
        if (!groups.has(t.occurred_on)) groups.set(t.occurred_on, []);
        groups.get(t.occurred_on).push(t);
      }
      return groups;
    }
    function transactionRow(t, contextId = null) {
      const time = t.occurred_time ? esc(t.occurred_time.slice(0, 5)) : "";
      const metadata = `${time ? time + " · " : ""}${labels[t.kind]}`;
      const counterpart = contextId ? `${t.from_id === contextId ? "A" : "Desde"} ${name(t.from_id === contextId ? t.to_id : t.from_id)}`
        : `${name(t.from_id)} → ${name(t.to_id)}`;
      const value = contextId ? entityMovementAmount(t, contextId)
        : t.kind === "expense" ? -t.amount_cents : t.kind === "income" ? t.amount_cents : null;
      const amount = money(t.amount_cents);
      const amountAttributes = value === null ? 'class="amount-neutral"'
        : `class="${amountClass(value)}" aria-label="${amountDescription(value)}"`;
      const row = `<article class="transaction"><div class="transaction-symbol ${t.kind}">${{ income: "↙", expense: "↗", transfer: "⇄" }[t.kind]}</div><div class="transaction-info"><strong>${esc(counterpart)}</strong><span>${metadata}</span>${t.note ? `<details class="transaction-note"><summary><span class="note-preview">${esc(t.note)}</span><span class="note-close">Ocultar nota</span></summary><p>${esc(t.note)}</p></details>` : ""}<div class="tags">${t.tag_ids.map((id) => `<span>${esc(state.tags.find((e) => e.id === id)?.name)}</span>`).join("")}</div></div><div class="transaction-end"><strong ${amountAttributes}>${amount}</strong><details class="transaction-actions"><summary aria-label="Acciones del movimiento">⋯</summary><div><button data-action="edit-transaction" data-id="${esc(t.id)}">Editar</button><button data-action="delete-transaction" data-id="${esc(t.id)}" aria-label="Borrar movimiento ${formatDate(t.occurred_on)} ${money(t.amount_cents)}">Borrar</button></div></details></div></article>`;
      return contextId
        ? `<div class="transaction-swipe" data-swipe-transaction="${esc(t.id)}"><button class="transaction-swipe-delete" data-action="swipe-delete-transaction" data-id="${esc(t.id)}" tabindex="-1" aria-hidden="true" aria-label="Borrar movimiento ${formatDate(t.occurred_on)} ${money(t.amount_cents)}">Borrar</button>${row}</div>`
        : row;
    }
    function entityChart(id, type) {
      const series = entityEvolution(state, id, month);
      const low = Math.min(0, ...series.map((p) => p.value));
      const high = Math.max(0, ...series.map((p) => p.value));
      const range = high - low || 1;
      const x = (i) => 90 + i * 45;
      const y = (value) => 150 - ((value - low) / range) * 130;
      const points = series.map((p, i) => `${x(i)},${y(p.value)}`).join(" L ");
      const caption =
        type === "accounts"
          ? "Saldo al cierre de cada mes"
          : type === "sources"
            ? "Ingresos por mes"
            : "Gastos por mes";
      const ticks = [...new Set([high, Math.round((high + low) / 2), low])];
      const axisNumber = new Intl.NumberFormat("es-BO", {
        notation: "compact",
        maximumFractionDigits: 1,
      });
      return `<section class="entity-chart" aria-labelledby="chart-heading"><div class="chart-heading"><h2 id="chart-heading">${caption}</h2><span>12 meses · BOB</span></div><div class="chart-interactive"><output class="chart-tooltip" aria-hidden="true" hidden></output><svg class="chart-plot" viewBox="0 0 610 190" tabindex="0" role="slider" aria-label="Mes e importe · ${caption}" aria-describedby="chart-help" aria-valuemin="0" aria-valuemax="11" aria-valuenow="11" aria-valuetext="${formatMonth(series[11].month)} · ${money(series[11].value)}"><title>${caption} · ${esc(name(id))}</title>${ticks.map((v) => `<line x1="90" x2="585" y1="${y(v)}" y2="${y(v)}" class="chart-grid"/><text x="80" y="${y(v) + 4}" text-anchor="end">${axisNumber.format(v / 100)}</text>`).join("")}<path class="chart-area" d="M ${x(0)},${y(0)} L ${points} L ${x(11)},${y(0)} Z"/><path class="chart-line" d="M ${points}"/><circle cx="${x(11)}" cy="${y(series[11].value)}" r="4" class="chart-dot"/><g class="chart-selection" hidden><line y1="20" y2="150"/><circle r="5"/></g>${[0, 3, 6, 9, 11].map((i) => `<text x="${x(i)}" y="178" text-anchor="middle">${formatMonth(series[i].month)}</text>`).join("")}</svg></div><p id="chart-help" class="sr-only">Toca o desliza sobre el gráfico para consultar cada mes. Con teclado, usa las flechas izquierda y derecha, Inicio y Fin.</p><div class="chart-data sr-only"><table><caption>${caption} · ${esc(name(id))}</caption><thead><tr><th>Mes</th><th>${type === "accounts" ? "Saldo" : "Importe"} · BOB</th></tr></thead><tbody>${series.map((p, i) => `<tr data-chart-month="${p.month}" data-value="${p.value}" data-x="${x(i)}" data-y="${y(p.value)}"><td>${formatMonth(p.month)}</td><td>${money(p.value)}</td></tr>`).join("")}</tbody></table></div></section>`;
    }
    function bindEntityChart() {
      const chart = $(".entity-chart"), plot = chart?.querySelector(".chart-plot");
      if (!plot) return;
      const rows = [...chart.querySelectorAll("[data-chart-month]")],
        tooltip = chart.querySelector(".chart-tooltip"),
        selection = chart.querySelector(".chart-selection");
      let selected = rows.length - 1, pointerId = null;
      const show = (index) => {
        selected = Math.max(0, Math.min(rows.length - 1, index));
        const point = rows[selected].dataset;
        tooltip.textContent = `${formatMonth(point.chartMonth)} · ${money(Number(point.value))}`;
        tooltip.style.left = `${Number(point.x) / 610 * 100}%`;
        tooltip.hidden = false;
        selection.removeAttribute("hidden");
        const line = selection.querySelector("line"), dot = selection.querySelector("circle");
        line.setAttribute("x1", point.x);
        line.setAttribute("x2", point.x);
        dot.setAttribute("cx", point.x);
        dot.setAttribute("cy", point.y);
        plot.setAttribute("aria-valuenow", selected);
        plot.setAttribute("aria-valuetext", tooltip.textContent);
        // Keep the bubble inside the chart, including the first and last month.
        const half = tooltip.offsetWidth / 2, width = plot.getBoundingClientRect().width;
        tooltip.style.left = `${Math.max(half, Math.min(width - half, Number(point.x) / 610 * width))}px`;
      };
      const hide = () => {
        tooltip.hidden = true;
        selection.setAttribute("hidden", "");
      };
      const showAt = (clientX) => {
        const box = plot.getBoundingClientRect();
        if (box.width) show(Math.round(((clientX - box.left) / box.width * 610 - 90) / 45));
      };
      plot.addEventListener("pointerdown", (event) => {
        if (!event.isPrimary || event.button !== 0 || pointerId !== null) return;
        pointerId = event.pointerId;
        plot.setPointerCapture(pointerId);
        showAt(event.clientX);
      });
      plot.addEventListener("pointermove", (event) => {
        if (event.pointerId === pointerId || (pointerId === null && event.pointerType === "mouse")) showAt(event.clientX);
      });
      plot.addEventListener("pointerup", (event) => {
        if (event.pointerId !== pointerId) return;
        showAt(event.clientX);
        pointerId = null;
        if (plot.hasPointerCapture(event.pointerId)) plot.releasePointerCapture(event.pointerId);
      });
      const cancel = () => { pointerId = null; hide(); };
      plot.addEventListener("pointercancel", cancel);
      plot.addEventListener("lostpointercapture", () => { if (pointerId !== null) cancel(); });
      plot.addEventListener("pointerleave", (event) => { if (pointerId === null && event.pointerType === "mouse") hide(); });
      plot.addEventListener("focus", () => show(selected));
      plot.addEventListener("blur", cancel);
      plot.addEventListener("keydown", (event) => {
        const index = { ArrowLeft: selected - 1, ArrowRight: selected + 1, Home: 0, End: rows.length - 1 }[event.key];
        if (index !== undefined) { event.preventDefault(); show(index); }
        else if (event.key === "Escape") hide();
      });
    }
    function detailHeader() {
      const type = TYPES.find((key) => state[key].some((e) => e.id === detailId));
      const item = entity(detailId);
      if (!type || !item) return "";
      return `<div class="detail-toolbar"><button data-action="back-home" aria-label="Volver a Inicio"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m14 6-6 6 6 6"/></svg></button><div><span class="detail-kind">${{ sources: "Fuente de ingreso", accounts: "Cuenta", categories: "Categoría de gasto" }[type]}</span><h1 title="${esc(item.name)}">${esc(item.name)}</h1></div><button data-action="edit-entity" data-key="${type}" data-id="${esc(detailId)}">Editar</button></div>`;
    }
    function detail() {
      const type = TYPES.find((key) =>
        state[key].some((e) => e.id === detailId),
      );
      if (!type)
        return '<p class="empty">Esta entidad ya no está disponible.</p><button data-view="home">Volver a Inicio</button>';
      const all = filterTransactions(state, { entities: [detailId] }).sort(
        compareTransactionDates,
      );
      const ts = all.filter(
        (t) => detailScope === "all" || t.occurred_on.startsWith(month),
      );
      const monthly = all.filter((t) => t.occurred_on.startsWith(month));
      const incoming = sum(
        monthly
          .filter((t) => t.to_id === detailId || t.kind === "income")
          .map((t) => t.amount_cents),
      );
      const outgoing = sum(
        monthly
          .filter((t) => t.from_id === detailId || t.kind === "expense")
          .map((t) => t.amount_cents),
      );
      const groups = new Map();
      const dayTotals = entityDayTotals(state, detailId);
      for (const t of ts.slice(0, historyLimit)) {
        if (!groups.has(t.occurred_on)) groups.set(t.occurred_on, []);
        groups.get(t.occurred_on).push(t);
      }
      const summary =
        type === "accounts"
          ? stat("Saldo actual", currentBalances()[detailId]) +
            stat("Entradas del mes", incoming) +
            stat("Salidas del mes", outgoing)
          : type === "sources"
            ? stat("Ingresos del mes", incoming)
            : stat("Gastos del mes", outgoing) +
              (currentBudget(detailId).limit !== null
                ? stat(
                    "Presupuesto del mes",
                    currentBudget(detailId).limit,
                  )
                : "");
      return `<div class="entity-detail row-${TYPES.indexOf(type)}"><div class="detail-period"><button data-action="entity-movement">+ Movimiento</button>${monthNav(true)}</div><div class="detail-totals stats">${summary}</div>${entityChart(detailId, type)}<section class="entity-history" aria-labelledby="entity-history-heading"><div class="chart-heading"><h2 id="entity-history-heading">Historial</h2><span>${ts.length} movimientos</span></div><div class="history-scope" role="group" aria-label="Período del historial"><button data-action="detail-scope" data-scope="month" aria-pressed="${detailScope === "month"}">Este mes</button><button data-action="detail-scope" data-scope="all" aria-pressed="${detailScope === "all"}">Todo el historial</button></div>${[...groups].map(([date, transactions]) => `<section class="history-day"><div class="history-day-heading"><h3><time datetime="${date}">${formatDate(date)}</time></h3><strong class="history-day-total ${amountClass(dayTotals.get(date))}" aria-label="${amountDescription(dayTotals.get(date), "Total neto del día")}">${money(Math.abs(dayTotals.get(date)))}</strong></div><div class="transaction-list">${transactions.map((t) => transactionRow(t, detailId)).join("")}</div></section>`).join("") || '<p class="empty">No hay movimientos en este período.</p>'}${ts.length > historyLimit ? '<button data-action="more">Mostrar 100 más</button>' : ""}</section></div>`;
    }
    function history() {
      const ts = filterTransactions(state, filters).sort(
        compareTransactionDates,
      );
      const income = sum(
          ts.filter((t) => t.kind === "income").map((t) => t.amount_cents),
        ),
        expense = sum(
          ts.filter((t) => t.kind === "expense").map((t) => t.amount_cents),
        );
      return `<div class="page-heading"><h1>Historial</h1></div>${filterPanel()}<div class="stats">${stat("Ingresos filtrados", income, "positive")}${stat("Gastos filtrados", expense)}${stat("Neto filtrado", sum([income, -expense]))}</div><section class="panel"><div class="section-heading"><h2>${ts.length} movimientos</h2><button data-action="movement">+ Nuevo</button></div><div class="transaction-list">${
        [...groupByDay(ts.slice(0, historyLimit))].map(([date, rows]) =>
            `<section class="history-day"><div class="history-day-heading"><h3><time datetime="${date}">${formatDate(date)}</time></h3></div>${rows.map(t => transactionRow(t)).join("")}</section>`).join("") ||
        '<p class="empty">No hay movimientos con estos filtros.</p>'
      }</div>${ts.length > historyLimit ? '<button data-action="more" class="load-more">Mostrar 100 más</button>' : ""}</section>`;
    }
    function budgetCard(c, archived = false) {
      const b = currentBudget(c.id, budgetMonth), visual = budgetVisual(b.limit, b.spent);
      return `<article class="panel budget-card budget-${visual.tone}"><div class="budget-heading"><h2>${esc(c.name)}</h2><button data-action="budget" data-id="${esc(c.id)}" aria-label="Editar límite de ${esc(c.name)}">Editar</button></div><div class="budget-spent">${money(b.spent)}<span>gastado</span></div>${b.limit === null ? "" : `<progress max="${Math.max(b.limit, b.spent, 1)}" value="${b.spent}" aria-label="Gastado ${money(b.spent)} de un límite de ${money(b.limit)}"></progress>`}<dl><div><dt>Límite</dt><dd>${b.limit === null ? "Sin límite" : money(b.limit)}</dd></div><div><dt>${b.remaining !== null && b.remaining < 0 ? "Exceso" : "Restante"}</dt><dd>${b.remaining === null ? "—" : money(Math.abs(b.remaining))}</dd></div></dl>${archived ? `<button class="budget-restore" data-action="restore-entity" data-key="categories" data-id="${esc(c.id)}" aria-label="Restaurar ${esc(c.name)} en Inicio">Restaurar en Inicio</button>` : ""}</article>`;
    }
    function budgets() {
      const currentCategories = state.categories.filter((c) => !c.archived_at);
      const archivedCategories = state.categories.filter((c) => c.archived_at);
      const longNames = state.categories.some(c => c.name.length > 18 || Math.abs(currentBudget(c.id, budgetMonth).spent) >= 100000000);
      const archivedLimit = sum(archivedCategories.map(c => currentBudget(c.id, budgetMonth).limit || 0));
      const activeLimit = sum(currentCategories.map(c => currentBudget(c.id, budgetMonth).limit || 0));
      return `<div class="page-heading"><div class="page-title"><h1>Límites de categoría</h1>${monthNav(true, true, budgetMonth)}</div><p>Define un límite una vez. Se mantiene cada mes hasta que lo cambies.</p></div><section class="stats budget-totals" aria-label="Resumen de límites mensuales">${stat("Total de límites mensuales", currentBudgetTotals(budgetMonth).limit)}</section><p class="limit-contributions">Activas: ${money(activeLimit)} · Archivadas: ${money(archivedLimit)}. Ambos importes están incluidos en el total.</p><section class="budget-grid ${longNames ? "budget-long-names" : ""}">${currentCategories.map((c) => budgetCard(c)).join("") || '<p class="empty">Crea una categoría en Inicio para asignarle un presupuesto.</p>'}</section><details id="archived-categories" class="archived-categories" ${archivedBudgetsOpen ? "open" : ""}><summary>Categorías archivadas (${archivedCategories.length})</summary><div class="budget-grid ${longNames ? "budget-long-names" : ""}">${archivedCategories.map((c) => budgetCard(c, true)).join("") || '<p class="empty">No hay categorías archivadas.</p>'}</div></details><p class="footnote">Los límites se mantienen de mes a mes. Al cambiarlos, se aplican desde el mes consultado; los meses anteriores conservan su valor. El gasto empieza de cero cada mes.</p>`;
    }
    function expensePie(categories) {
      const total = sum(categories.map((c) => c.spent));
      if (!total) return "";
      const palette = ["#236352", "#ca673f", "#5278a8", "#a58b27", "#80649b", "#368c89", "#a75872", "#718544"];
      let angle = -Math.PI / 2;
      const slices = categories.map((c, index) => ({
        ...c, color: palette[index] || `hsl(${Math.round(index * 137.508) % 360} 42% 44%)`,
      })).filter((c) => c.spent > 0).sort((a, b) => b.spent - a.spent).map((c, index) => {
        const start = angle;
        angle += c.spent / total * Math.PI * 2;
        return { ...c, start, end: angle, percent: c.spent / total * 100,
          major: index < 5 && c.spent / total >= 0.05 };
      });
      const point = (a, radius) => ({ x: 180 + Math.cos(a) * radius, y: 135 + Math.sin(a) * radius });
      const percent = (n) => n.toFixed(1) + "%";
      const shape = (c) => {
        const title = `${esc(c.name)} · ${percent(c.percent)}`;
        const attributes = `class="pie-slice" data-category="${esc(c.id)}" data-percent="${c.percent}" fill="${c.color}" tabindex="0" role="img" aria-label="${title}"`;
        if (slices.length === 1) return `<circle ${attributes} cx="180" cy="135" r="82"><title>${title}</title></circle>`;
        const from = point(c.start, 82), to = point(c.end, 82);
        return `<path ${attributes} d="M180 135 L${from.x} ${from.y} A82 82 0 ${c.end - c.start > Math.PI ? 1 : 0} 1 ${to.x} ${to.y} Z"><title>${title}</title></path>`;
      };
      const other = slices.filter((c) => !c.major);
      const otherPercent = sum(other.map((c) => c.spent)) / total * 100;
      const labels = slices.filter((c) => c.major).map((c) => ({ ...c, angle: (c.start + c.end) / 2 }));
      if (other.length) labels.push({ name: "Otros", percent: otherPercent,
        angle: (other[0].start + other.at(-1).end) / 2 });
      for (const side of [-1, 1]) {
        const group = labels.filter((label) => (Math.cos(label.angle) < 0 ? -1 : 1) === side)
          .sort((a, b) => point(a.angle, 94).y - point(b.angle, 94).y);
        group.forEach((label, index) => {
          label.side = side;
          const min = 35 + index * 42, max = 235 - (group.length - index - 1) * 42;
          label.y = Math.max(min, Math.min(max, point(label.angle, 94).y));
          if (index) label.y = Math.max(label.y, group[index - 1].y + 42);
        });
      }
      const labelText = (label) => {
        const text = label.name.trim();
        let first = text, second = "";
        if (text.length > 14) {
          const space = text.lastIndexOf(" ", 14);
          const cut = space > 0 ? space : 14;
          first = text.slice(0, cut);
          second = text.slice(cut).trim();
          if (second.length > 14) second = second.slice(0, 13) + "…";
        }
        const p = point(label.angle, 85), elbow = point(label.angle, 94);
        const x = label.side < 0 ? 4 : 356, edge = label.side < 0 ? 94 : 266;
        return `<g class="pie-label"><path d="M${p.x} ${p.y} L${elbow.x} ${elbow.y} L${edge} ${label.y}"/><text x="${x}" y="${label.y - (second ? 16 : 5)}" text-anchor="${label.side < 0 ? "start" : "end"}"><tspan x="${x}">${esc(first)}</tspan>${second ? `<tspan x="${x}" dy="13">${esc(second)}</tspan>` : ""}<tspan class="pie-percent" x="${x}" dy="15">${percent(label.percent)}</tspan></text></g>`;
      };
      return `<figure class="expense-pie"><svg viewBox="0 0 360 270" role="img" aria-labelledby="expense-pie-title expense-pie-description"><title id="expense-pie-title">Gastos por categoría</title><desc id="expense-pie-description">${slices.map((c) => `${esc(c.name)}: ${percent(c.percent)}`).join("; ")}. Detalle en la tabla siguiente.</desc>${slices.map(shape).join("")}${labels.map(labelText).join("")}</svg>${other.length ? `<figcaption class="pie-others"><h3>Otros <span>· ${percent(otherPercent)}</span></h3><ul>${other.map((c) => `<li><span class="pie-color" style="--slice-color:${c.color}" aria-hidden="true"></span><span>${esc(c.name)}</span><strong>${percent(c.percent)}</strong></li>`).join("")}</ul></figcaption>` : ""}</figure>`;
    }
    function reports() {
      const r = report(state, month, filters),
        series = evolution(state, month, filters),
        max = Math.max(1, ...series.flatMap((m) => [m.income, m.expense]));
      return `<div class="page-heading"><div class="page-title"><h1>Gráficos</h1>${monthNav(true)}</div></div>${filterPanel()}<p class="footnote">BOB · ${esc(monthLabel(month))} · Se aplican todos los filtros de arriba, también a la evolución. «Ver todo» quita el rango de fechas.</p><div class="stats">${stat("Ingresos", r.income, "positive")}${stat("Gastos", r.expense)}${stat("Neto", r.net)}</div>
      <section class="panel"><h2>¿Dónde se fue?</h2><p class="muted">Gastos por categoría</p>${expensePie(r.categories)}<details class="report-breakdown"><summary>Ver detalle por categoría</summary><div role="img" aria-label="Distribución de gastos; datos en la tabla siguiente" class="distribution">${
        r.categories
          .filter((c) => c.spent)
          .map(
            (c) =>
              `<div><span>${esc(c.name)}</span><div class="bar-track"><i style="width:${r.expense ? (c.spent / r.expense) * 100 : 0}%"></i></div><strong>${r.expense ? ((c.spent / r.expense) * 100).toFixed(1) : "0"}%</strong></div>`,
          )
          .join("") ||
        '<p class="empty">Todavía no hay gastos en este período.</p>'
      }</div><details class="report-table"><summary>Ver tabla por categoría</summary><div class="table-scroll"><table><thead><tr><th>Categoría</th><th>Gasto · BOB</th><th>Participación</th></tr></thead><tbody>${r.categories.map((c) => `<tr><td>${esc(c.name)}</td><td>${money(c.spent)}</td><td>${r.expense ? ((c.spent / r.expense) * 100).toFixed(1) : "0"}%</td></tr>`).join("")}</tbody></table></div></details></details></section>
      <section class="panel"><h2>Doce meses de perspectiva</h2><p class="legend"><span class="income-key">Ingresos</span><span class="expense-key">Gastos</span></p><div class="timeline" role="img" aria-label="Evolución mensual de ingresos y gastos; datos en la tabla siguiente">${series.map((m) => `<div class="timeline-month"><div class="columns"><i class="income-bar" style="height:${(m.income / max) * 100}%"></i><i class="expense-bar" style="height:${(m.expense / max) * 100}%"></i></div><span>${m.month.slice(5)}<small>/${m.month.slice(2, 4)}</small></span></div>`).join("")}</div><details class="report-table"><summary>Ver tabla mensual</summary><div class="table-scroll"><table><thead><tr><th>Mes</th><th>Ingresos</th><th>Gastos</th><th>Neto</th></tr></thead><tbody>${series.map((m) => `<tr><td>${formatMonth(m.month)}</td><td>${money(m.income)}</td><td>${money(m.expense)}</td><td>${money(m.net)}</td></tr>`).join("")}</tbody></table></div></details></section><p class="footnote">Cada movimiento cuenta una vez, aunque tenga varias etiquetas. Transferencias excluidas.</p>`;
    }
    function settings() {
      return `<div class="page-heading"><h1>Importar/Exportar</h1><p>Respalda, restaura y organiza tus datos.</p></div>
      <section class="panel"><h2>Respaldo completo</h2><p>Descarga un JSON con movimientos, saldos iniciales, límites por mes, etiquetas y revisión pendiente.</p><button class="primary" data-action="export">Descargar respaldo JSON</button><label class="file-label">Restaurar respaldo JSON<input type="file" id="json-file" accept=".json,application/json"></label></section>
      ${demoMode ? "" : `<details class="panel settings-group" id="backup-settings" ${openSettingsGroups.has("backup-settings") ? "open" : ""}><summary>Respaldo automático en GitHub</summary><p>Respaldo automático en tu repositorio privado de GitHub. Solo se envían datos; no se restaura desde GitHub.</p>
      <form id="sync-form"><label>Repo<input id="sync-repo" value="${esc(syncConfig.repo)}" required autocapitalize="none" spellcheck="false"></label>
      <label>Branch<input id="sync-branch" value="${esc(syncConfig.branch)}" required autocapitalize="none" spellcheck="false"></label>
      <label>Path<input id="sync-path" value="${esc(syncConfig.path)}" required autocapitalize="none" spellcheck="false"></label>
      <label>Token<input id="sync-token" type="password" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="${esc(syncConfig.token ? "••••" + syncConfig.token.slice(-4) : "")}"></label>
      <p class="muted">Usa un token con permiso de escritura de Contents en el repositorio elegido. «Sincronizar ahora» guarda la configuración en este dispositivo.</p>
      <button class="primary" type="submit">Sincronizar ahora</button> <button type="button" data-action="sync-disable">Desactivar</button></form>
      <p id="sync-status" role="status" aria-live="polite">${esc(syncStatus())}</p></details>`}
      <section class="panel"><h2>Importar historial completo</h2><p>Importa todos los años y meses incluidos en tu CSV, con las fechas originales de cada movimiento. No necesitas elegir un mes.</p><label class="file-label">Elegir CSV<input id="csv-file" type="file" accept=".csv,text/csv"></label><details class="import-options"><summary>Importar también límites de categoría (opcional)</summary><p>El CSV contiene un límite por categoría, sin indicar desde cuándo se aplica. Solo si quieres usar esos límites, elige el mes de inicio. Esto no filtra el historial.</p><label>Aplicar límites desde (opcional)${dateControl({ id: "import-budget-month", type: "month", describedBy: "import-budget-help" })}</label><p id="import-budget-help" class="muted">Vacío: se importa todo el historial sin crear límites. Puedes definirlos después en Límites de categoría.</p></details><p class="muted">CSV CoinKeeper con transacciones y las cuatro secciones. Solo BOB. Verás el período y los datos antes de reemplazar tu información. Los acumulados «Received to date» se conservan como referencia.</p></section>
      <section class="panel"><h2>Revisión de importación · ${state.review.length}</h2><p>Estas filas no son movimientos y no entran en reportes. El saldo inicial se reconcilia con los movimientos aceptados. Revisa el saldo inicial si agregas una fila manualmente.</p>${
        state.review
          .slice(0, historyLimit)
          .map(
            (r) =>
              `<article class="review-row"><strong>Registro ${r.record}: ${esc(r.reason)}</strong><p>${esc(r.raw.join(" · "))}</p><button data-action="resolve-review" data-id="${esc(r.id)}">Crear movimiento corregido</button></article>`,
          )
          .join("") || '<p class="muted">Sin filas pendientes.</p>'
      }${state.review.length > historyLimit ? '<button data-action="more">Mostrar 100 más</button>' : ""}</section>
      <details class="panel settings-group" id="calendar-settings" ${openSettingsGroups.has("calendar-settings") ? "open" : ""}><summary>Calendario y zona horaria</summary><label>Zona horaria<input id="timezone" value="${esc(state.profile.timezone)}" placeholder="America/La_Paz"></label><button data-action="timezone">Guardar zona horaria</button><p class="muted">Moneda base: BOB. Las fechas contables no cambian al cambiar de zona horaria.</p></details>
      <section class="panel"><h2>Organizar entidades</h2>${[...TYPES, "tags"].map((key) => `<details data-manage-key="${key}" ${openManageGroups.has(key) ? "open" : ""}><summary>${{ sources: "Fuentes", accounts: "Cuentas", categories: "Categorías", tags: "Etiquetas" }[key]} (${state[key].length})</summary><button data-action="add" data-key="${key}">+ Crear</button>${state[key].map((e) => `<div class="manage-row"><span>${esc(e.name)}${e.archived_at ? " · archivado" : ""}</span><div class="manage-actions">${e.archived_at ? `<button data-action="restore-entity" data-key="${key}" data-id="${esc(e.id)}" aria-label="Restaurar ${esc(e.name)}${key === "tags" ? "" : " en Inicio"}">${key === "tags" ? "Restaurar" : "Restaurar en Inicio"}</button>` : ""}<button data-action="edit-entity" data-key="${key}" data-id="${esc(e.id)}">Editar</button></div></div>`).join("")}</details>`).join("")}</section>
      <section class="panel"><details class="gesture-help"><summary>Ayuda de gestos</summary>${gestureGuide()}</details>${demoMode ? '<p>Demo en este navegador · Datos de ejemplo · Sincronización desactivada.</p>' : '<h2>En tu iPhone</h2><p>En Safari, abre Compartir y elige «Agregar a inicio». Después de la primera carga podrás usar gástalo sin conexión.</p><p class="muted">Borrar los datos de Safari o perder el dispositivo puede borrar el historial. Conserva un respaldo JSON o activa la sincronización.</p>'}<p id="storage-state" class="muted"></p><button data-action="persist">Solicitar almacenamiento persistente</button></section>
      ${demoMode ? '<section class="panel reset-panel"><h2>Datos de ejemplo</h2><p>Descarta tus cambios en la demo y vuelve a cargar los ejemplos.</p><button data-action="reset-demo">Reset demo</button></section>' : '<section class="panel reset-panel"><h2>Empezar desde cero</h2><p>Borra todos los datos y ajustes de este dispositivo. Puedes descargar un respaldo antes de confirmar.</p><button class="danger" data-action="reset-app">Restablecer todo</button></section>'}`;
    }
    const navigationStack = [];
    function rememberNavigation() {
      for (const previous of navigationStack.slice(0, -3)) previous.preview = null;
      navigationStack.push({ view, detailId, detailScope, month, historyLimit,
        scrollX: window.scrollX, scrollY: window.scrollY,
        strips: [...document.querySelectorAll(".entity-strip")].map(strip => strip.scrollLeft),
        preview: captureBackPreview() });
      if (navigationStack.length > 24) navigationStack.shift();
    }
    function goBack() {
      const dialog = $("#dialog"), menu = $("#app-menu");
      if (busy || $('#modal-form button[type="submit"]')?.disabled || settling || pointer) return false;
      if (dialog.open) {
        if (dialog.classList.contains("choosing-tags")) $("#tag-picker-done").click();
        else if ($("#icon-picker") && !$("#icon-picker").hidden) {
          $("#icon-picker").hidden = true;
          $(".icon-preview").setAttribute("aria-expanded", "false");
          $(".icon-preview").focus({ preventScroll: true });
        } else if (dialog.dispatchEvent(new Event("cancel", { cancelable: true }))) dialog.close();
        return true;
      }
      if (menu.open) {
        menu.open = false;
        $("#app-menu summary").focus({ preventScroll: true });
        return true;
      }
      if (editingEntities) {
        setEntityEditing(false);
        return true;
      }
      if (view === "home") return false;
      const previousEntity = view === "detail" ? detailId : null;
      const previous = navigationStack.pop() || { view: "home", detailId: null,
        detailScope: "month", month, historyLimit: 100, scrollX: 0,
        scrollY: homeScroll, strips: homeStripScroll };
      ({ view, detailId, detailScope, month, historyLimit } = previous);
      if (view === "detail" && !entity(detailId)) {
        view = "home";
        detailId = null;
        navigationStack.length = 0;
      }
      render();
      if (view === "home") document.querySelectorAll(".entity-strip").forEach((strip, i) => {
        strip.scrollLeft = previous.strips[i] || 0;
      });
      window.scrollTo(previous.scrollX, previous.scrollY);
      const focus = view === "home" && previousEntity
        ? [...document.querySelectorAll("[data-entity]")].find(card => card.dataset.entity === previousEntity)
        : $("#main");
      focus?.focus({ preventScroll: true });
      return true;
    }
    function render() {
      abortBackAnimation();
      const strips = [...document.querySelectorAll(".entity-strip")], scrollY = window.scrollY;
      if (strips.length) homeStripScroll = strips.map((strip) => strip.scrollLeft);
      resetTransactionSwipe();
      $("#main").classList.toggle("compact-page", ["history", "budgets", "reports", "settings"].includes(view));
      $("#app-menu").hidden = view === "detail";
      $(".app-header").classList.toggle("without-menu", view === "detail");
      $("#header-totals").innerHTML = view === "home" ? homeTotals()
        : view === "detail" ? detailHeader() : "";
      $("#main").classList.toggle(
        "editing-entities",
        editingEntities && view === "home",
      );
      $("#main").innerHTML = {
        home,
        detail,
        history,
        budgets,
        reports,
        settings,
      }[view]();
      if (view === "detail") bindEntityChart();
      if (view === "home") setEntityEditing(editingEntities);
      document.querySelectorAll("nav button").forEach((button) => {
        button.classList.toggle(
          "active",
          button.dataset.view === (view === "detail" ? "home" : view),
        );
        button.setAttribute(
          "aria-current",
          button.dataset.view === (view === "detail" ? "home" : view)
            ? "page"
            : "false",
        );
      });
      $("#undo-button").hidden = !undo;
      if (view === "home") {
        document.querySelectorAll(".entity-strip").forEach((strip, index) => {
          strip.scrollLeft = homeStripScroll[index] || 0;
        });
        window.scrollTo(0, scrollY);
      }
    }
    async function previewImport(next, source) {
      pendingImport = next;
      const dates = next.transactions.map((t) => t.occurred_on).sort();
      const displayDate = formatDate;
      const period = dates.length
        ? `<div><dt>Desde</dt><dd>${displayDate(dates[0])}</dd></div><div><dt>Hasta</dt><dd>${displayDate(dates.at(-1))}</dd></div>`
        : `<div><dt>Período</dt><dd>Sin movimientos</dd></div>`;
      const limits = next.budgets.length ? String(next.budgets.length) : "Sin límites";
      modal(
        "Revisar importación",
        `<p>${esc(source)}</p><dl class="import-summary">${period}<div><dt>Movimientos aceptados</dt><dd>${next.transactions.length}</dd></div><div><dt>Filas pendientes</dt><dd>${next.review.length}</dd></div><div><dt>Cuentas</dt><dd>${next.accounts.length}</dd></div><div><dt>Categorías</dt><dd>${next.categories.length}</dd></div><div><dt>Límites de categoría</dt><dd>${limits}</dd></div></dl><p>Se reemplazarán los datos actuales (${state.transactions.length} movimientos). Puedes descargar un respaldo antes de continuar.</p><button type="button" data-action="export">Descargar respaldo actual</button><label class="check"><input name="confirm" type="checkbox" required>Entiendo que se reemplazarán los datos de este dispositivo.</label>${actions("Importar y reemplazar")}`,
        async () => {
          await commit(pendingImport, "Importación guardada");
          keepMovementDraft(null);
          pendingImport = null;
        },
      );
    }
    function download() {
      const url = URL.createObjectURL(
        new Blob([backup(state)], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `${databaseName}-${formatDate(today()).replaceAll("/", "-")}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    async function deleteTransaction(id) {
      const next = copy(state),
        t = next.transactions.find((t) => t.id === id);
      if (!t || t.status === "deleted") return;
      t.status = "deleted";
      t.deleted_at = t.updated_at = new Date().toISOString();
      await commit(next, "Movimiento borrado", true);
    }
    async function handleAction(button) {
      if (backSwipeAnimation) return;
      const action = button.dataset.action,
        id = button.dataset.id;
      if (action === "reset-demo") return resetDemo();
      if (button.dataset.view) {
        if (button.dataset.view === "home") navigationStack.length = 0;
        else if (button.dataset.view !== view) rememberNavigation();
        view = button.dataset.view;
        if (view === "budgets") archivedBudgetsOpen = false;
        editingEntities = false;
        $("#app-menu").open = false;
        historyLimit = 100;
        render();
        window.scrollTo(0, 0);
        $("#main").focus({ preventScroll: true });
        return;
      }
      if (action === "finish-editing") {
        if (pointer?.reorder) void endPointer({ type: "pointercancel", pointerId: pointer.id });
        return setEntityEditing(false);
      }
      if (action === "remove-entity")
        return removeEntity(button.dataset.key, id);
      if (action === "toggle-icons") {
        const picker = $("#icon-picker");
        picker.hidden = !picker.hidden;
        button.setAttribute("aria-expanded", String(!picker.hidden));
        if (!picker.hidden) {
          const selected = $('#dialog [name="icon"]').value;
          showIconPage(ENTITY_ICON_PAGES.findIndex(page => page.includes(selected)));
        }
        return;
      }
      if (action === "icon-page") return showIconPage(Number(button.dataset.page));
      if (action === "select-icon") {
        $('#dialog [name="icon"]').value = button.dataset.icon;
        $(".icon-preview .entity-mark").innerHTML = iconSvg(
          button.dataset.icon,
        );
        document
          .querySelectorAll("[data-action=select-icon]")
          .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
        $("#icon-picker").hidden = true;
        $(".icon-preview").setAttribute("aria-expanded", "false");
        $(".icon-preview").focus();
        return;
      }
      if (action === "dismiss-gesture-help") {
        gestureHelpDismissed = true;
        try { localStorage.setItem(gestureHelpKey, "dismissed"); } catch {}
        render();
        return;
      }
      if (action === "close") return $("#dialog").close();
      if (action === "dismiss") return dismissNotification();
      if (action === "undo") {
        if (undo) await commit(copy(undo), "Cambio deshecho");
        return;
      }
      if (action === "back-home") {
        goBack();
        return;
      }
      if (action === "detail-scope") {
        detailScope = button.dataset.scope;
        historyLimit = 100;
        return render();
      }
      if (action === "entity-movement") {
        return movement(
          state.categories.some((c) => c.id === detailId) ? "" : detailId,
          state.categories.some((c) => c.id === detailId) ? detailId : "",
        );
      }
      if (action === "movement") {
        $("#app-menu").open = false;
        return movement();
      }
      if (action === "reset-app") return resetApp();
      if (action === "add") return editEntity(button.dataset.key);
      if (action === "edit-entity") return editEntity(button.dataset.key, id);
      if (action === "restore-entity") return restoreEntity(button.dataset.key, id);
      if (action === "edit-transaction")
        return movement(
          "",
          "",
          state.transactions.find((t) => t.id === id),
        );
      if (action === "budget") return editBudget(id);
      if (action === "delete-transaction" || action === "swipe-delete-transaction")
        return deleteTransaction(id);
      if (action === "prev" || action === "next") {
        if (view === "budgets") budgetMonth = shiftMonth(budgetMonth, action === "prev" ? -1 : 1);
        else month = shiftMonth(month, action === "prev" ? -1 : 1);
        detailScope = "month";
        historyLimit = 100;
        return render();
      }
      if (action === "more") {
        historyLimit += 100;
        return render();
      }
      if (action === "clear-filters") {
        filters = defaultFilters();
        historyLimit = 100;
        return render();
      }
      if (action === "apply-filters") {
        const next = Object.fromEntries(
          ["start", "end", "kind", "tagMode", "text"].map((key) => [
            key,
            $("#f-" + key).value,
          ]),
        );
        assert(
          !next.start || !next.end || next.start <= next.end,
          "La fecha inicial debe ser anterior a la final.",
        );
        for (const key of ["entities", "tags"])
          next[key] = [...$("#f-" + key).selectedOptions].map((o) => o.value);
        filters = next;
        historyLimit = 100;
        return render();
      }
      if (action === "export") return download();
      if (action === "sync-disable") return saveSyncSettings(true);
      if (action === "resolve-review") return movement("", "", null, id);
      if (action === "timezone") {
        const next = copy(state);
        next.profile.timezone = $("#timezone").value.trim();
        return commit(next, "Zona horaria guardada");
      }
      if (action === "persist") {
        const granted = await navigator.storage?.persist?.();
        $("#storage-state").textContent = granted
          ? "Almacenamiento persistente concedido."
          : "El navegador decide la disponibilidad. Mantén un respaldo JSON.";
      }
    }
    document.addEventListener("submit", (e) => {
      if (e.target.id !== "sync-form") return;
      e.preventDefault();
      void saveSyncSettings();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void runSync();
    });
    document.addEventListener("scroll", (e) => {
      if (e.target.matches?.(".icon-pages")) updateIconPage();
    }, true);
    document.addEventListener("keydown", (e) => {
      if (!e.target.matches(".icon-pages") || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
      e.preventDefault();
      const current = Math.round(e.target.scrollLeft / e.target.clientWidth);
      showIconPage(e.key === "Home" ? 0 : e.key === "End" ? ENTITY_ICON_PAGES.length - 1
        : current + (e.key === "ArrowRight" ? 1 : -1));
    });
    document.addEventListener("toggle", (e) => {
      if (e.target.id === "archived-categories") archivedBudgetsOpen = e.target.open;
      if (["backup-settings", "calendar-settings"].includes(e.target.id) && e.target.isConnected) {
        if (e.target.open) openSettingsGroups.add(e.target.id);
        else openSettingsGroups.delete(e.target.id);
      }
      if (e.target.id === "shared-filters" && e.target.isConnected) filtersOpen = e.target.open;
      if (e.target.matches?.("[data-manage-key]")) {
        const key = e.target.dataset.manageKey;
        if (e.target.open) openManageGroups.add(key);
        else openManageGroups.delete(key);
      }
    }, true);
    document.addEventListener("click", (e) => {
      if (!$("#app-menu").contains(e.target)) $("#app-menu").open = false;
      if (e.target.matches(".month-picker input, .date-control input")) {
        try {
          e.target.showPicker?.();
        } catch {
          // Native input interaction remains available on browsers without showPicker.
        }
      }
      const button = e.target.closest("[data-action], [data-view]");
      if (button) handleAction(button).catch((error) => notify(error.message));
      const card = e.target.closest("[data-entity]");
      if (card && !suppressClick && !editingEntities)
        openEntity(card.dataset.entity);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !$("#dialog").open) {
        if ($("#app-menu").open) {
          $("#app-menu").open = false;
          $("#app-menu summary").focus();
        } else if (editingEntities) {
          if (pointer?.reorder) void endPointer({ type: "pointercancel", pointerId: pointer.id });
          setEntityEditing(false);
        }
      }
    });
    document.addEventListener("keydown", (e) => {
      const card = e.target.closest("[data-entity]");
      if (!editingEntities || !card || !e.altKey || busy || settling || pointer) return;
      const key = card.dataset.key, ids = active(key).map((item) => item.id);
      const from = ids.indexOf(card.dataset.entity);
      const offset = { ArrowLeft: -1, ArrowRight: 1,
        ArrowUp: key === "categories" ? -4 : 0, ArrowDown: key === "categories" ? 4 : 0 }[e.key];
      if (offset === undefined) return;
      e.preventDefault();
      const to = from + offset;
      if (!offset || to < 0 || to >= ids.length) return;
      ids.splice(to, 0, ids.splice(from, 1)[0]);
      void saveEntityOrder(key, ids, card.dataset.entity);
    });
    function openEntity(id) {
      rememberNavigation();
      homeScroll = window.scrollY;
      detailId = id;
      detailScope = "month";
      historyLimit = 100;
      view = "detail";
      render();
      window.scrollTo(0, 0);
      $("#main").focus();
    }
    let pointer = null,
      settling = false,
      suppressClick = false,
      clickTimer;
    const vibrate = () => {
      try {
        navigator.vibrate?.(15);
      } catch {
        /* Optional on Safari and PWAs. */
      }
    };
    let transactionSwipe = null,
      openTransactionRow = null,
      swipeClickSuppressed = false;
    function showTransactionSwipe(row, offset) {
      row.style.setProperty("--swipe-offset", `${offset}px`);
      row.classList.toggle("is-revealed", offset < 0);
      const button = row.querySelector(".transaction-swipe-delete");
      button.tabIndex = offset < 0 ? 0 : -1;
      button.setAttribute("aria-hidden", String(offset >= 0));
    }
    function closeTransactionRow() {
      if (openTransactionRow) showTransactionSwipe(openTransactionRow, 0);
      openTransactionRow = null;
    }
    function resetTransactionSwipe() {
      const p = transactionSwipe;
      transactionSwipe = null;
      if (p) {
        cancelAnimationFrame(p.frame);
        p.row.classList.remove("is-swiping");
        if (p.front.hasPointerCapture(p.id)) p.front.releasePointerCapture(p.id);
        showTransactionSwipe(p.row, 0);
      }
      closeTransactionRow();
    }
    document.addEventListener("pointerdown", (e) => {
      if (!e.isPrimary || e.button !== 0 || transactionSwipe) return;
      const row = e.target.closest("[data-swipe-transaction]");
      if (openTransactionRow && openTransactionRow !== row) closeTransactionRow();
      if (!row || e.target.closest(".transaction-swipe-delete, a, input, select, textarea, button, .transaction-note")) return;
      transactionSwipe = {
        id: e.pointerId, row, front: row.querySelector(".transaction"),
        startX: e.clientX, startY: e.clientY,
        startOffset: row === openTransactionRow ? -84 : 0,
        offset: row === openTransactionRow ? -84 : 0,
        width: row.getBoundingClientRect().width, dragging: false,
      };
    });
    document.addEventListener("pointermove", (e) => {
      const p = transactionSwipe;
      if (!p || e.pointerId !== p.id) return;
      const dx = e.clientX - p.startX, dy = e.clientY - p.startY;
      if (!p.dragging) {
        if (Math.abs(dy) > 8 && Math.abs(dy) >= Math.abs(dx)) {
          transactionSwipe = null;
          return;
        }
        if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
        p.dragging = true;
        p.row.classList.add("is-swiping");
        p.front.setPointerCapture(p.id);
      }
      e.preventDefault();
      p.offset = Math.max(-p.width, Math.min(0, p.startOffset + dx));
      if (!p.frame) p.frame = requestAnimationFrame(() => {
        p.frame = null;
        showTransactionSwipe(p.row, p.offset);
      });
    }, { passive: false });
    function endTransactionSwipe(e) {
      const p = transactionSwipe;
      if (!p || (e.pointerId !== undefined && e.pointerId !== p.id)) return;
      if (e.type === "lostpointercapture" && p.front.hasPointerCapture(p.id)) return;
      transactionSwipe = null;
      cancelAnimationFrame(p.frame);
      p.row.classList.remove("is-swiping");
      if (p.front.hasPointerCapture(p.id)) p.front.releasePointerCapture(p.id);
      if (!p.dragging) {
        if (p.startOffset < 0) closeTransactionRow();
        return;
      }
      swipeClickSuppressed = true;
      setTimeout(() => { swipeClickSuppressed = false; }, 0);
      const outcome = e.type === "pointerup"
        ? transactionSwipeOutcome(p.offset, p.width) : "closed";
      if (outcome === "delete") {
        showTransactionSwipe(p.row, -p.width);
        openTransactionRow = p.row;
        vibrate();
        deleteTransaction(p.row.dataset.swipeTransaction).catch((error) => {
          closeTransactionRow();
          notify(error.message);
        });
      } else {
        showTransactionSwipe(p.row, outcome === "revealed" ? -84 : 0);
        openTransactionRow = outcome === "revealed" ? p.row : null;
      }
    }
    document.addEventListener("pointerup", endTransactionSwipe);
    document.addEventListener("pointercancel", endTransactionSwipe);
    document.addEventListener("lostpointercapture", endTransactionSwipe);
    window.addEventListener("blur", resetTransactionSwipe);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") resetTransactionSwipe();
    });
    document.addEventListener("click", (e) => {
      if (swipeClickSuppressed && e.target.closest("[data-swipe-transaction]")) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }, true);
    // Listen to touch events so horizontal back gestures can be claimed without
    // restricting native horizontal scrolling in descendant tables and pickers.
    let backSwipe = null, backSwipeClick = false, backSwipeClickTimer,
      backSwipeAnimation = null, backPreviewCSS;
    function captureBackPreview() {
      return [$(".app-top"), $("#main"), $(".app-footer")].map(node => {
        const clone = node.cloneNode(true), box = node.getBoundingClientRect();
        const selector = "input, select, textarea, .entity-strip, .table-scroll, .tag-choices";
        const originals = [...node.querySelectorAll(selector)];
        clone.querySelectorAll(selector).forEach((field, index) => {
          const original = originals[index];
          if (field.matches('input[type="password"], input[type="file"]')) field.removeAttribute("value");
          else if (field.matches("input")) {
            field.setAttribute("value", original.value);
            field.toggleAttribute("checked", original.checked);
          } else if (field.matches("textarea")) field.textContent = original.value;
          else if (field.matches("select")) [...field.options].forEach((option, i) => {
            option.toggleAttribute("selected", original.options[i].selected);
          });
          if (original.scrollLeft) field.dataset.previewScrollLeft = original.scrollLeft;
          if (original.scrollTop) field.dataset.previewScrollTop = original.scrollTop;
        });
        const menu = clone.querySelector("#app-menu");
        if (menu) menu.open = false;
        Object.assign(clone.style, { position: "absolute", top: `${box.top}px`, left: `${box.left}px`,
          width: `${box.width}px`, maxWidth: "none", margin: "0" });
        return clone.outerHTML;
      }).join("");
    }
    function backPreview(html, className) {
      const host = document.createElement("div");
      host.className = className;
      host.inert = true;
      // Closed shadow roots keep visual copies out of app queries and focus.
      const shadow = host.attachShadow({ mode: "closed" });
      backPreviewCSS ??= [...document.styleSheets].map(sheet => {
        try { return [...sheet.cssRules].map(rule => rule.cssText).join("\n"); }
        catch { return ""; }
      }).join("\n");
      shadow.innerHTML = `<style>${backPreviewCSS}</style>${html}`;
      return { host, restoreScroll: () => shadow.querySelectorAll("[data-preview-scroll-left], [data-preview-scroll-top]").forEach(node => {
        node.scrollLeft = Number(node.dataset.previewScrollLeft || 0);
        node.scrollTop = Number(node.dataset.previewScrollTop || 0);
      }) };
    }
    function startBackVisual(p) {
      // Direct manipulation still follows the finger with Reduce Motion enabled;
      // only the automatic settling and the background parallax are omitted.
      const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const dialog = $("#dialog"), menu = $("#app-menu");
      if (!dialog.open && !menu.open && !editingEntities && view !== "home") {
        const stage = document.createElement("div");
        stage.className = "back-swipe-stage";
        stage.setAttribute("aria-hidden", "true");
        const previous = navigationStack.at(-1);
        stage.dataset.previousView = previous?.view || "home";
        const underlay = backPreview(previous?.preview || captureBackPreview(), "back-swipe-underlay"),
          front = backPreview(captureBackPreview(), "back-swipe-front"), shade = document.createElement("div");
        shade.className = "back-swipe-shade";
        stage.append(underlay.host, shade, front.host);
        document.body.append(stage);
        underlay.restoreScroll();
        front.restoreScroll();
        p.visual = { element: front.host, underlay: underlay.host, shade, stage,
          width: innerWidth, end: innerWidth, offset: 0 };
      } else {
        const element = dialog.open ? dialog.classList.contains("choosing-tags") ? $("#tag-picker")
          : $("#icon-picker") && !$("#icon-picker").hidden ? $("#icon-picker") : dialog
          : menu.open ? $("#app-menu nav") : editingEntities ? $("#entity-edit-bar") : null;
        if (!element) return;
        const saved = Object.fromEntries(["transform", "willChange"].map(key => [key, element.style[key]]));
        element.style.willChange = "transform";
        dialog.classList.add("back-swipe-clipping");
        p.visual = { element, saved, width: innerWidth,
          end: innerWidth - element.getBoundingClientRect().left + 20, offset: 0 };
      }
      if (p.visual) p.visual.reducedMotion = reducedMotion;
      document.documentElement.classList.add("back-swipe-active");
    }
    function paintBackVisual(p, dx) {
      const visual = p.visual;
      if (!visual) return;
      visual.offset = Math.max(0, Math.min(visual.end, dx));
      visual.element.style.transform = `translate3d(${visual.offset}px, 0, 0)`;
      if (visual.underlay) {
        visual.underlay.style.transform = `translate3d(${visual.reducedMotion ? 0 : (visual.offset - visual.width) * .25}px, 0, 0)`;
        visual.shade.style.opacity = .12 * Math.max(0, 1 - visual.offset / visual.width);
      }
    }
    function cleanBackVisual(p) {
      const visual = p?.visual;
      if (!visual) return;
      visual.stage?.remove();
      if (visual.saved) Object.assign(visual.element.style, visual.saved);
      $("#dialog").classList.remove("back-swipe-clipping");
      document.documentElement.classList.remove("back-swipe-active", "back-swipe-settling");
      p.visual = null;
    }
    function abortBackAnimation() {
      const p = backSwipe || backSwipeAnimation;
      backSwipe = null;
      if (p) {
        p.cancelled = true;
        p.animations?.forEach(animation => animation.cancel());
        cleanBackVisual(p);
      }
      backSwipeAnimation = null;
    }
    async function finishBackSwipe(p, navigate) {
      const visual = p?.visual;
      if (!visual) { if (navigate) goBack(); return; }
      backSwipeAnimation = p;
      document.documentElement.classList.add("back-swipe-settling");
      const end = navigate ? visual.end : 0;
      const duration = visual.reducedMotion || matchMedia("(prefers-reduced-motion: reduce)").matches ? 0
        : Math.min(240, Math.max(100, Math.abs(end - visual.offset) / visual.width * 240));
      const options = { duration, easing: "cubic-bezier(.22,.7,.25,1)", fill: "forwards" };
      p.animations = [visual.element.animate([
        { transform: `translate3d(${visual.offset}px, 0, 0)` }, { transform: `translate3d(${end}px, 0, 0)` },
      ], options)];
      if (visual.underlay && !visual.reducedMotion) {
        p.animations.push(visual.underlay.animate([
          { transform: `translate3d(${(visual.offset - visual.width) * .25}px, 0, 0)` },
          { transform: `translate3d(${(end - visual.width) * .25}px, 0, 0)` },
        ], options), visual.shade.animate([
          { opacity: .12 * Math.max(0, 1 - visual.offset / visual.width) }, { opacity: navigate ? 0 : .12 },
        ], options));
      }
      try {
        await Promise.allSettled(p.animations.map(animation => animation.finished));
        if (navigate && !p.cancelled && p.layer === backLayer()) goBack();
      } finally {
        p.animations.forEach(animation => animation.cancel());
        cleanBackVisual(p);
        if (backSwipeAnimation === p) backSwipeAnimation = null;
      }
    }
    function cancelBackSwipe() {
      const p = backSwipe;
      backSwipe = null;
      if (p?.dragging) void finishBackSwipe(p, false);
    }
    const backLayer = () => {
      const dialog = $("#dialog"), icons = $("#icon-picker");
      if (dialog.open) return dialog.classList.contains("choosing-tags") ? $("#tag-picker")
        : icons && !icons.hidden ? icons : $("#dialog-body").firstElementChild;
      return $("#app-menu").open ? $("#app-menu") : $("#main").firstElementChild;
    };
    document.addEventListener("touchstart", (event) => {
      cancelBackSwipe();
      if (backSwipeAnimation) return;
      backSwipeClick = false;
      clearTimeout(backSwipeClickTimer);
      const target = event.target, dialog = $("#dialog");
      if (event.touches.length !== 1 || busy || pointer || settling ||
          (dialog.open && !dialog.contains(target)) || window.getSelection()?.toString()) return;
      if (target.closest('input, select, textarea, [contenteditable], .date-control, .chart-interactive, .entity-strip, [data-entity], [data-swipe-transaction], .icon-pages, .tag-choices, .movement-tags, #tag-picker-list')) return;
      for (let node = target; node && node !== document.body; node = node.parentElement) {
        if (node.scrollWidth > node.clientWidth + 2 && /auto|scroll/.test(getComputedStyle(node).overflowX)) return;
      }
      const touch = event.touches[0];
      backSwipe = { id: touch.identifier, x: touch.clientX, y: touch.clientY,
        layer: backLayer(), dragging: false, samples: [{ x: touch.clientX, time: event.timeStamp }] };
    }, { passive: true });
    document.addEventListener("touchmove", (event) => {
      const p = backSwipe;
      if (!p) return;
      const touch = [...event.touches].find(touch => touch.identifier === p.id);
      if (!touch || event.touches.length !== 1 || p.layer !== backLayer() || busy) { cancelBackSwipe(); return; }
      const dx = touch.clientX - p.x, dy = touch.clientY - p.y;
      p.samples = p.samples.filter(sample => sample.time >= event.timeStamp - 120);
      p.samples.push({ x: touch.clientX, time: event.timeStamp });
      if (!p.dragging) {
        if (dx < -12 || (Math.abs(dy) > 12 && Math.abs(dy) >= Math.abs(dx))) { backSwipe = null; return; }
        if (dx < 3 || dx < Math.abs(dy) * 1.7) return;
        // WebKit can commit to native scrolling after the first touchmove.
        // Reserve a clear rightward start before waiting for the visual threshold.
        if (!event.cancelable) { cancelBackSwipe(); return; }
        event.preventDefault();
        if (dx < 12) return;
        p.dragging = true;
        startBackVisual(p);
      }
      if (event.cancelable) {
        event.preventDefault();
        paintBackVisual(p, dx);
      } else cancelBackSwipe();
    }, { passive: false });
    document.addEventListener("touchend", (event) => {
      const p = backSwipe;
      backSwipe = null;
      if (!p?.dragging) return;
      // Prevent a swiped button from activating, while allowing the next tap.
      backSwipeClick = true;
      backSwipeClickTimer = setTimeout(() => { backSwipeClick = false; }, 350);
      const touch = [...event.changedTouches].find(touch => touch.identifier === p.id);
      if (!touch || event.touches.length || p.layer !== backLayer() || window.getSelection()?.toString()) {
        void finishBackSwipe(p, false);
        return;
      }
      const dx = touch.clientX - p.x, dy = Math.abs(touch.clientY - p.y);
      p.samples.push({ x: touch.clientX, time: event.timeStamp });
      paintBackVisual(p, dx);
      void finishBackSwipe(p, backSwipeOutcome({ dx, dy, width: innerWidth, samples: p.samples }) === "back");
    }, { passive: true });
    document.addEventListener("touchcancel", cancelBackSwipe, { passive: true });
    window.addEventListener("blur", abortBackAnimation);
    window.addEventListener("resize", abortBackAnimation);
    document.addEventListener("visibilitychange", () => { if (document.hidden) abortBackAnimation(); });
    document.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse") backSwipeClick = false;
    });
    document.addEventListener("click", (event) => {
      if ((backSwipeClick || backSwipeAnimation) && event.detail > 0) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);
    const dropTarget = (p, x, y) => {
      const card = document.elementFromPoint(x, y)?.closest("[data-entity]");
      if (p.reorder) return card?.dataset.key === p.card.dataset.key ? card : null;
      return card && direction(state, p.from, card.dataset.entity)
        ? card
        : null;
    };
    function paintPointer(p) {
      p.frame = null;
      // Viewport coordinates stay stable while the page is locked.
      p.clone.style.transform = `translate3d(${p.x - 24}px, ${p.y - 64}px, 0) scale(1.4)`;
      const now = performance.now(), elapsedMs = now - (p.lastFrame ?? now);
      p.lastFrame = now;
      if (p.reorder) {
        const distance = Math.min(32, elapsedMs) * 0.4;
        if (p.strip) {
          const box = p.strip.getBoundingClientRect();
          if (p.y >= box.top - 20 && p.y <= box.bottom + 20) {
            const direction = p.x < box.left + 32 ? -1 : p.x > box.right - 32 ? 1 : 0;
            p.strip.scrollLeft += direction * distance;
          }
        }
        const top = $(".app-header").getBoundingClientRect().bottom + 32;
        const direction = p.y < top ? -1 : p.y > innerHeight - 48 ? 1 : 0;
        if (direction) window.scrollBy(0, direction * distance);
      } else if (["sources", "accounts"].includes(p.card.dataset.key)) {
        // Accounts are the horizontally scrollable destination for income and transfers.
        const strip = $(".row-1 .entity-strip");
        if (strip) {
          const box = strip.getBoundingClientRect();
          strip.scrollLeft = scrollEntityStrip({ x: p.x, y: p.y,
            left: box.left, right: box.right, top: box.top, bottom: box.bottom,
            scrollLeft: strip.scrollLeft, scrollWidth: strip.scrollWidth,
            clientWidth: strip.clientWidth }, elapsedMs);
        }
      }
      // Hit-test after scrolling so newly revealed entities receive the highlight.
      const target = dropTarget(p, p.x, p.y);
      if (p.reorder && target && target !== p.card) {
        const from = p.order.indexOf(p.card.closest(".entity-wrap"));
        const to = p.order.indexOf(target.closest(".entity-wrap"));
        p.order.splice(to, 0, p.order.splice(from, 1)[0]);
        p.order.forEach((wrap, index) => { wrap.style.order = index; });
        p.container.querySelector(":scope > .entity-add").style.order = p.order.length;
      }
      if (target !== p.target) {
        p.target?.classList.remove("drop-target");
        target?.classList.add("drop-target");
        p.target = target;
      }
      if (pointer === p) p.frame = requestAnimationFrame(() => paintPointer(p));
    }
    async function saveEntityOrder(key, ids, focusId) {
      const scrolls = [...document.querySelectorAll(".entity-strip")].map((strip) => strip.scrollLeft);
      const scrollY = window.scrollY;
      settling = true;
      try {
        if (ids.some((id, index) => id !== active(key)[index]?.id))
          await commit(reorderEntities(state, key, ids), "Orden guardado", true);
        else render();
      } catch (error) {
        render();
        notify(error.message);
      } finally {
        document.querySelectorAll(".entity-strip").forEach((strip, index) => { strip.scrollLeft = scrolls[index]; });
        window.scrollTo(0, scrollY);
        [...document.querySelectorAll("[data-entity]")].find((card) => card.dataset.entity === focusId)?.focus({ preventScroll: true });
        settling = false;
      }
    }
    async function endReorder(p, e) {
      cancelAnimationFrame(p.frame);
      if (e.type === "pointerup") {
        p.x = e.clientX;
        p.y = e.clientY;
        paintPointer(p);
      }
      const box = p.container.getBoundingClientRect();
      const inside = e.type === "pointerup" && e.clientX >= box.left && e.clientX <= box.right &&
        e.clientY >= box.top && e.clientY <= box.bottom;
      suppressClick = true;
      if (p.card.hasPointerCapture(p.id)) p.card.releasePointerCapture(p.id);
      p.clone.remove();
      document.querySelectorAll(".dragging, .valid-target, .invalid-target, .drop-target").forEach((card) => {
        card.classList.remove("dragging", "valid-target", "invalid-target", "drop-target");
      });
      document.documentElement.classList.remove("is-reordering");
      if (inside) await saveEntityOrder(p.card.dataset.key,
        p.order.map((wrap) => wrap.querySelector("[data-entity]").dataset.entity), p.from);
      else {
        p.order.forEach((wrap) => { wrap.style.order = ""; });
        p.container.querySelector(":scope > .entity-add").style.order = "";
      }
      clickTimer = setTimeout(() => { suppressClick = false; }, 0);
    }
    function startPointer(p) {
      if (pointer !== p || p.dragging) return;
      clearTimeout(p.timer);
      p.dragging = true;
      p.origin = p.card.querySelector(".entity-mark").getBoundingClientRect();
      p.clone = p.card.querySelector(".entity-mark").cloneNode(true);
      p.clone.classList.add("drag-clone");
      p.clone.setAttribute("aria-hidden", "true");
      p.clone.style.setProperty(
        "--row-color",
        getComputedStyle(p.card).getPropertyValue("--row-color"),
      );
      document.body.append(p.clone);
      p.card.classList.add("dragging");
      if (p.reorder) {
        p.container = p.strip || p.card.closest(".entity-grid");
        p.order = [...p.container.querySelectorAll(":scope > .entity-wrap")];
      }
      document.querySelectorAll("[data-entity]").forEach((card) => {
        const valid = p.reorder ? card.dataset.key === p.card.dataset.key
          : !!direction(state, p.from, card.dataset.entity);
        card.classList.toggle(
          "valid-target",
          valid,
        );
        card.classList.toggle(
          "invalid-target",
          card !== p.card && !valid,
        );
      });
      p.scrollX = window.scrollX;
      p.scrollY = window.scrollY;
      // Fixed body also prevents rubber-band page scrolling in installed iOS PWAs.
      if (!p.reorder) {
        document.body.style.top = `-${p.scrollY}px`;
        document.body.style.left = `-${p.scrollX}px`;
      }
      document.documentElement.classList.add(p.reorder ? "is-reordering" : "is-dragging");
      p.card.setPointerCapture(p.id);
      paintPointer(p);
      vibrate();
    }
    document.addEventListener("pointerdown", (e) => {
      if (pointer || settling || busy || !e.isPrimary || e.button !== 0) return;
      const card = e.target.closest("[data-entity]");
      if (!card) return;
      const p = (pointer = {
        id: e.pointerId,
        from: card.dataset.entity,
        card,
        startX: e.clientX,
        startY: e.clientY,
        x: e.clientX,
        y: e.clientY,
        dragging: false,
        reorder: editingEntities,
        strip: card.closest(".entity-strip"),
        scrollStart: card.closest(".entity-strip")?.scrollLeft || 0,
        onCircle: !!e.target.closest(".entity-mark"),
        allowDrag: editingEntities || card.dataset.key !== "categories",
        pageScrollStart: window.scrollY,
      });
      p.timer = editingEntities
        ? null
        : setTimeout(() => {
            if (pointer !== p) return;
            p.editing = true;
            p.reorder = true;
            suppressClick = true;
            p.card.setPointerCapture(p.id);
            setEntityEditing(true);
            vibrate();
          }, 450);
    });
    document.addEventListener(
      "pointermove",
      (e) => {
        const p = pointer;
        if (!p || e.pointerId !== p.id) return;
        p.x = e.clientX;
        p.y = e.clientY;
        const dx = p.x - p.startX,
          dy = p.y - p.startY;
        if (p.editing) {
          e.preventDefault();
          if (Math.hypot(dx, dy) <= 6) return;
          p.editing = false;
          startPointer(p);
        }
        if (!p.dragging && !p.scrolling && !p.verticalScrolling) {
          const intent = gestureIntent({
            dx,
            dy,
            onCircle: p.onCircle,
            canDrag: p.allowDrag,
            canPan: !!p.strip && p.strip.scrollWidth > p.strip.clientWidth,
          });
          if (intent === "scroll") {
            clearTimeout(p.timer);
            if (p.onCircle) {
              // Before a long press, category circles pan the page explicitly.
              // Their touch-action must reserve a later reorder from pointerdown.
              p.verticalScrolling = true;
              p.card.setPointerCapture(p.id);
            } else {
              pointer = null;
              return;
            }
          } else if (intent === "pan") {
            clearTimeout(p.timer);
            p.scrolling = true;
            p.card.setPointerCapture(p.id);
          } else if (intent === "drag") startPointer(p);
        }
        if (p.verticalScrolling) {
          e.preventDefault();
          window.scrollTo(window.scrollX, p.pageScrollStart - dy);
          return;
        }
        if (p.scrolling) {
          e.preventDefault();
          p.strip.scrollLeft = p.scrollStart - dx;
          return;
        }
        if (p.dragging) {
          e.preventDefault();
          if (!p.frame) p.frame = requestAnimationFrame(() => paintPointer(p));
        }
      },
      { passive: false },
    );
    // Circles reserve touch at pointerdown so a held category can reorder too.
    // Names, gaps and headings keep native scrolling.
    document.addEventListener(
      "touchmove",
      (e) => {
        if (pointer?.dragging || pointer?.editing || pointer?.scrolling || transactionSwipe?.dragging)
          e.preventDefault();
      },
      { passive: false },
    );
    async function endPointer(e) {
      const p = pointer;
      if (!p || (e.pointerId !== undefined && e.pointerId !== p.id)) return;
      pointer = null;
      clearTimeout(p.timer);
      if (p.reorder && p.dragging) return endReorder(p, e);
      if (p.editing || p.scrolling || p.verticalScrolling) {
        suppressClick = true;
        if (p.card.hasPointerCapture(p.id)) p.card.releasePointerCapture(p.id);
        clickTimer = setTimeout(() => {
          suppressClick = false;
        }, 0);
        return;
      }
      if (!p.dragging) return;
      settling = true;
      suppressClick = true;
      clearTimeout(clickTimer);
      cancelAnimationFrame(p.frame);
      const target =
        e.type === "pointerup" ? dropTarget(p, e.clientX, e.clientY) : null;
      const rect =
        target?.querySelector(".entity-mark").getBoundingClientRect() ||
        p.origin;
      const stripScroll = [...document.querySelectorAll(".entity-strip")].map((strip) => strip.scrollLeft);
      if (p.card.hasPointerCapture(p.id)) p.card.releasePointerCapture(p.id);
      p.target?.classList.remove("drop-target");
      if (target) vibrate();
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      try {
        const animation = p.clone.animate(
          [
            { transform: p.clone.style.transform },
            { transform: `translate3d(${rect.x}px, ${rect.y}px, 0) scale(1)` },
          ],
          {
            duration: reduced ? 0 : target ? 150 : 200,
            easing: "ease-out",
            fill: "forwards",
          },
        );
        await animation.finished;
      } finally {
        p.clone.remove();
        document
          .querySelectorAll(
            ".dragging, .valid-target, .invalid-target, .drop-target",
          )
          .forEach((card) =>
            card.classList.remove(
              "dragging",
              "valid-target",
              "invalid-target",
              "drop-target",
            ),
          );
        document.documentElement.classList.remove("is-dragging");
        document.body.style.top = "";
        document.body.style.left = "";
        document.querySelectorAll(".entity-strip").forEach((strip, index) => { strip.scrollLeft = stripScroll[index]; });
        window.scrollTo(p.scrollX, p.scrollY);
        settling = false;
        // A new tap must work immediately after settling; suppress only the drag click.
        clickTimer = setTimeout(() => {
          suppressClick = false;
        }, 0);
      }
      render();
      if (target) movement(p.from, target.dataset.entity);
    }
    document.addEventListener("pointerup", endPointer);
    document.addEventListener("pointercancel", endPointer);
    document.addEventListener("lostpointercapture", (e) => {
      // A touch starts on the inner SVG; transferring capture to its card is
      // expected. Cancel only when the card actually loses capture.
      if (pointer && !pointer.card.hasPointerCapture(e.pointerId))
        endPointer(e);
    });
    window.addEventListener("blur", endPointer);
    document.addEventListener("contextmenu", (e) => {
      if (e.target.closest("[data-entity]")) e.preventDefault();
    });
    document.addEventListener("input", (e) => {
      if (e.target.matches(".date-control input")) updateDateControl(e.target);
    });
    document.addEventListener("change", async (e) => {
      try {
        if (e.target.matches(".date-control input")) updateDateControl(e.target);
        if (e.target.id === "month" && monthOK(e.target.value)) {
          if (view === "budgets") budgetMonth = e.target.value;
          else month = e.target.value;
          detailScope = "month";
          historyLimit = 100;
          render();
        }
        if (e.target.id === "csv-file" || e.target.id === "json-file") {
          const file = e.target.files[0];
          if (!file) return;
          assert(file.size <= 32 * 1024 * 1024, "El archivo supera 32 MB.");
          const text = await file.text();
          if (e.target.id === "json-file") {
            let restored;
            try { restored = restore(text); }
            catch (error) {
              throw new Error(error instanceof SyntaxError
                ? "Este archivo no es un respaldo JSON válido. Tus datos no se cambiaron."
                : `No se puede restaurar este respaldo: ${error.message} Tus datos no se cambiaron.`);
            }
            await previewImport(restored, file.name);
          } else {
            const digest = await crypto.subtle.digest(
              "SHA-256",
              new TextEncoder().encode(text),
            );
            const hash = [...new Uint8Array(digest)]
              .map((v) => v.toString(16).padStart(2, "0"))
              .join("");
            await previewImport(
              importCSV(text, $("#import-budget-month").value || null, hash),
              file.name,
            );
          }
          e.target.value = "";
        }
      } catch (error) {
        notify(error.message);
        e.target.value = "";
      }
    });
    window.addEventListener("online", () => {
      $("#offline").hidden = true;
    });
    window.addEventListener("offline", () => {
      $("#offline").hidden = false;
    });
    $("#offline").hidden = navigator.onLine;
    try {
      db = await new Promise((resolve, reject) => {
        const r = indexedDB.open(databaseName, 1);
        r.onupgradeneeded = () => r.result.createObjectStore("state");
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
        r.onblocked = () =>
          reject(
            new Error("Cierra otras pestañas para abrir la base de datos."),
          );
      });
      db.onversionchange = () => {
        db.close();
        notify("Recarga para actualizar la base de datos.");
      };
      await load();
      render();
      // Load sync settings after rendering; configuration/network failures stay local.
      if (!demoMode) void (async () => {
        try {
          const config = await new Promise((resolve, reject) => {
            const r = db.transaction("state").objectStore("state").get("sync_config");
            r.onsuccess = () => resolve(r.result);
            r.onerror = () => reject(r.error);
          });
          if (config) syncConfig = config;
          syncReady = true;
          if (view === "settings") render();
          void runSync();
        } catch {
          syncConfig.lastError = "No se pudo leer la configuración de sincronización";
          updateSyncStatus();
        }
      })();
    } catch (error) {
      $("#main").innerHTML =
        `<section class="panel"><h1>No se pudo abrir el historial</h1><p>${esc(error.message)}</p><p>Recarga la página. No borres los datos de Safari si necesitas recuperar tu historial.</p></section>`;
    }
    // A standalone iPhone app can resume without navigating or running boot again.
    const appScript = new URL(document.querySelector('script[src*="app.js?v="]').src),
      appVersion = Number(appScript.searchParams.get("v"));
    $("#app-version").textContent = `v${appVersion}`;
    let checkingAppVersion = false, availableAppVersion = null, queuedVersionCheck = 0, applyingAppUpdate = false;
    function applyAppUpdate() {
      if (applyingAppUpdate || !availableAppVersion || document.visibilityState !== "visible" ||
          $("#dialog").open || view === "settings" || busy || editingEntities || pointer || settling || backSwipe || backSwipeAnimation) return;
      const url = new URL(location.href);
      url.searchParams.set("app-version", availableAppVersion);
      availableAppVersion = null;
      applyingAppUpdate = true;
      location.replace(url.href);
    }
    async function checkAppVersion(manual = false) {
      if (applyingAppUpdate || document.visibilityState !== "visible") return;
      if (checkingAppVersion) {
        queuedVersionCheck = Math.max(queuedVersionCheck, manual ? 2 : 1);
        return;
      }
      if (!navigator.onLine) {
        if (manual) notify("Conéctate a internet para actualizar la app.");
        return;
      }
      checkingAppVersion = true;
      const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const url = new URL("./index.html", location.href);
        url.searchParams.set("app-check", Date.now());
        const response = await fetch(url, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("HTTP " + response.status);
        const html = new DOMParser().parseFromString(await response.text(), "text/html"),
          src = html.querySelector('script[src*="app.js?v="]')?.getAttribute("src");
        if (!src) throw new Error("Versión no disponible");
        const latest = new URL(src, url), version = latest.searchParams.get("v");
        if (latest.origin !== appScript.origin || latest.pathname !== appScript.pathname || !/^\d+$/.test(version))
          throw new Error("Versión no disponible");
        if (Number(version) > appVersion) {
          availableAppVersion = version;
          if ($("#dialog").open || view === "settings")
            notify("Actualización lista. Se aplicará al cerrar el formulario o volver a Inicio.");
          applyAppUpdate();
        } else if (manual) notify(`La app está actualizada (v${appVersion}).`);
      } catch {
        if (manual) notify("No se pudo comprobar la actualización. Intenta de nuevo con conexión.");
      } finally {
        clearTimeout(timeout);
        checkingAppVersion = false;
        const queued = queuedVersionCheck;
        queuedVersionCheck = 0;
        if (queued && !applyingAppUpdate) void checkAppVersion(queued === 2);
      }
    }
    $("#update-app").onclick = () => checkAppVersion(true);
    $("#dialog").addEventListener("close", applyAppUpdate);
    document.addEventListener("click", () => { if (availableAppVersion) setTimeout(applyAppUpdate, 0); });
    document.addEventListener("visibilitychange", () => { void checkAppVersion(); });
    window.addEventListener("pageshow", () => { void checkAppVersion(); });
    window.addEventListener("online", () => { void checkAppVersion(); });
    void checkAppVersion();
    if ("serviceWorker" in navigator)
      navigator.serviceWorker
        .register("./sw.js", { updateViaCache: "none" })
        .then((registration) => {
          const update = () => {
            if (document.visibilityState === "visible" && navigator.onLine)
              void registration.update().catch(() => {});
          };
          document.addEventListener("visibilitychange", update);
          window.addEventListener("pageshow", update);
          window.addEventListener("online", update);
        })
        .catch(() =>
          notify(
            "No se pudo preparar el modo sin conexión. Vuelve a abrir con conexión.",
          ),
        );
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
