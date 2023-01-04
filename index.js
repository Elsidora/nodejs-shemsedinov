import * as fs from 'node:fs';
import * as http from 'node:http';
import * as path from 'node:path';

const MIME_TYPES = { // коллекция типов расширений файлов в папке со статическими файлами
  default: 'application/octet-stream',
  html: 'text/html; charset=UTF-8',
  js: 'application/javascript; charset=UTF-8',
  css: 'text/css',
  png: 'image/png',
  jpg: 'image/jpg',
  gif: 'image/gif',
  ico: 'image/x-icon',
  svg: 'image/svg+xml',
};

const PORT = 3000;

const STATIC_PATH = path.join(process.cwd(), './static'); // process.cwd() - текущая папка проекта, static - папка со статическими файлами, полный путь к папке static
console.log(STATIC_PATH);

const toBool = [() => true, () => false];

const prepareFile = async (url) => { // функция подготавливает файл для отправки, создает файловый стрим, который мы можем передавать на клиентскую часть, запайпить в сокет
  console.log(url);
  const paths = [STATIC_PATH, url];
  if (url.endsWith('/')) paths.push('index.html');
  const filePath = path.join(...paths);  // получаем полный путь к нужному файлу: распаковываем все элементы массива path через спред-оператор и объединяем их через join
  console.log(filePath);
  const pathTraversal = !filePath.startsWith(STATIC_PATH); // проверяем, если полный путь к нужному файлу не начинается со STATIC_PATH (а это полный путь к папке static), то кто-то хочет "хакнуть" проект, сделать в нем уязвимость
  console.log(pathTraversal);
  const exists = await fs.promises.access(filePath).then(...toBool);  // проверяем, существует ли файл на диске, преобразуем промис в true/false посредством распаковки массива функций toBool и передачи его в then(), т.е. первая функция из массива выполняется, когда промис успешно резолвится, а вторая, когда с ошибкой
  console.log(exists);
  const found = !pathTraversal && exists;  // проверка на то, что проект никто не хотел хакнуть, и файл на диске существует
  console.log(found);
  const streamPath = found ? filePath : STATIC_PATH + '/404.html'; // если все ok (found = true), то отдаем полный путь к файлу, если нет - отдаем страницу 404
  console.log(streamPath);
  const ext = path.extname(streamPath).substring(1).toLowerCase();  // определяем, какое нужно отдать расширение из MIME_TYPES: парсим streamPath (берем его расширение через path.extname - метод из строки вынимает расширение), отрезаем у расширения точку сабстрингом и т.д.
  const stream = fs.createReadStream(streamPath);  // создаем стрим из пути (ссылка на экземпляр файлового потока)
  return { found, ext, stream }; // возвращаем объект с тремя полями
};

http.createServer(async (req, res) => {
  const file = await prepareFile(req.url);
  console.log('founded: ' + file + ' ' + req.url);
  const statusCode = file.found ? 200 : 404;
  const mimeType = MIME_TYPES[file.ext] || MIME_TYPES.default;  // расширение для Content-Type
  res.writeHead(statusCode, { 'Content-Type': mimeType });  // пишем в сокет заголовки

  file.stream.pipe(res);  // пайпим стрим, метод pipe() позволяет собирать кусочки информации в буфер и, когда он заполнен, отправлять их сразу в поток для чтения, минуя событие получения данных.
  console.log(`${req.method} ${req.url} ${statusCode}`);


}).listen(PORT);

console.log(`Server running at http://127.0.0.1:${PORT}/`);
