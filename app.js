const express = require('express');
const https = require('https');
const zlib = require('zlib');
const iconv = require('iconv-lite');
const cors = require('cors');
const fetch2 = require('isomorphic-fetch');
const { parse } = require('node-html-parser');

const app = express();

const request_http = url => {
  return new Promise((resolve, reject) => {
    const agent = new https.Agent({
      minVersion: 'TLSv1.3',
      maxVersion: 'TLSv1.3',
    });

    const options = {
      method: 'GET',
      headers: {
        'user-agent': 'vscode-restclient',
        'accept-encoding': 'gzip, deflate',
        connection: 'close',
      },
      agent,
    };

    https.get(url, options, res => {
      // const content_type = res.headers['content-type'];
      const code = res.headers['content-type'];
      let stream = res;

      if (res.headers['content-encoding'] === 'gzip') {
        res = stream.pipe(zlib.createGunzip());
      } else if (res.headers['content-encoding'] === 'deflate') {
        res = stream.pipe(zlib.createInflate());
      }

      const chunks = [];
      res.on('data', chunk => {
        chunks.push(chunk);
      });

      res.on('end', () => {
        const buffer = Buffer.concat(chunks);

        try {
          if (code === 'text/html; charset=Shift_JIS') {
            resolve(iconv.decode(buffer, 'Shift_JIS'));
          } else {
            resolve(JSON.parse(buffer.toString('utf8')));
          }
        } catch (error) {
          reject('fddf');
        }
      });
    });
  });
};

// 全てのオリジンを許可（開発用）
app.use(cors());

app.use((req, res, next) => {
  if (req.headers.authorization !== 'Bearer abc') {
    throw new Error();
  }
  next();
});

// エラーハンドラ（必ず最後に書く）
app.use((err, req, res, next) => {
  console.error(err.stack); // ログ出力
  res.status(500).json({ message: err.message });
});

app.get('/api/html', async function (req, res) {
  // console.log(req.query.q);
  // res.send();
  try {
    res.send(await request_http(req.query.q));
  } catch (error) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/json', async function (req, res) {
  try {
    res.json(await request_http(req.query.q));
  } catch (error) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/te', async function (req, res) {
  res.send('ok');
});

app.get('/api/win', async function (req, res) {
  try {
    const _re = await fetch(process.env.WIN, {
      method: 'get',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36',
      },
    });

    const doc = parse(await _re.text());
    const ret = doc
      .querySelector('#historyTable_0')
      .querySelectorAll('tr')[1]
      .querySelectorAll('td')[2].textContent;

    await fetch2(process.env.PUSH + `?title=win&body=${ret}`, {
      headers: {
        Authorization: 'Bearer abcxyz',
      },
    });

    res.send('win');
  } catch (error) {
    res.status(500).json({ message: err.message });
  }
});

const server = app.listen(process.env.PORT || 3000, function () {
  console.log('Node.js is listening to PORT:' + server.address().port);
});
