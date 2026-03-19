import { Hono } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import {
  initializeDatabase,
  findUserByEmail,
  createEmailUser,
  findUserById,
  findOrCreateLineUser,
} from "../lib/db.js";
import {
  comparePassword,
  hashPassword,
  signToken,
  verifyToken,
} from "../lib/auth.js";
import { getCookie } from "hono/cookie";

const auth = new Hono();

const isProd = process.env.NODE_ENV === "production";

/** Shared cookie options — sameSite: None in prod for cross-site (Vercel ↔ GCP), Lax in dev */
function cookieOptions() {
  if (isProd) {
    return {
      httpOnly: true,
      secure: true,
      sameSite: "None", // Required for cross-site cookie (frontend on vercel.app, API on GCP)
      domain: process.env.COOKIE_DOMAIN || undefined,
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    };
  }
  return {
    httpOnly: true,
    secure: false,
    sameSite: "Lax", // Lax works fine for localhost cross-port (same site by domain)
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  };
}

// POST /api/auth/login
auth.post("/login", async (c) => {
  try {
    await initializeDatabase();
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: "請輸入 Email 和密碼" }, 400);
    }

    const user = await findUserByEmail(email.toLowerCase());
    if (!user) return c.json({ error: "Email 或密碼不正確" }, 401);

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) return c.json({ error: "Email 或密碼不正確" }, 401);

    const token = await signToken(user.id);
    setCookie(c, "auth_token", token, cookieOptions());

    return c.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        authProvider: user.auth_provider,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return c.json({ error: "登入失敗，請稍後再試" }, 500);
  }
});

// POST /api/auth/register
auth.post("/register", async (c) => {
  try {
    await initializeDatabase();
    const { email, password, displayName } = await c.req.json();

    if (!email || !password)
      return c.json({ error: "請填入 Email 和密碼" }, 400);
    if (password.length < 6) return c.json({ error: "密碼至少 6 個字元" }, 400);

    const existing = await findUserByEmail(email.toLowerCase());
    if (existing) return c.json({ error: "此 Email 已被使用" }, 409);

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    const user = await createEmailUser(
      id,
      email.toLowerCase(),
      passwordHash,
      displayName || email.split("@")[0],
    );
    const token = await signToken(user.id);

    setCookie(c, "auth_token", token, cookieOptions());

    return c.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          authProvider: user.auth_provider,
        },
      },
      201,
    );
  } catch (error) {
    console.error("Register error:", error);
    return c.json({ error: "註冊失敗，請稍後再試" }, 500);
  }
});

// GET /api/auth/me — check session
auth.get("/me", async (c) => {
  try {
    await initializeDatabase();

    let token = null;
    const authHeader = c.req.header("Authorization");
    if (authHeader?.startsWith("Bearer ")) token = authHeader.slice(7);
    if (!token) token = getCookie(c, "auth_token") || null;
    if (!token) return c.json({ authenticated: false }, 401);

    const payload = await verifyToken(token);
    if (!payload?.userId) return c.json({ authenticated: false }, 401);

    const user = await findUserById(payload.userId);
    if (!user) return c.json({ authenticated: false }, 401);

    return c.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        pictureUrl: user.picture_url,
        authProvider: user.auth_provider,
      },
    });
  } catch (error) {
    return c.json({ authenticated: false }, 401);
  }
});

// POST /api/auth/me — LINE login
auth.post("/me", async (c) => {
  try {
    await initializeDatabase();
    const { lineUserId, displayName, pictureUrl } = await c.req.json();
    if (!lineUserId) return c.json({ error: "Missing lineUserId" }, 400);

    const user = await findOrCreateLineUser(
      lineUserId,
      displayName,
      pictureUrl,
    );
    const token = await signToken(user.id);

    setCookie(c, "auth_token", token, cookieOptions());

    return c.json({
      authenticated: true,
      user: {
        id: user.id,
        displayName: user.display_name,
        pictureUrl: user.picture_url,
        authProvider: user.auth_provider,
      },
    });
  } catch (error) {
    console.error("LINE auth error:", error);
    return c.json({ error: "LINE 登入失敗" }, 500);
  }
});

// DELETE /api/auth/me — logout
auth.delete("/me", (c) => {
  const domain = isProd ? process.env.COOKIE_DOMAIN || undefined : undefined;
  deleteCookie(c, "auth_token", { path: "/", domain });
  deleteCookie(c, "supplement_user_id", { path: "/", domain });
  deleteCookie(c, "line_user_id", { path: "/", domain });
  return c.json({ success: true });
});

export default auth;
