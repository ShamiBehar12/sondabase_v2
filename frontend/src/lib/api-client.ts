type AuthChangeEvent = "SIGNED_IN" | "SIGNED_OUT" | "TOKEN_REFRESHED";

export type AppUser = {
  id: string;
  email: string;
  role: string;
  full_name?: string;
  avatar_url?: string;
};

export type AppSession = {
  accessToken: string;
  refreshToken: string;
  user: AppUser;
};

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
};

type Filter = {
  field: string;
  op: "eq" | "gte" | "lte" | "in";
  value: unknown;
};

type FileUrlOptions = {
  fileName?: string;
  download?: boolean;
};

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const SESSION_KEY = "sondabase.session";
const listeners = new Set<(event: AuthChangeEvent, session: AppSession | null) => void>();

function getStoredSession(): AppSession | null {
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AppSession;
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function setStoredSession(session: AppSession | null) {
  if (session) {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(SESSION_KEY);
  }

  listeners.forEach((callback) =>
    callback(session ? "SIGNED_IN" : "SIGNED_OUT", session),
  );
}

function buildStorageFileUrl(bucket: string, filePath: string, options: FileUrlOptions = {}) {
  const session = getStoredSession();
  const params = new URLSearchParams({
    path: filePath,
  });

  if (session?.accessToken) {
    params.set("token", session.accessToken);
  }

  if (options.fileName) {
    params.set("filename", options.fileName);
  }

  if (options.download) {
    params.set("download", "1");
  }

  return `${API_URL}/api/storage/${bucket}/file?${params.toString()}`;
}

async function apiRequest<T>(path: string, options: RequestOptions = {}) {
  const session = getStoredSession();
  const headers = new Headers(options.headers);

  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (options.auth !== false && session?.accessToken) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method || "GET",
    headers,
    body:
      options.body instanceof FormData
        ? options.body
        : options.body !== undefined
          ? JSON.stringify(options.body)
          : undefined,
  });

  const payload = await response.json().catch(() => ({
    data: null,
    error: { message: "Invalid server response" },
  }));

  if (!response.ok) {
    return {
      data: null as T | null,
      error: payload.error || { message: response.statusText },
    };
  }

  return payload as { data: T; error: null };
}

async function rawRequest<T>(path: string, options: RequestOptions = {}) {
  const session = getStoredSession();
  const headers = new Headers(options.headers);

  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (options.auth !== false && session?.accessToken) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method || "GET",
    headers,
    body:
      options.body instanceof FormData
        ? options.body
        : options.body !== undefined
          ? JSON.stringify(options.body)
          : undefined,
  });

  const payload = await response.json().catch(() => ({
    message: "Invalid server response",
  }));

  if (!response.ok) {
    return {
      data: null as T | null,
      error: payload?.error || payload || { message: response.statusText },
    };
  }

  return {
    data: payload as T,
    error: null,
  };
}

class QueryBuilder<T = any> implements PromiseLike<{ data: T; error: any }> {
  private filters: Filter[] = [];
  private orFilters: Filter[] = [];
  private orders: { field: string; ascending: boolean }[] = [];
  private selectClause = "*";
  private mode: "select" | "insert" | "update" | "delete" = "select";
  private payload: unknown = undefined;
  private expectSingle = false;
  private expectMaybeSingle = false;

  constructor(private readonly table: string) {}

  select(select = "*") {
    this.selectClause = select;
    return this;
  }

  insert(data: unknown) {
    this.mode = "insert";
    this.payload = data;
    return this;
  }

  update(data: unknown) {
    this.mode = "update";
    this.payload = data;
    return this;
  }

  delete() {
    this.mode = "delete";
    return this;
  }

  eq(field: string, value: unknown) {
    this.filters.push({ field, op: "eq", value });
    return this;
  }

  gte(field: string, value: unknown) {
    this.filters.push({ field, op: "gte", value });
    return this;
  }

  lte(field: string, value: unknown) {
    this.filters.push({ field, op: "lte", value });
    return this;
  }

  in(field: string, values: unknown[]) {
    this.filters.push({ field, op: "in", value: values });
    return this;
  }

  or(expression: string) {
    this.orFilters = expression
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [field, op, ...rest] = part.split(".");
        return {
          field,
          op: op === "eq" ? "eq" : "eq",
          value: rest.join("."),
        } as Filter;
      });
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.orders.push({ field, ascending: options?.ascending ?? true });
    return this;
  }

  limit(count: number) {
    this.payload = {
      ...(typeof this.payload === "object" && this.payload !== null ? this.payload as Record<string, unknown> : {}),
      limit: count,
    };
    return this;
  }

  single() {
    this.expectSingle = true;
    return this;
  }

  maybeSingle() {
    this.expectMaybeSingle = true;
    return this;
  }

  get() {
    return this.execute();
  }

  async execute() {
    const limit =
      typeof this.payload === "object" && this.payload !== null && "limit" in (this.payload as Record<string, unknown>)
        ? Number((this.payload as Record<string, unknown>).limit)
        : undefined;

    if (this.mode === "select") {
      return apiRequest<any>(`/api/query/${this.table}`, {
        method: "POST",
        body: {
          filters: this.filters,
          or: this.orFilters,
          order: this.orders,
          limit,
          select: this.selectClause,
          single: this.expectSingle,
          maybeSingle: this.expectMaybeSingle,
        },
      });
    }

    if (this.mode === "insert") {
      return apiRequest<any>(`/api/db/${this.table}`, {
        method: "POST",
        body: { data: this.payload },
      });
    }

    if (this.mode === "update") {
      return apiRequest<any>(`/api/db/${this.table}`, {
        method: "PATCH",
        body: {
          filters: this.filters,
          data: this.payload,
        },
      });
    }

    return apiRequest<any>(`/api/db/${this.table}`, {
      method: "DELETE",
      body: { filters: this.filters },
    });
  }

  then<TResult1 = { data: T; error: any }, TResult2 = never>(
    onfulfilled?: ((value: { data: T; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export const apiClient = {
  from<T = any>(table: string) {
    return new QueryBuilder<T>(table);
  },
  auth: {
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      const response = await rawRequest<AppSession>("/auth/login", {
        method: "POST",
        body: { email, password },
        auth: false,
      });

      if (!response.error && response.data) {
        setStoredSession(response.data);
      }

      return {
        data: response.data
          ? {
              session: response.data,
              user: response.data.user,
            }
          : null,
        error: response.error,
      };
    },
    async signUp({
      email,
      password,
      options,
    }: {
      email: string;
      password: string;
      options?: { data?: { full_name?: string } };
    }) {
      const response = await rawRequest<AppSession>("/auth/register", {
        method: "POST",
        body: {
          email,
          password,
          fullName: options?.data?.full_name,
        },
        auth: false,
      });

      if (!response.error && response.data && !getStoredSession()) {
        setStoredSession(response.data);
      }

      return {
        data: response.data
          ? {
              session: response.data,
              user: response.data.user,
            }
          : null,
        error: response.error,
      };
    },
    async signOut() {
      await apiRequest("/auth/logout", { method: "POST" });
      setStoredSession(null);
      return { error: null };
    },
    async getSession() {
      return {
        data: {
          session: getStoredSession(),
        },
      };
    },
    async getUser() {
      const session = getStoredSession();
      if (!session) {
        return {
          data: { user: null },
          error: null,
        };
      }

      const response = await rawRequest<{ user: AppUser }>("/auth/me");
      if (response.error || !response.data?.user) {
        setStoredSession(null);
        return {
          data: { user: null },
          error: response.error,
        };
      }

      const refreshed = { ...session, user: response.data.user };
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(refreshed));

      return {
        data: { user: response.data.user },
        error: null,
      };
    },
    onAuthStateChange(callback: (event: AuthChangeEvent, session: AppSession | null) => void) {
      listeners.add(callback);
      return {
        data: {
          subscription: {
            unsubscribe() {
              listeners.delete(callback);
            },
          },
        },
      };
    },
  },
  storage: {
    from(bucket: string) {
      return {
        async upload(filePath: string, file: File) {
          const formData = new FormData();
          formData.append("file", file);
          return apiRequest(`/api/storage/${bucket}/upload?path=${encodeURIComponent(filePath)}`, {
            method: "POST",
            body: formData,
          });
        },
        async remove(paths: string[]) {
          return apiRequest(`/api/storage/${bucket}/remove`, {
            method: "POST",
            body: { paths },
          });
        },
        async createSignedUrl(filePath: string, _expiresIn: number, options?: FileUrlOptions) {
          return {
            data: {
              signedUrl: buildStorageFileUrl(bucket, filePath, options),
            },
            error: null,
          };
        },
        getPublicUrl(filePath: string, options?: FileUrlOptions) {
          return {
            data: {
              publicUrl: buildStorageFileUrl(bucket, filePath, options),
            },
          };
        },
        async download(filePath: string, options?: FileUrlOptions) {
          const response = await fetch(buildStorageFileUrl(bucket, filePath, { ...options, download: true }));

          if (!response.ok) {
            return {
              data: null,
              error: { message: response.statusText || "Download failed" },
            };
          }

          return {
            data: await response.blob(),
            error: null,
          };
        },
        async list(prefix = "") {
          return apiRequest(`/api/storage/${bucket}/list`, {
            method: "POST",
            body: { prefix },
          });
        },
      };
    },
  },
  functions: {
    async invoke<T = any>(name: string, options?: { body?: unknown }) {
      return apiRequest<T>(`/api/functions/${name}`, {
        method: "POST",
        body: options?.body ?? {},
      });
    },
  },
  async rpc<T = any>(name: string, args?: unknown) {
    return apiRequest<T>(`/api/rpc/${name}`, {
      method: "POST",
      body: args,
    });
  },
  channel(_name?: string) {
    return {
      on(_event?: unknown, _filter?: unknown, _callback?: unknown) {
        return this;
      },
      subscribe() {
        return { unsubscribe() {} };
      },
    };
  },
  removeChannel(_channel?: unknown) {},
};

export async function apiFetch<T>(path: string, options: RequestOptions = {}) {
  return apiRequest<T>(path, options);
}
