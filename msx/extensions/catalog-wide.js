/*
 * Горизонтальный каталог — карточки сетки каталога (Фильмы, Сериалы, Аниме…) в 16:9
 * вместо вертикальных постеров, название — целиком, до двух строк, вместо бегущей
 * строки.
 *
 * Кадров у элементов каталога нет, поэтому картинка — тот же постер, обрезанный по
 * ширине (верхняя треть, где обычно лица). Колонок столько же, сколько задано во
 * «Внешнем виде»: по этому числу пульт считает «вверх/вниз», и менять его стилем
 * нельзя — навигация разошлась бы с раскладкой.
 */
TS.register({
  name: 'Горизонтальный каталог',
  version: '1.0',
  description: 'Карточки каталога горизонтальные (16:9), название целиком в две строки.'
});

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
  ' z-index:5;padding:.2em .45em;border-radius:.4em;font-size:1.9vh;font-weight:700;line-height:1.3;',
  ' pointer-events:none}',
  '#catalog-grid .catalog-card[data-rating]:not([data-rating=""]):before{content:"★ " attr(data-rating);',
  ' background:rgba(0,0,0,.72);color:#fff}',
  '#catalog-grid .catalog-card[data-rating]:not([data-rating=""]):after{content:"★";color:#ff8c00;background:none}'
].join('\n'));
