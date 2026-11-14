import { Router } from "express";
import { asyncHandler } from "../../shared/async-handler.js";
import { validateBody } from "../../middleware/validate.js";
import { requireAuthentication } from "./auth.middleware.js";
import { getCurrentUser, loginAccount, logoutAccount, registerAccount } from "./auth.controller.js";
import { loginSchema, registerSchema } from "./auth.schemas.js";

export const authRouter = Router();

authRouter.post("/register", validateBody(registerSchema), asyncHandler(registerAccount));
authRouter.post("/login", validateBody(loginSchema), asyncHandler(loginAccount));
authRouter.post("/logout", logoutAccount);
authRouter.get("/me", requireAuthentication, asyncHandler(getCurrentUser));
