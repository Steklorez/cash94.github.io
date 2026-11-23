/*
 * Боковое меню главной — пример расширения на мосту к DOM (TS.dom / TS.keys /
 * TS.app). Открывается «влево», когда левее идти некуда (первая карточка
 * ряда, первый пункт шапки): событие nav с moved: false. В меню — подборки
 * (с общей приставкой «Кинопоиск · …» — группой), плитки категорий и разделы
 * шапки. Вверх/вниз — выбор, ОК — перейти, вправо или «Назад» — закрыть.
 * Заодно «★ 7.5» в углу постеров рядов.
 *
 * С 1.1 — под пульт: без кнопок баннера («Смотреть», «‹ ›» — с пульта до них не
 * дойти, пока листаешь ряд), карточки рядов на 20% крупнее за их счёт, «▶» на
 * карточке под фокусом, заметный фокус в шапке, значки категорий в меню и
 * «В кинотеатрах» первым пунктом категорий.
 */
TS.register({
  name: 'Боковое меню главной',
  version: '1.2',
  description: 'Меню подборок по «влево», главная и каталог плитками, оценки на постерах, серии по сезонам.'
});

TS.ui.addStyle([
  '#ext-sb{position:fixed;left:0;top:0;bottom:0;width:30vw;min-width:280px;max-width:520px;z-index:9000;',
  ' background:rgba(14,17,22,.97);box-shadow:8px 0 40px rgba(0,0,0,.6);overflow:hidden;',
  ' font-size:calc(14px + .45vw);color:#e8edf4;transform:translateX(-102%);transition:transform .18s}',
  '#ext-sb.open{transform:none}',
  '#ext-sb .sb-list{position:absolute;left:0;right:0;top:0;bottom:3.2em;overflow:hidden;padding:1.2em 0}',
  '#ext-sb .sb-group{padding:.9em 1.4em .3em;font-size:.72em;letter-spacing:.06em;text-transform:uppercase;color:#8b98ab}',
  '#ext-sb .sb-item{display:flex;align-items:center;padding:.5em 1.4em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  '#ext-sb .sb-item.in-group{padding-left:2.2em}',
  '#ext-sb .sb-item i{margin-right:.6em;opacity:.8}',
  '#ext-sb .sb-item.cur{color:var(--focus-color,#ff8c00)}',
  '#ext-sb .sb-item.sel{background:#fff;color:#000;border-radius:0 .5em .5em 0}',
  '#ext-sb .sb-hint{position:absolute;left:0;right:0;bottom:0;padding:.9em 1.4em;font-size:.7em;color:#8b98ab;',
  ' border-top:1px solid rgba(255,255,255,.08)}',
  // Оценка — в левом верхнем углу и тем же оранжевым, что «★» в строке баннера
  '.ext-rate{position:absolute;left:.4em;top:.4em;z-index:3;padding:.2em .5em;border-radius:.45em;',
  ' background:rgba(0,0,0,.72);color:#fff;font-size:2.7vh;font-weight:700;line-height:1.3}',
  '.ext-rate b{color:#ff8c00;margin-right:.2em}',

  // Кнопки баннера: с пульта до них не дойти, пока листаешь ряд. Скрытые главная
  // пропускает сама (offsetParent === null) — «вверх» с ряда ведёт в ряд выше
  '#home-play-btn,#home-prev-btn,#home-next-btn{display:none!important}',

  // «▶» по центру карточки под фокусом (::after постера занят рамкой фокуса)
  '.catalog-row-card.home-card.focused:not(.home-cat-tile) .row-poster-img:before{content:"";position:absolute;',
  ' left:50%;top:50%;z-index:3;width:9vh;height:9vh;margin:-4.5vh 0 0 -4.5vh;box-sizing:border-box;',
  ' border-radius:50%;border:.35vh solid rgba(255,140,0,.9);background:rgba(0,0,0,.42);pointer-events:none}',
  '.catalog-row-card.home-card.focused:not(.home-cat-tile) .row-poster-img:after{content:"";position:absolute;',
  ' left:50%;top:50%;z-index:4;margin:-1.6vh 0 0 -.9vh;border-style:solid;border-width:1.6vh 0 1.6vh 2.6vh;',
  ' border-color:transparent transparent transparent rgba(255,140,0,.95);pointer-events:none}',

  // Фокус в шапке: у пунктов он — только цвет текста, его не отличить от текущего раздела
  'body #home-topbar .home-nav-btn.focused,body #detail-view .home-nav-btn.focused{',
  ' background:#fff!important;color:#000!important;border-radius:.45em;box-shadow:0 0 0 .4em #fff!important}',
  'body #home-topbar .home-nav-btn.focused i,body #detail-view .home-nav-btn.focused i{color:#000!important}',
  'body #home-topbar .home-nav-btn.home-nav-icon.focused,body #detail-view .home-nav-btn.home-nav-icon.focused{',
  ' border-radius:50%;border-color:#fff!important;box-shadow:none!important}',
  // Текущий раздел — всегда виден: полупрозрачная белая плашка (фокус — сплошная)
  'body #home-topbar .home-nav-btn.active:not(.focused),body #detail-view .home-nav-btn.active:not(.focused){',
  ' color:#fff!important;background:rgba(255,255,255,.2)!important;border-radius:.45em;',
  ' box-shadow:0 0 0 .4em rgba(255,255,255,.2)!important}'
].join('\n'));

var menu = null;        // { root, list, items, sel }
var opening = false;

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function splitName(name) {
  var m = /^(.+?)\s*(?:·|:|—|\|)\s*(.+)$/.exec(name);
  return m ? { prefix: m[1], rest: m[2].charAt(0).toUpperCase() + m[2].slice(1) } : null;
}

// «…В кинотеатрах» — первым пунктом категорий: самое свежее, туда заходят чаще всего
var PIN_FIRST = /в кинотеатрах$/i;

/** Значок плитки категории — тот же глиф, что водяным знаком на самой плитке */
var tileIcons = {};

function loadTileIcons(home) {
  var jobs = [];
  home.rows.forEach(function (row) {
    row.cards.forEach(function (c) {
      if (!c.tile || tileIcons[c.h]) return;
      jobs.push(TS.dom.query('.home-cat-watermark', { root: c.h, limit: 1, text: false }).then(function (r) {
        var cls = r[0] && r[0].cls.split(' ').filter(function (x) { return x && x !== 'home-cat-watermark'; }).join(' ');
        if (cls) tileIcons[c.h] = cls;
      }).catch(function () { }));
    });
  });
  return Promise.all(jobs).then(function () { return tileIcons; });
}

/** Подряд идущие с общей приставкой («Что популярно · …») — группой; в именах хвост */
function groupConsecutive(list) {
  var out = [];
  for (var i = 0; i < list.length; i++) {
    var it = list[i], cur = it.split;
    var prev = i > 0 && list[i - 1].split, next = list[i + 1] && list[i + 1].split;
    var samePrev = cur && prev && prev.prefix === cur.prefix, sameNext = cur && next && next.prefix === cur.prefix;
    if (cur && (samePrev || sameNext)) {
      if (!samePrev) out.push({ group: cur.prefix });
      it.name = cur.rest;
      it.inGroup = true;
    }
    out.push(it);
  }
  return out;
}

/**
 * Пункты меню, сверху вниз:
 *  - подборки до плиток («Продолжить просмотр»);
 *  - «Категории»: «…В кинотеатрах» первым, затем плитки без приставки;
 *  - остальные подборки главной, с общей приставкой — группами («Топ рейтинга»…);
 *  - в самом конце — семейства с приставкой, у которых есть плитки («Кинопоиск»):
 *    его плитки-категории и его подборки главной одной группой.
 * Разделов шапки в меню нет: до них один шаг вверх.
 */
function buildItems(home, navBtns, icons) {
  var rows = [], tiles = [], tileGroup = 'Категории', tilesAt = -1;
  home.rows.forEach(function (row) {
    if (!row.cards.length) return;
    if (row.cards[0].tile) {
      tileGroup = row.title || tileGroup;
      tilesAt = rows.length;
      row.cards.forEach(function (c) {
        tiles.push({ name: c.title, h: c.h, click: true, tile: true, icon: icons[c.h] || 'fi fi-rr-apps', split: splitName(c.title) });
      });
      return;
    }
    var card = row.cards[Math.min(row.col, row.cards.length - 1)];
    rows.push({ name: row.title, h: card.h, row: row.h, cur: row.index === home.activeRow, split: splitName(row.title) });
  });
  if (tilesAt < 0) return groupConsecutive(rows);

  var before = rows.slice(0, tilesAt), after = rows.slice(tilesAt);
  var plain = [], families = [], byPrefix = {};
  tiles.forEach(function (t) {
    if (!t.split) { plain.push(t); return; }
    var p = t.split.prefix;
    if (!byPrefix[p]) { byPrefix[p] = []; families.push(p); }
    byPrefix[p].push(t);
  });

  var middle = [], pinned = null;
  after.forEach(function (r) {
    if (!pinned && PIN_FIRST.test(r.name)) { pinned = r; return; }
    if (r.split && byPrefix[r.split.prefix]) { byPrefix[r.split.prefix].push(r); return; }
    middle.push(r);
  });

  var out = groupConsecutive(before);
  out.push({ group: tileGroup });
  if (pinned) {
    pinned.name = pinned.split ? pinned.split.rest : pinned.name;
    pinned.icon = 'fi fi-rr-popcorn';
    pinned.inGroup = true;
    out.push(pinned);
  }
  plain.forEach(function (t) { t.inGroup = true; out.push(t); });
  out = out.concat(groupConsecutive(middle));
  families.forEach(function (p) {
    out.push({ group: p });
    byPrefix[p].forEach(function (it) { it.name = it.split.rest; it.inGroup = true; out.push(it); });
  });
  return out;
}

function render() {
  var html = '';
  menu.items.forEach(function (it, i) {
    if (it.group) { html += '<div class="sb-group">' + esc(it.group) + '</div>'; return; }
    html += '<div class="sb-item' + (it.inGroup ? ' in-group' : '') + (it.cur ? ' cur' : '') +
      (i === menu.sel ? ' sel' : '') + '" data-i="' + i + '">' +
      (it.icon ? '<i class="' + esc(it.icon) + '"></i>' : '') + esc(it.name) + '</div>';
  });
  // Выбранный пункт держим в середине списка: прокрутки у ТВ нет — сдвигаем отступом
  var before = menu.items.slice(0, menu.sel).length;
  var shift = Math.max(0, before - 6);
  TS.dom.update(menu.list, { html: '<div style="margin-top:' + (-shift * 2.1) + 'em">' + html + '</div>' });
}

function move(step) {
  var i = menu.sel;
  do { i += step; } while (menu.items[i] && menu.items[i].group);
  if (!menu.items[i]) return;
  menu.sel = i;
  render();
}

function open() {
  if (menu || opening) return;
  opening = true;
  Promise.all([TS.app.home(), TS.dom.query('#home-topbar .home-nav-btn'), TS.app.screen()]).then(function (r) {
    var home = r[0], nav = r[1];
    if (!home.ready) { opening = false; return; }
    return loadTileIcons(home).then(function (icons) { return { home: home, nav: nav, icons: icons, screen: r[2] }; });
  }).then(function (r) {
    if (!r) return;
    var home = r.home;
    var items = buildItems(home, r.nav, r.icons);
    var sel = pickCurrent(items, r.screen);
    return TS.dom.create(
      '<aside id="ext-sb"><div class="sb-list"></div>' +
      '<div class="sb-hint">OK — перейти · ▶ или «Назад» — закрыть</div></aside>'
    ).then(function (root) {
      return TS.dom.query('.sb-list', { root: root.h, limit: 1 }).then(function (l) {
        menu = { root: root, list: l[0], items: items, sel: sel };
        opening = false;
        render();
        TS.keys.capture(true);
        setTimeout(function () { if (menu) TS.dom.update(menu.root, { addClass: 'open' }); }, 20);
      });
    });
  }).catch(function () { opening = false; });
}

// Последний выбранный пункт меню — чтобы меню открывалось там, где вы сейчас. Подборку
// главной меню узнаёт само (показанный ряд), а категорию каталога — нет: каталог не
// говорит, какая плитка его открыла
var LAST_PICK = 'lastPick';

function pickKey(it) { return (it.tile ? 'tile:' : 'item:') + it.name; }

/** Пункт, на котором открыть меню: в каталоге — последняя выбранная категория, на главной — показанная подборка */
function pickCurrent(items, screen) {
  var last = TS.storage.get(LAST_PICK, ''), cur = -1, picked = -1;
  for (var i = 0; i < items.length; i++) {
    if (items[i].group) continue;
    if (items[i].cur && cur < 0) cur = i;
    if (last && pickKey(items[i]) === last) picked = i;
  }
  if (screen === 'catalog' && picked >= 0 && items[picked].tile) {
    // Каталог открыт этой категорией: отмечаем её текущей, а подборку главной — нет
    if (cur >= 0) items[cur].cur = false;
    items[picked].cur = true;
    return picked;
  }
  if (cur >= 0) return cur;
  if (picked >= 0) return picked;
  var first = 0;
  while (items[first] && items[first].group) first++;
  return first;
}

function close(go) {
  if (!menu) return;
  var m = menu;
  menu = null;
  TS.keys.capture(false);
  TS.dom.remove(m.root);
  // Фокус снова на плитке главной (тот же или в выбранной подборке) — сетке нужен пульт
  setTimeout(armGrid, 450);
  if (!go) return;
  var it = m.items[m.sel];
  if (!it || !it.h) return;
  TS.storage.set(LAST_PICK, pickKey(it));
  // Разделы шапки нажимаются с любого экрана
  if (it.click && !it.tile) { TS.dom.click(it.h); return; }
  TS.app.screen().then(function (s) {
    if (s === 'home') return goItem(it);
    // Меню открыто из каталога: подборки и плитки категорий живут на главной, и плитка
    // нажимается только оттуда. Сначала на главную («Главная» в шапке), к пункту — когда
    // она встала на экран и вернула свой фокус (иначе он перебил бы наш)
    pendingRow = it;
    showLoader();
    return TS.dom.query('#home-nav-home', { limit: 1, text: false }).then(function (b) {
      if (b[0]) TS.dom.click(b[0].h); else { pendingRow = null; hideLoader(); }
    });
  }).catch(function () { });
}

var pendingRow = null;

// ---- Заставка перехода ----
// Из каталога в другую категорию или подборку идём через главную, и она мелькала на
// полсекунды. На время перехода закрываем экран своей заставкой; снимаем, когда
// открылось выбранное (или через LOADER_MAX — что бы ни случилось)
var LOADER_MAX = 5000;
var loader = { el: null, timer: 0, waitCatalog: false };

TS.ui.addStyle([
  '#ext-sb-loading{position:fixed;left:0;top:0;right:0;bottom:0;z-index:9500;background:#000;',
  ' display:flex;align-items:center;justify-content:center}',
  '#ext-sb-loading i{display:block;width:7vh;height:7vh;box-sizing:border-box;border-radius:50%;',
  ' border:.6vh solid rgba(255,255,255,.15);border-top-color:#ff8c00;animation:ext-sb-spin .8s linear infinite}',
  '@keyframes ext-sb-spin{to{transform:rotate(360deg)}}'
].join('\n'));

function showLoader() {
  clearTimeout(loader.timer);
  loader.timer = setTimeout(hideLoader, LOADER_MAX);
  if (loader.el) return;
  loader.el = 'pending';
  TS.dom.create('<div id="ext-sb-loading"><i></i></div>').then(function (el) {
    if (loader.el === 'pending') loader.el = el; else TS.dom.remove(el);
  }).catch(function () { loader.el = null; });
}

function hideLoader() {
  clearTimeout(loader.timer);
  loader.waitCatalog = false;
  var el = loader.el;
  loader.el = null;
  if (el && el !== 'pending') TS.dom.remove(el);
}

/**
 * Ряды главной, кроме показанного, спрятаны (home-row-hidden), а фокус мост ставит
 * только на видимое — переход в другую подборку молча не срабатывал. Снимаем класс с
 * нужного ряда и фокусируем: главная (focusItem → setActiveRow) сама разложит классы
 * рядов заново, как при «вниз».
 */
function goItem(it) {
  if (it.click) return TS.dom.click(it.h).catch(function () { });
  var show = it.row ? TS.dom.update(it.row, { removeClass: 'home-row-hidden' }) : Promise.resolve();
  return show.then(function () { return TS.dom.focus(it.h); }).catch(function () { });
}

TS.on('screen', function (s) {
  if (s === 'catalog' && loader.waitCatalog) {
    // Сетке категории — мгновение на первую отрисовку, потом убираем заставку
    setTimeout(hideLoader, 350);
    return;
  }
  if (s !== 'home' || !pendingRow) return;
  var it = pendingRow;
  pendingRow = null;
  setTimeout(function () {
    if (it.click) loader.waitCatalog = true;           // плитка откроет каталог
    goItem(it).then(function () { if (!it.click) setTimeout(hideLoader, 250); });
  }, 500);
});

// Мышью и пальцем — клик по пункту
TS.dom.on('#ext-sb .sb-item', 'click', function (node) {
  if (!menu) return;
  menu.sel = +node.attrs['data-i'];
  close(true);
});

// Меню — с главной и с экранов-сеток (каталог, «Мои торренты»): «влево» с края
var MENU_SCREENS = { home: 1, catalog: 1, torrents: 1 };
// Сетки, где стрелки на краю строки переносят фокус на соседнюю строку
var WRAP_SCREENS = { catalog: 1, torrents: 1 };

// В сетках «влево» с первой колонки не упирается в край, а переносит фокус в конец
// строки выше (moved: true), «вправо» с последней — в начало строки ниже. Край есть
// только у самой первой карточки. Перенос узнаём по тому, что фокус ушёл не в ту
// сторону: «влево» — вправо, «вправо» — влево. Возвращаем фокус на прежнюю карточку;
// у левого края заодно открываем меню
var lastGridFocus = null;

function wrapped(e) {
  var was = lastGridFocus, now = e.focused;
  if (!WRAP_SCREENS[e.screen] || !e.moved || !was || !was.rect || !now || !now.rect) return '';
  if (e.key === 'left' && now.rect.x > was.rect.x + 5) return 'left';
  if (e.key === 'right' && now.rect.x < was.rect.x - 5) return 'right';
  return '';
}

TS.on('nav', function (e) {
  if (menu) return;
  var w = wrapped(e);
  if (w) {
    // Фокус возвращаем на прежнюю карточку и её же помним: следующее нажатие в ту же
    // стену снова должно узнаваться
    var back = lastGridFocus;
    var f = TS.dom.focus(back.h);
    if (w === 'left') f.then(open, open);
    return;
  }
  lastGridFocus = WRAP_SCREENS[e.screen] ? e.focused : null;
  if (e.screen === 'home' && e.focused && /\bhome-card\b/.test(e.focused.cls)) armGrid();
  if (!MENU_SCREENS[e.screen] || e.key !== 'left' || e.moved) return;
  open();
});

TS.on('key', function (dir) {
  if (menu) {
    if (dir === 'up') move(-1);
    else if (dir === 'down') move(1);
    else if (dir === 'enter') close(true);
    else if (dir === 'right' || dir === 'back') close(false);
    return true;
  }
  if (grid.active) { gridKey(dir); return true; }
  return false;
});

// ---- Главная плитками ----
// Вместо баннера и одного ряда-ленты — показанная подборка целиком, сеткой плиток.
// Вверх/вниз ходят по сетке внутри подборки и в соседнюю не перескакивают; подборки
// переключаются меню («влево» с первой колонки). Пока фокус на плитках, пульт держим
// сами (TS.keys.capture): стрелки главной переключали бы подборки. Вверх с первой
// строки и «Назад» — в шапку, пульт отдаём приложению; «вниз» из шапки вернёт его нам.
var GRID_TOP = 120;       // выше — шапка и заголовок подборки
var GRID_BOTTOM_PAD = 24;
var ROW_CARDS = '#home-rows .catalog-row:not(.home-row-hidden) .catalog-row-card';
var grid = { active: false, busy: false, shift: 0, rowsH: null };

TS.ui.addStyle([
  '#home-hero{display:none!important}',
  '#home-rows{transition:transform .15s ease-out}',
  '#home-rows .catalog-row:not(.home-row-hidden) .catalog-row-viewport{overflow:visible!important}',
  '#home-rows .catalog-row:not(.home-row-hidden) .catalog-row-track{flex-wrap:wrap!important;',
  ' transform:none!important;width:auto!important}',
  '.home-row-next{display:none!important}',
  // Ровно 4 плитки в ряд при любом размере экрана и ползунке «Размер карточек»: ширина —
  // четверть ряда минус зазоры (gap 18px), картинка — 16:9 от ширины (padding-top)
  '#home-rows .catalog-row:not(.home-row-hidden) .catalog-row-card.home-card{',
  ' flex:0 0 calc(25% - 13.5px)!important;width:calc(25% - 13.5px)!important}',
  '#home-rows .catalog-row:not(.home-row-hidden) .catalog-row-card.home-card .torrent-poster{',
  ' width:100%!important;height:auto!important;padding:0!important;aspect-ratio:auto!important}',
  '#home-rows .catalog-row:not(.home-row-hidden) .catalog-row-card.home-card .row-poster-img{',
  ' width:100%!important;height:0!important;padding-top:56.25%!important}',
  '#home-rows .catalog-row:not(.home-row-hidden) .row-poster-img>*{position:absolute!important;',
  ' left:0;top:0;width:100%!important;height:100%!important}',
  // Название плитки — целиком, до двух строк
  '#home-rows .catalog-row-card.home-card{height:auto!important}',
  '#home-rows .home-tile-label{height:auto!important;white-space:normal!important;font-size:2.6vh!important;',
  ' display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;line-height:1.25!important;',
  ' padding-top:.35em}'
].join('\n'));

function rowsHandle() {
  if (grid.rowsH) return Promise.resolve(grid.rowsH);
  return TS.dom.query('#home-rows', { limit: 1, text: false }).then(function (r) {
    grid.rowsH = r[0] ? r[0].h : null;
    return grid.rowsH;
  });
}

/** Сдвигаем сетку (transform: прокрутку главная держит на нуле), чтобы плитка была видна */
function scrollToCard(card, vh, firstRow) {
  if (!card || !card.rect) return;
  var top = card.rect.y, bottom = card.rect.y + card.rect.h;
  var shift = grid.shift;
  if (firstRow) shift = 0;   // первая строка — сетка на месте, заголовок подборки виден
  else if (bottom > vh - GRID_BOTTOM_PAD) shift += bottom - (vh - GRID_BOTTOM_PAD);
  else if (top < GRID_TOP) shift -= GRID_TOP - top;
  shift = Math.max(0, Math.round(shift));
  if (shift === grid.shift) return;
  grid.shift = shift;
  rowsHandle().then(function (h) {
    if (h) TS.dom.update(h, { style: { transform: shift ? 'translateY(-' + shift + 'px)' : '' } });
  });
}

function viewportHeight() {
  return TS.dom.query('#main-container', { limit: 1, rect: true, text: false }).then(function (r) {
    return r[0] && r[0].rect ? r[0].rect.y + r[0].rect.h : 720;
  });
}

/** Фокус на плитке главной — пульт наш */
function armGrid() {
  if (menu || grid.active) return;
  TS.app.screen().then(function (s) {
    if (s !== 'home' || menu) return;
    return TS.dom.focused().then(function (f) {
      if (!f || !/\bhome-card\b/.test(f.cls)) return;
      grid.active = true;
      TS.keys.capture(true);
      return viewportHeight().then(function (vh) { scrollToCard(f, vh); });
    });
  }).catch(function () { });
}

function releaseGrid() {
  if (!grid.active) return;
  grid.active = false;
  TS.keys.capture(false);
}

function toTopbar() {
  releaseGrid();
  TS.dom.query('#home-topbar .home-nav-btn.active, #home-nav-home', { limit: 2, text: false }).then(function (b) {
    if (b[0]) TS.dom.focus(b[0].h);
  }).catch(function () { });
}

function gridKey(dir) {
  if (dir === 'back') {
    // Пульт приложение уже забрало («Назад» отпускает захват всегда); оно же шлёт back
    // при смене экрана — тогда шапка ни при чём
    grid.active = false;
    TS.app.screen().then(function (s) { if (s === 'home') toTopbar(); });
    return;
  }
  if (grid.busy) return;
  grid.busy = true;
  Promise.all([TS.dom.query(ROW_CARDS, { rect: true, text: false, limit: 300 }), viewportHeight()]).then(function (r) {
    var cards = r[0], vh = r[1];
    if (!cards.length) return;
    var idx = 0;
    for (var i = 0; i < cards.length; i++) if (cards[i].focused) { idx = i; break; }
    var y0 = cards[0].rect.y, cols = 0;
    for (var j = 0; j < cards.length; j++) if (Math.abs(cards[j].rect.y - y0) < 3) cols++;
    cols = Math.max(1, cols);
    var col = idx % cols, row = Math.floor(idx / cols), lastRow = Math.floor((cards.length - 1) / cols);
    var t = -1;
    if (dir === 'enter') return TS.dom.click(cards[idx].h);
    if (dir === 'right') t = col < cols - 1 && idx + 1 < cards.length ? idx + 1 : -1;
    else if (dir === 'left') {
      if (col === 0) { releaseGrid(); open(); return; }
      t = idx - 1;
    } else if (dir === 'down') {
      if (idx + cols < cards.length) t = idx + cols;
      else if (row < lastRow) t = cards.length - 1;
    } else if (dir === 'up') {
      if (row > 0) t = idx - cols;
      else { toTopbar(); return; }
    }
    if (t < 0) return;
    return TS.dom.focus(cards[t].h).then(function () { scrollToCard(cards[t], vh, t < cols); });
  }).then(function () { grid.busy = false; }, function () { grid.busy = false; });
}

TS.on('screen', function (s) {
  if (s !== 'home') { grid.active = false; return; }
  setTimeout(armGrid, 600);
});
setTimeout(armGrid, 1200);

// ---- Оценки на постерах ----
var decorating = false;

function fmt(v) { v = Number(v); return v > 0 ? (Math.round(v * 10) / 10).toFixed(1) : ''; }

function decorate() {
  if (decorating) return;
  decorating = true;
  TS.app.home().then(function (home) {
    if (!home.ready) return;
    var jobs = [];
    home.rows.forEach(function (row) {
      row.cards.forEach(function (c) {
        var r = c.item && fmt(c.item.vote);
        if (!r) return;
        jobs.push(TS.dom.query('.torrent-poster', { root: c.h, limit: 1, text: false }).then(function (box) {
          if (!box[0]) return;
          return TS.dom.query('.ext-rate', { root: box[0].h, limit: 1, text: false }).then(function (have) {
            if (!have.length) return TS.dom.create('<span class="ext-rate"><b>★</b>' + r + '</span>', { parent: box[0].h });
          });
        }).catch(function () { }));
      });
    });
    return Promise.all(jobs);
  }).then(function () { decorating = false; }, function () { decorating = false; });
}

TS.on('home', decorate);
// Меню принадлежит экрану, на котором его открыли: сменился экран — закрываем
TS.on('screen', function () { close(false); });

// ---- Карточки рядов крупнее ----
// Раскладку считает главная: высоту баннера и размер плиток под экран. Её числа мост
// не отдаёт, поэтому один раз меряем, как она разложила, и ставим поверх: плитки в
// CARD_SCALE раз крупнее, баннер ниже ровно на столько, на сколько выросли картинки.
// Меряем один раз: после нашего стиля замер показал бы уже наши размеры, а свой
// размер экран телевизора не меняет.
var CARD_SCALE = 1.2;
var HERO_MIN = 150;
var scaled = false;

function scaleCards() {
  if (scaled) return;
  // Мерить — только когда главная на экране: под настройками или карточкой фильма
  // её раскладка другая, и замер оттуда навсегда дал бы неверные размеры
  TS.app.screen().then(function (s) { if (s === 'home') measureAndScale(); }).catch(function () { });
}

function measureAndScale() {
  if (scaled) return;
  Promise.all([
    TS.dom.query('#home-hero', { limit: 1, rect: true, text: false }),
    TS.dom.query('#home-rows .catalog-row-card.home-card', { limit: 60, rect: true, text: false })
  ]).then(function (r) {
    var hero = r[0][0], card = null;
    // Карточку под фокусом не берём: её подрастание при фокусе (transform) попало бы в замер
    r[1].forEach(function (c) {
      if (!card && !c.focused && c.visible && c.rect && c.rect.w > 0 && c.rect.h > 0) card = c;
    });
    if (scaled || !hero || !hero.visible || !hero.rect || !card) return;
    return TS.dom.query('.torrent-poster', { root: card.h, limit: 1, rect: true, text: false }).then(function (p) {
      var poster = p[0];
      if (scaled || !poster || !poster.rect || !(poster.rect.h > 0)) return;
      var w = poster.rect.w, ih = poster.rect.h, ch = card.rect.h, hh = hero.rect.h;
      var delta = Math.round(ih * CARD_SCALE) - ih;
      if (hh - delta < HERO_MIN) delta = Math.max(0, hh - HERO_MIN);
      if (delta <= 0) return;
      scaled = true;
      var nih = ih + delta, nw = Math.round(w * nih / ih);
      TS.ui.addStyle(
        'body .catalog-row-card.home-card,body .catalog-row-viewport .catalog-row-card.home-card{' +
        'flex:0 0 ' + nw + 'px!important;width:' + nw + 'px!important;height:' + (ch + delta) + 'px!important}' +
        'body .catalog-row-card.home-card .torrent-poster,' +
        'body .catalog-row-viewport .catalog-row-card.home-card .torrent-poster,' +
        'body .catalog-row-card.home-card .row-poster-img{width:' + nw + 'px!important;height:' + nih + 'px!important}' +
        'body #home-hero{height:' + (hh - delta) + 'px!important}');
    });
  }).catch(function () { });
}

// Раскладка готова чуть позже рядов: даём ей время. Расширение может запуститься и
// на уже построенной главной (установили только что) — тогда пробуем сразу, а не
// вышло (главная не на экране) — при первом нажатии на ней
TS.on('home', function () { setTimeout(scaleCards, 600); });
TS.on('screen', function (s) { if (s === 'home') setTimeout(scaleCards, 600); });
TS.on('nav', function (e) { if (!scaled && e.screen === 'home') scaleCards(); });
setTimeout(scaleCards, 600);

// ---- Шапка: после ОК фокус остаётся на разделе ----
// ОК на пункте шапки открывает раздел и уводит фокус в его список — шапку приходится
// искать заново. Возвращаем фокус на пункт: в список — «вниз», к соседнему разделу —
// «вправо». Поиск (там сразу поле), «Донат» (окно поверх шапки) и настройки не трогаем.
// Список раздела грузится не сразу и сам ставит фокус в первую карточку — поэтому
// вторая попытка; её не делаем, если человек уже нажал что-то сам
var KEEP_TOPBAR = /^(home-nav-home|tab-torrents|tab-favorites)$/;
var KEEP_DELAYS = [450, 1100];
var prevNavFocus = null;

TS.on('nav', function (e) {
  var was = prevNavFocus;
  prevNavFocus = e.focused;
  if (e.key !== 'enter' || !was || !KEEP_TOPBAR.test(was.id)) return;
  // Событие приходит через 60 мс — раздел ещё не открылся и фокус на месте; список
  // заберёт его позже, поэтому решаем по таймерам, глядя на текущий фокус
  var mark = prevNavFocus;
  KEEP_DELAYS.forEach(function (ms) {
    setTimeout(function () {
      if (prevNavFocus !== mark) return;   // уже ходят сами
      TS.dom.focused().then(function (f) {
        if (f && f.id === was.id) return;
        return TS.dom.focus(was.h);
      }).catch(function () { });
    }, ms);
  });
});

// =================== Горизонтальный каталог ===================
// Горизонтальный каталог — карточки сетки каталога (Фильмы, Сериалы, Аниме…) в 16:9
// вместо вертикальных постеров, название — целиком, до двух строк, вместо бегущей
// строки.
//
// Кадров у элементов каталога нет, поэтому картинка — тот же постер, обрезанный по
// ширине (верхняя треть, где обычно лица). Колонок столько же, сколько задано во
// «Внешнем виде»: по этому числу пульт считает «вверх/вниз», и менять его стилем
// нельзя — навигация разошлась бы с раскладкой.
(function () {
TS.ui.addStyle([
  '#catalog-grid .catalog-card{height:auto!important}',
  // 16:9 через padding-top: aspect-ratio на части телевизоров (Chrome < 88) нет
  '#catalog-grid .catalog-card .torrent-poster{position:relative!important;height:0!important;',
  ' padding-top:56.25%!important;overflow:hidden}',
  '#catalog-grid .catalog-card .torrent-poster img{position:absolute!important;left:0;top:0;',
  ' width:100%!important;height:100%!important;object-fit:cover;object-position:50% 22%}',
  // Название: без бегущей строки, до двух строк
  '#catalog-grid .catalog-card .torrent-title,#catalog-grid .catalog-card .torrent-title span{',
  ' white-space:normal!important;overflow:hidden;text-overflow:clip!important;',
  ' animation:none!important;transform:none!important}',
  '#catalog-grid .catalog-card .torrent-title{display:-webkit-box!important;-webkit-box-orient:vertical;',
  ' -webkit-line-clamp:2;line-height:1.25;font-size:2.6vh!important}',
  // Карточка широкая — подписи крупнее, чем у вертикального постера
  '#catalog-grid .catalog-card .catalog-card-sub{font-size:2.1vh!important}',
  // «★ 7.2» в левом верхнем углу постера — как на плитках главной. Оценка уже лежит в
  // data-rating карточки; ::before — подложка со звездой и числом, ::after — та же
  // звезда оранжевым поверх белой (один псевдоэлемент двумя цветами не покрасить)
  '#catalog-grid .catalog-card{position:relative}',
  '#catalog-grid .catalog-card[data-rating]:not([data-rating=""]):before,',
  '#catalog-grid .catalog-card[data-rating]:not([data-rating=""]):after{position:absolute;left:.45em;top:.45em;',
  // z-index выше постера: у карточки под фокусом он поднят (z-index:5) и закрывал число
  ' z-index:8;padding:.2em .5em;border-radius:.45em;font-size:2.7vh;font-weight:700;line-height:1.3;',
  ' pointer-events:none}',
  '#catalog-grid .catalog-card[data-rating]:not([data-rating=""]):before{content:"★ " attr(data-rating);',
  ' background:rgba(0,0,0,.72);color:#fff}',
  '#catalog-grid .catalog-card[data-rating]:not([data-rating=""]):after{content:"★";color:#ff8c00;background:none}',
  // «▶» по центру постера карточки под фокусом — как на главной. Псевдоэлементы постера
  // заняты (::after — рамка фокуса), берём блок подписи: он не позиционирован, значит
  // его ::before/::after встают от карточки. Середина постера по вертикали — 28.125%
  // ширины карточки (постер 16:9), а margin-top в процентах считается как раз от ширины
  '#catalog-grid .catalog-card.focused .torrent-info:before,',
  '#catalog-grid .catalog-card.focused .torrent-info:after{content:"";position:absolute;left:50%;top:0;',
  ' z-index:8;pointer-events:none}',
  '#catalog-grid .catalog-card.focused .torrent-info:before{width:9vh;height:9vh;',
  ' margin:calc(28.125% - 4.5vh) 0 0 -4.5vh;box-sizing:border-box;border-radius:50%;',
  ' border:.35vh solid rgba(255,140,0,.9);background:rgba(0,0,0,.42)}',
  '#catalog-grid .catalog-card.focused .torrent-info:after{margin:calc(28.125% - 1.6vh) 0 0 -.9vh;',
  ' border-style:solid;border-width:1.6vh 0 1.6vh 2.6vh;',
  ' border-color:transparent transparent transparent rgba(255,140,0,.95)}',
  // Оценка уже в углу постера — из строки «год · ★ · тип» её убираем вместе с точкой
  '#catalog-grid .catalog-card-sub .rating-badge,',
  '#catalog-grid .catalog-card-sub .catalog-sub-dot-r:not(.catalog-sub-dot-y){display:none!important}'
].join('\n'));
})();

// =================== Сезоны в раздаче ===================
// Сезоны в раздаче — в раздаче из нескольких сезонов список серий не одной лентой на
// сотни плиток, а сеткой: перед каждым сезоном заголовок «Сезон N», подпись серии —
// номер внутри сезона и название из имени файла («Серия 3 · The Floating Anniversary»).
//
// Сезон и серия — из имени файла (data-file-name): s01e03, S1E3, 1x03. Раздача из одного
// сезона или без таких имён остаётся как была. Подписи, которые приложение уже взяло из
// TMDB («Сезон 2, Серия 5 - Название»), не трогаем — только снимаем «Сезон N, »:
// сезон теперь в заголовке.
//
// Пока фокус на сериях, пульт держим сами (TS.keys.capture): стрелки приложения ведут
// по ленте. Вверх/вниз — к ближайшей плитке строкой выше/ниже (через сезоны тоже),
// влево/вправо — внутри строки, ОК — смотреть. Вверх с первой строки и «Назад» — на
// «Играть», пульт отдаём приложению; «вниз» с «Играть» вернёт его нам.
(function () {
var ITEMS = '#files-list .file-item:not(.hidden)';
var POLL_MS = 700;
var POLL_MAX = 30;            // ~20 с: файлы раздачи приходят от TorrServer не сразу
var SAME_ROW_PX = 10;

TS.ui.addStyle([
  // Сетку сдвигаем сами (transform) — прокрутку карточки приложение держит под одну ленту.
  // Фон — чтобы поднятая сетка не просвечивала поверх названия раздачи
  '#files-list.ext-seasons{flex-wrap:wrap!important;overflow:visible!important;position:relative;z-index:3;',
  ' background:#0b0b0e;box-shadow:0 0 0 2vh #0b0b0e;transition:transform .15s ease-out}',
  '#files-list.ext-seasons .ext-season-head{flex:0 0 100%;box-sizing:border-box;padding:2.2vh 0 .4vh;',
  ' font-size:2.8vh;font-weight:700;color:#fff;letter-spacing:.02em}',
  '#files-list.ext-seasons .ext-season-head:first-child{padding-top:0}',
  '#files-list.ext-seasons .file-name{white-space:normal!important}',
  '#files-list.ext-seasons .file-name span{animation:none!important;transform:none!important}'
].join('\n'));

var st = { list: null, heads: [], applied: '', active: false, busy: false, poll: 0, gen: 0, shift: 0 };
var VIEW_TOP = 90;          // выше — шапка
var VIEW_BOTTOM_PAD = 30;
var FOLLOW_MS = 260;        // приложение докручивает карточку — меряем после

/** s01e03, S1E3, s09e23-24, 1x03 → { season, episode, title } */
function parseName(name) {
  var m = /(?:^|[^a-z0-9])s(\d{1,2})[ ._-]?e(\d{1,3})(?:-e?\d{1,3})?(.*)$/i.exec(name) ||
    /(?:^|[^0-9])(\d{1,2})x(\d{2,3})(.*)$/i.exec(name);
  if (!m) return null;
  var rest = m[3].replace(/\.[a-z0-9]{2,4}$/i, '')           // расширение
    .replace(/[._]+/g, ' ')
    .replace(/\b(?:\d{3,4}p|web[ -]?dl\w*|web[ -]?rip|hdtv\w*|bdrip|x26[45]|h ?26[45]|hevc|aac\w*|rus|eng)\b.*$/i, '')
    .replace(/^[\s\-–—:]+|[\s\-–—:]+$/g, '');
  return { season: parseInt(m[1], 10), episode: parseInt(m[2], 10), title: rest };
}

function clearSeasons() {
  st.active && TS.keys.capture(false);
  st.active = false;
  st.heads.forEach(function (h) { TS.dom.remove(h).catch(function () { }); });
  st.heads = [];
  if (st.list) TS.dom.update(st.list, { removeClass: 'ext-seasons', style: { transform: '' } }).catch(function () { });
  st.shift = 0;
  st.list = null;
  st.applied = '';
}

/** Раскладка по сезонам, когда серии на экране */
function apply(gen) {
  if (gen !== st.gen) return;
  Promise.all([
    TS.dom.query('#files-list', { limit: 1, text: false }),
    TS.dom.query(ITEMS, { limit: 500, text: false })
  ]).then(function (r) {
    var list = r[0][0], items = r[1];
    if (!list || items.length < 2) {
      if (st.poll++ < POLL_MAX) setTimeout(function () { apply(gen); }, POLL_MS);
      return;
    }
    var parsed = items.map(function (it) { return parseName(it.attrs['data-file-name'] || ''); });
    var seasons = {};
    parsed.forEach(function (p) { if (p) seasons[p.season] = 1; });
    // Ключ раскладки: раздача, число серий, сезоны. Та же — ничего не делаем; другая —
    // снимаем прежние заголовки (плитки серий приложение переиспользует между раздачами)
    var key = (items[0].attrs['data-hash'] || '') + ':' + items.length + ':' + Object.keys(seasons).join(',');
    if (key === st.applied) return;
    if (st.applied) clearSeasons();
    if (Object.keys(seasons).length < 2) return;
    st.applied = key;
    st.list = list.h;
    var jobs = [TS.dom.update(list.h, { addClass: 'ext-seasons' })];
    var last = null;
    items.forEach(function (it, i) {
      var p = parsed[i];
      if (p && p.season !== last) {
        last = p.season;
        jobs.push(TS.dom.create('<div class="ext-season-head">Сезон ' + p.season + '</div>',
          { parent: it.h, where: 'before' }).then(function (h) { st.heads.push(h); }));
      }
      if (p) jobs.push(relabel(it, p));
    });
    return Promise.all(jobs);
  }).catch(function () { });
}

/** «Серия 37» → «Серия 3 · Название»; «Сезон 2, Серия 5 - Название» → «Серия 5 - Название» */
function relabel(item, p) {
  return TS.dom.query('.file-name span', { root: item.h, limit: 1 }).then(function (s) {
    var span = s[0];
    if (!span) return;
    var text = span.text || '';
    var label;
    if (/^Серия \d+$/.test(text)) label = 'Серия ' + p.episode + (p.title ? ' · ' + p.title : '');
    else if (/^Сезон \d+, /.test(text)) label = text.replace(/^Сезон \d+, /, '');
    if (label && label !== text) return TS.dom.update(span.h, { text: label });
  }).catch(function () { });
}

function start() {
  st.gen++;
  st.poll = 0;
  var gen = st.gen;
  setTimeout(function () { apply(gen); }, POLL_MS);
}

// Открытая из «Моих торрентов» раздача после detail снова сообщает экран torrents —
// карточка при этом на месте. Поэтому список серий проверяем на обоих экранах
var SEASON_SCREENS = { detail: 1, torrents: 1 };
TS.on('detail', function () { start(); });
TS.on('screen', function (s) {
  if (SEASON_SCREENS[s]) start();
  else { st.gen++; clearSeasons(); }
});

// ---- Пульт по сетке серий ----

function arm() {
  if (st.active || !st.applied) return;
  st.active = true;
  TS.keys.capture(true);
}

function release() {
  if (!st.active) return;
  st.active = false;
  TS.keys.capture(false);
}

/** Сдвинуть сетку так, чтобы плитка под фокусом была на экране */
function follow() {
  if (!st.list) return;
  Promise.all([
    TS.dom.focused(),
    TS.dom.query('#detail-view', { limit: 1, rect: true, text: false })
  ]).then(function (r) {
    var f = r[0], dv = r[1][0];
    if (!f || !f.rect || !/\bfile-item\b/.test(f.cls) || !dv) return;
    var bottom = dv.rect.y + dv.rect.h - VIEW_BOTTOM_PAD;
    var shift = st.shift;
    if (f.rect.y + f.rect.h > bottom) shift += f.rect.y + f.rect.h - bottom;
    else if (f.rect.y < VIEW_TOP) shift -= VIEW_TOP - f.rect.y;
    shift = Math.round(shift);
    if (shift === st.shift) return;
    st.shift = shift;
    return TS.dom.update(st.list, { style: { transform: shift ? 'translateY(' + (-shift) + 'px)' : '' } });
  }).catch(function () { });
}

function resetShift() {
  if (!st.list || !st.shift) return;
  st.shift = 0;
  TS.dom.update(st.list, { style: { transform: '' } }).catch(function () { });
}

function toPlayButton() {
  resetShift();
  release();
  TS.dom.query('#detail-progress-btn', { limit: 1, text: false }).then(function (b) {
    if (b[0] && b[0].visible) TS.dom.focus(b[0].h);
  }).catch(function () { });
}

TS.on('nav', function (e) {
  if (e.focused && /\bfile-item\b/.test(e.focused.cls)) arm();
});

TS.on('key', function (dir) {
  if (!st.active) return false;
  if (dir === 'back') {
    // Пульт приложение уже забрало; оно же шлёт back при смене экрана
    st.active = false;
    toPlayButton();
    return true;
  }
  if (st.busy) return true;
  st.busy = true;
  TS.dom.query(ITEMS, { limit: 500, rect: true, text: false }).then(function (items) {
    var cur = null;
    for (var i = 0; i < items.length; i++) if (items[i].focused) { cur = items[i]; break; }
    if (!cur) { release(); return; }
    if (dir === 'enter') return TS.dom.click(cur.h);
    var t = pick(items, cur, dir);
    if (t === 'top') { toPlayButton(); return; }
    if (t) return TS.dom.focus(t.h).then(function () { setTimeout(follow, FOLLOW_MS); });
  }).then(function () { st.busy = false; }, function () { st.busy = false; });
  return true;
});

/** Соседняя плитка по направлению — по геометрии: строки сезонов разной длины */
function pick(items, cur, dir) {
  var cy = cur.rect.y, cx = cur.rect.x, best = null, bestD = 1e9, i, it, dy;
  if (dir === 'left' || dir === 'right') {
    for (i = 0; i < items.length; i++) {
      it = items[i];
      if (Math.abs(it.rect.y - cy) > SAME_ROW_PX) continue;
      var dx = it.rect.x - cx;
      if ((dir === 'right' && dx > 5 && dx < bestD) || (dir === 'left' && dx < -5 && -dx < bestD)) { best = it; bestD = Math.abs(dx); }
    }
    return best;
  }
  // Ближайшая строка в нужную сторону, в ней — ближайшая по горизонтали плитка
  var rowY = null;
  for (i = 0; i < items.length; i++) {
    dy = items[i].rect.y - cy;
    if (dir === 'down' && dy > SAME_ROW_PX && (rowY === null || items[i].rect.y < rowY)) rowY = items[i].rect.y;
    if (dir === 'up' && dy < -SAME_ROW_PX && (rowY === null || items[i].rect.y > rowY)) rowY = items[i].rect.y;
  }
  if (rowY === null) return dir === 'up' ? 'top' : null;
  for (i = 0; i < items.length; i++) {
    it = items[i];
    if (Math.abs(it.rect.y - rowY) > SAME_ROW_PX) continue;
    var d = Math.abs(it.rect.x - cx);
    if (d < bestD) { best = it; bestD = d; }
  }
  return best;
}
})();
