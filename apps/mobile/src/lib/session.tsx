import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { ApiError, request } from "./api";
export interface User {
  id: string;
  email: string;
  displayName: string;
  verifiedAt: string | null;
}
export interface Pair {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  user: User;
}
export interface Challenge {
  verificationRequired: true;
  challengeId: string;
  email: string;
  expiresAt: string;
  resendAt: string;
}
const KEY = "greensteps.refresh.v1";
const readStored = async () =>
  Platform.OS === "web" ? null : SecureStore.getItemAsync(KEY);
const writeStored = async (value: string | null) => {
  if (Platform.OS === "web") return;
  if (value)
    await SecureStore.setItemAsync(KEY, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  else await SecureStore.deleteItemAsync(KEY);
};
type Session = {
  pending: Challenge | null;
  beginVerification: (value: Challenge | null) => void;
  emailHint: string;
  user: User | null;
  loading: boolean;
  problem: string | null;
  restore: () => Promise<void>;
  abandon: () => Promise<void>;
  signIn: (
    email: string,
    password: string,
    remember: boolean,
  ) => Promise<Pair | Challenge>;
  reload: () => Promise<void>;
  signOut: () => Promise<void>;
};
const Context = createContext<Session | null>(null);
export function SessionProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Challenge | null>(null),
    [emailHint, setEmailHint] = useState("");
  const beginVerification = (value: Challenge | null) => {
    setPending(value);
    if (value) setEmailHint(value.email);
  };
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [problem, setProblem] = useState<string | null>(null);
  const pair = useRef<Pair | null>(null),
    persist = useRef(false),
    flight = useRef<{ version: number; promise: Promise<Pair> } | null>(null),
    generation = useRef(0);
  const storageQueue = useRef<Promise<void>>(Promise.resolve());
  const restoring = useRef<Promise<void> | null>(null);
  const store = useCallback((value: string | null, version: number) => {
    const operation = storageQueue.current
      .catch(() => {})
      .then(async () => {
        if (version === generation.current) await writeStored(value);
      });
    storageQueue.current = operation;
    return operation;
  }, []);
  const clear = useCallback(async () => {
    const version = ++generation.current;
    pair.current = null;
    persist.current = false;
    setUser(null);
    setPending(null);
    setEmailHint("");
    setProblem(null);
    await store(null, version);
  }, [store]);
  const accept = useCallback(
    async (next: Pair, keep: boolean, version: number) => {
      await store(keep ? next.refreshToken : null, version);
      if (version !== generation.current)
        throw new ApiError("Phiên đã kết thúc.", 401);
      pair.current = next;
      persist.current = keep;
      setUser(next.user);
      setProblem(null);
    },
    [store],
  );
  const renew = useCallback(async () => {
    const version = generation.current;
    if (flight.current?.version === version) return flight.current.promise;
    const current = pair.current;
    if (!current)
      throw new ApiError("Vui lòng đăng nhập lại.", 401, "SESSION_EXPIRED");
    const promise = (async () => {
      try {
        const next = await request<Pair>("/auth/refresh", "POST", {
          refreshToken: current.refreshToken,
        });
        await accept(next, persist.current, version);
        return next;
      } catch (error) {
        if (
          version === generation.current &&
          error instanceof ApiError &&
          error.status === 401
        )
          await clear();
        throw error;
      } finally {
        if (flight.current?.version === version) flight.current = null;
      }
    })();
    flight.current = { version, promise };
    return promise;
  }, [accept, clear]);
  const restore = useCallback(() => {
    if (restoring.current) return restoring.current;
    const version = generation.current;
    setLoading(true);
    setProblem(null);
    const operation = (async () => {
      try {
        const stored = await readStored();
        if (stored && version === generation.current) {
          const next = await request<Pair>("/auth/refresh", "POST", {
            refreshToken: stored,
          });
          await accept(next, true, version);
        }
      } catch (error) {
        if (version !== generation.current) return;
        if (
          error instanceof ApiError &&
          (error.status === 401 || error.status === 400)
        )
          await clear();
        else
          setProblem(
            (error as Error).message ||
              "Không đọc được phiên đã lưu. Vui lòng thử lại.",
          );
      } finally {
        setLoading(false);
        restoring.current = null;
      }
    })();
    restoring.current = operation;
    return operation;
  }, [accept, clear]);
  useEffect(() => {
    void restore();
  }, [restore]);
  const authorized = useCallback(
    async <T,>(path: string, method = "GET") => {
      let current = pair.current;
      if (!current) throw new ApiError("Vui lòng đăng nhập lại.", 401);
      if (Date.parse(current.accessExpiresAt) <= Date.now() + 10000)
        current = await renew();
      try {
        return await request<T>(path, method, undefined, current.accessToken);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) throw error;
        current = await renew();
        return request<T>(path, method, undefined, current.accessToken);
      }
    },
    [renew],
  );
  const signIn = async (email: string, password: string, remember: boolean) => {
    const next = await request<Pair | Challenge>("/auth/login", "POST", {
      email,
      password,
      remember,
      deviceName: `${Platform.OS} · GreenSteps`,
    });
    if ("accessToken" in next) {
      const version = ++generation.current;
      await accept(next, remember, version);
      setPending(null);
    } else beginVerification(next);
    return next;
  };
  const reload = useCallback(async () => {
    const version = generation.current;
    const next = await authorized<User>("/me");
    if (version === generation.current) setUser(next);
  }, [authorized]);
  const signOut = async () => {
    const version = generation.current;
    try {
      await authorized("/auth/logout", "POST");
    } finally {
      if (version === generation.current) await clear();
    }
  };
  return (
    <Context.Provider
      value={{
        pending,
        beginVerification,
        emailHint,
        user,
        loading,
        problem,
        restore,
        abandon: clear,
        signIn,
        reload,
        signOut,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useSession() {
  const value = useContext(Context);
  if (!value) throw new Error("SessionProvider is missing");
  return value;
}
