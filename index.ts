// @ts-ignore
let fetch = require("node-fetch").default;

try {
  if (!window) ({ fetch } = window);
} catch (error) {
  console.log("window is not defined");
}

interface IObjectStrings {
  [key: string]: string;
}

export interface IOptions {
  body?: BodyInit;
  isBlob?: boolean;
  headers?: HeadersInit;
  query?: IObjectStrings;
  errors?: IObjectStrings;
  isAbsolutePath?: boolean;
  successStatuses?: number[];
  method?: "GET" | "POST" | "PUT" | "DELETE";
  done?: (response: any, status: number) => void;
  failed?: (response: any, status: number) => void;
  success?: (response: any, status: number) => void;
}

class SmartFetch {
  private BASE_URL: string;

  private successStatuses = [200];

  private defaultErrors: IObjectStrings = {
    500: "Ошибка сервера",
    504: "Превышено время ожидания ответа от сервера",
  };

  constructor(b: string) {
    this.BASE_URL = b;
  }

  getQueryValue(key: string, value: string): string {
    if (Array.isArray(value)) {
      return value.map((val) => this.getQueryValue(key, val)).join("&");
    }

    return `${key}=${encodeURIComponent(value)}`;
  }

  private getQuery(obj: IObjectStrings) {
    let res = "";
    const keys = Object.keys(obj);

    for (let j = 0; j < keys.length; ++j) {
      const i = keys[j];

      if (obj[i] !== undefined) {
        const pair = this.getQueryValue(i, obj[i]);
        res += `${res ? "&" : ""}${pair}`;
      }
    }

    return res;
  }

  async execute(pathname: string, options: IOptions) {
    const {
      done,
      body,
      query,
      errors,
      failed,
      isBlob,
      headers,
      success,
      isAbsolutePath,
      successStatuses,
    } = options;

    let status;
    let path = `${isAbsolutePath ? "" : this.BASE_URL}${pathname}`;

    if (query && Object.keys(query).length) {
      path += `?${this.getQuery(query)}`;
    }

    const requestOptions: IOptions = {
      body,
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(headers || {}),
      },
    };

    try {
      const request = await fetch(path, requestOptions);
      let response: Blob | object = { status: "Development request error" };

      if (isBlob) response = await request.blob();
      else response = await request.json();

      status = await request.status;
      const statuses = successStatuses || this.successStatuses;
      const errorsStatuses = { ...errors, ...this.defaultErrors };

      const isSuccessStatus = statuses.indexOf(status) !== -1;

      if (isSuccessStatus) {
        if (success) await success(response, status);
      } else {
        if (failed) return failed(response, status);

        for (const key in errorsStatuses) {
          if (errorsStatuses.hasOwnProperty(key)) {
            if (Number(status) === Number(key)) {
              console.error(path, errorsStatuses[key]);
            }
          }
        }
      }

      if (done) done(response, status);
      return response;
    } catch (error) {
      if (done) done({ message: "error fetch" }, 500);
      console.log(`ERROR API REQUEST: ${path} ${status}`);
    }
  }
}

export default SmartFetch;
