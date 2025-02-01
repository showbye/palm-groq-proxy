import { Context } from "@netlify/edge-functions";

const pickHeaders = (headers: Headers, keys: (string | RegExp)[]): Headers => {
  const picked = new Headers();
  for (const key of headers.keys()) {
    if (keys.some((k) => (typeof k === "string" ? k === key : k.test(key)))) {
      const value = headers.get(key);
      if (typeof value === "string") {
        picked.set(key, value);
      }
    }
  }
  return picked;
};

const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "*",
  "access-control-allow-headers": "*",
};

// Groq API Base URL
const GROQ_API_BASE_URL = "https://api.groq.com/openai";


export default async (request: Request, context: Context) => {

  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: CORS_HEADERS,
    });
  }

  const { pathname, searchParams } = new URL(request.url);
  if(pathname === "/") {
    let blank_html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Groq API proxy on Netlify Edge</title>
</head>
<body>
  <h1 id="groq-api-proxy-on-netlify-edge">Groq API proxy on Netlify Edge</h1>
  <p>Tips: This project uses a reverse proxy to solve problems such as location restrictions or enhance access to Groq APIs. </p>
  <p>If you have any of the following requirements, you may need the support of this project.</p>
  <ol>
  <li>When you want to customize access to Groq API</li>
  <li>You need a simple way to proxy your requests to Groq API</li>
  </ol>
  <p>For technical discussions, please visit [Your Blog Link if you have one]</p>
</body>
</html>
    `
    return new Response(blank_html, {
      headers: {
        ...CORS_HEADERS,
        "content-type": "text/html"
      },
    });
  }

  const url = new URL(pathname, GROQ_API_BASE_URL);
  searchParams.delete("_path"); // 移除可能存在的 _path 参数

  searchParams.forEach((value, key) => {
      url.searchParams.append(key, value);
  });

    // 调整头部过滤，根据 Groq API 文档设置
    const headers = pickHeaders(request.headers, [
    "content-type",
    "authorization", // 通常 Groq API 需要 Authorization 头部
    // 添加其他可能需要的头部，如 "X-Custom-Header"
  ]);


  const response = await fetch(url, {
    body: request.body,
    method: request.method,
    duplex: 'half', //groq api 需要 duplex: 'half'
    headers,
  });

  const responseHeaders = {
    ...CORS_HEADERS,
    ...Object.fromEntries(response.headers),
    "content-encoding": null
  };


  return new Response(response.body, {
    headers: responseHeaders,
    status: response.status
  });
};
